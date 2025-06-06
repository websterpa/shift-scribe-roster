import { buildRosterCycle } from "./rosterCycle";
import { hasDailyRest, hasWeeklyRest, withinWeeklyHours, withinRollingAverage } from "./wtrCompliance";
import { isPublicHoliday } from "./dateHelpers";
import { supabase } from "@/integrations/supabase/client";

interface Staff {
  id: string;
  name: string;
  role: string;
  eligible_shifts: string[];
  is_shift_worker: boolean;
  min_hours_per_week: number;
  max_hours_per_week: number;
  opted_out_wtd: boolean;
  hourly_rate: number;
  holiday_multiplier: number;
  leave_allowance_days: number;
}

export async function generateAndSaveRoster(
  staffList: Staff[],
  config: {
    id: string;
    cycle_length_weeks: number;
    shift_type: "8h" | "12h";
    operational_hours_per_day: number;
    handshake_minutes: number;
    start_date: string;
  }
) {
  console.log('Starting roster generation...', { staffCount: staffList.length, config });

  // 1. Build cycle assignments
  const cycle = buildRosterCycle(
    staffList,
    config.cycle_length_weeks,
    config.shift_type,
    config.operational_hours_per_day,
    config.handshake_minutes
  );

  console.log('Cycle assignments built');

  // 2. Fetch approved leave requests
  const { data: leaves } = await supabase
    .from("leave_requests")
    .select("staff_id, start_date, end_date, leave_type")
    .eq("status", "approved");
    
  console.log('Fetched leave requests:', leaves?.length || 0);
  
  const leaveMap: Record<string, { date: string; type: string }[]> = {};
  leaves?.forEach((lr: any) => {
    for (let d = new Date(lr.start_date); d <= new Date(lr.end_date); d.setDate(d.getDate() + 1)) {
      leaveMap[lr.staff_id] = leaveMap[lr.staff_id] || [];
      leaveMap[lr.staff_id].push({ date: new Date(d).toDateString(), type: lr.leave_type });
    }
  });

  // 3. Fetch past (cycleLength - 1) weeks for rolling average
  const pastWeeksMap: Record<string, number[]> = {};
  await Promise.all(
    staffList.map(async (s) => {
      // Note: staff_hours_history table doesn't exist yet, using placeholder logic
      // In a real implementation, this would fetch actual historical data
      pastWeeksMap[s.id] = Array(config.cycle_length_weeks - 1).fill(0);
    })
  );

  console.log('Past weeks data prepared');

  // 4. Create new roster version
  const { data: rv, error: versionError } = await supabase
    .from("roster_versions")
    .insert({ 
      config_id: config.id,
      version_number: 1 // This should be calculated based on existing versions
    })
    .select("id")
    .single();
    
  if (versionError) {
    console.error('Error creating roster version:', versionError);
    throw versionError;
  }
  
  const versionId = rv.id;
  console.log('Created roster version:', versionId);

  // 5. Iterate each week/day and insert into roster_assignments
  const assignments = [];
  
  for (let w = 0; w < config.cycle_length_weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dateObj = new Date(config.start_date);
      dateObj.setDate(dateObj.getDate() + w * 7 + d);
      const dateKey = dateObj.toDateString();

      for (const staff of staffList) {
        let code = cycle[w][d][staff.id];

        // Override if on leave/sick
        const leaveEntries = leaveMap[staff.id] || [];
        const leave = leaveEntries.find((e) => e.date === dateKey);
        if (leave) code = leave.type === "sick" ? "S" : "R";

        // Determine hours
        let hours = 0;
        if (["D", "E", "L", "N"].includes(code)) {
          hours = config.shift_type === "12h" ? 12 : 8;
        }

        // Check weekly & rolling WTD
        const weekIndex = w;
        const prevHours = pastWeeksMap[staff.id][weekIndex] || 0;
        const thisWeek = prevHours + hours;
        const wtdOK = withinWeeklyHours(thisWeek, staff.max_hours_per_week, staff.opted_out_wtd);
        const rollingOK = withinRollingAverage(pastWeeksMap[staff.id], thisWeek, 48);
        
        if (!wtdOK || !rollingOK) {
          code = "R"; 
          hours = 0;
        }

        // Compute shift_start & shift_end (simplified for now)
        const shiftStart = null;
        const shiftEnd = null;

        // Compute cost including public holiday multiplier
        const cost = isPublicHoliday(dateObj) && ["D","E","L","N"].includes(code)
          ? staff.hourly_rate * hours * staff.holiday_multiplier
          : staff.hourly_rate * hours;

        assignments.push({
          version_id: versionId,
          date: dateObj.toISOString().split("T")[0],
          staff_id: staff.id,
          shift_code: code,
          shift_start: shiftStart,
          shift_end: shiftEnd,
          hours,
          cost
        });
      }
    }
  }

  // Batch insert all assignments
  const { error: assignmentError } = await supabase
    .from("roster_assignments")
    .insert(assignments);
    
  if (assignmentError) {
    console.error('Error inserting assignments:', assignmentError);
    throw assignmentError;
  }

  console.log('Successfully saved', assignments.length, 'roster assignments');
  return versionId;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  is_shift_worker: boolean;
  eligible_shifts: string[];
  min_hours_per_week: number;
  max_hours_per_week: number;
  opted_out_wtd: boolean;
  days_off_per_week: number;
  hourly_rate: number;
  holiday_multiplier: number;
}

export interface RosterConfig {
  id: string;
  config_name: string;
  cycle_length_weeks: number;
  shift_type: string;
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
}

export interface Assignment {
  date: string;
  staff_id: string;
  shift_code: string;
  shift_start?: string;
  shift_end?: string;
  hours?: number;
  cost?: number;
}

export async function generateRosterAssignments(
  configId: string,
  staffMembers: StaffMember[],
  startDate: Date,
  endDate: Date
): Promise<Assignment[]> {
  console.log('Generating roster assignments...', { configId, startDate, endDate });
  
  const assignments: Assignment[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Simple assignment logic - assign first available staff to each shift
    const shiftCodes = ['E', 'L', 'N']; // Early, Late, Night
    
    shiftCodes.forEach((shiftCode, index) => {
      const availableStaff = staffMembers.filter(staff => 
        staff.is_shift_worker && 
        staff.eligible_shifts.includes(getShiftName(shiftCode))
      );

      if (availableStaff.length > 0) {
        const staffMember = availableStaff[index % availableStaff.length];
        
        assignments.push({
          date: currentDate.toISOString().split('T')[0],
          staff_id: staffMember.id,
          shift_code: shiftCode,
          hours: 8, // Default 8-hour shift
          cost: staffMember.hourly_rate * 8
        });
      }
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return assignments;
}

function getShiftName(shiftCode: string): string {
  switch (shiftCode) {
    case 'E': return 'Early';
    case 'L': return 'Late';
    case 'N': return 'Night';
    case 'D': return 'Day';
    default: return 'Unknown';
  }
}

export async function saveRosterVersion(
  configId: string,
  assignments: Assignment[]
): Promise<string | null> {
  try {
    console.log('Saving roster version...', { configId, assignmentCount: assignments.length });

    // Create new roster version
    const { data: versionData, error: versionError } = await supabase
      .from('roster_versions')
      .insert({
        config_id: configId,
        version_number: 1 // In a real implementation, this would increment
      })
      .select()
      .single();

    if (versionError) {
      console.error('Error creating roster version:', versionError);
      return null;
    }

    console.log('Created roster version:', versionData);

    // Save assignments
    const assignmentsWithVersion = assignments.map(assignment => ({
      ...assignment,
      version_id: versionData.id
    }));

    const { error: assignmentsError } = await supabase
      .from('roster_assignments')
      .insert(assignmentsWithVersion);

    if (assignmentsError) {
      console.error('Error saving assignments:', assignmentsError);
      return null;
    }

    console.log('Saved assignments successfully');
    return versionData.id;
  } catch (error) {
    console.error('Error in saveRosterVersion:', error);
    return null;
  }
}

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  try {
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching staff members:', error);
      return [];
    }

    return data?.map(staff => ({
      id: staff.id,
      name: staff.name || `${staff.first_name} ${staff.last_name}`,
      role: staff.role || 'CCTV Operator',
      is_shift_worker: staff.is_shift_worker ?? true,
      eligible_shifts: staff.eligible_shifts || ['Early', 'Late', 'Night'],
      min_hours_per_week: staff.min_hours_per_week || 32,
      max_hours_per_week: staff.max_hours_per_week || 48,
      opted_out_wtd: staff.opted_out_wtd || false,
      days_off_per_week: staff.days_off_per_week || 2,
      hourly_rate: staff.hourly_rate || 15.50,
      holiday_multiplier: staff.holiday_multiplier || 2
    })) || [];
  } catch (error) {
    console.error('Error in fetchStaffMembers:', error);
    return [];
  }
}
