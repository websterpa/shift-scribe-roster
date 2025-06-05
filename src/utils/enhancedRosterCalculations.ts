
import { buildRosterCycle } from "./rosterCycle";
import { hasDailyRest, hasWeeklyRest, withinWeeklyHours, withinRollingAverage } from "./wtrCompliance";
import { isWeekend, isPublicHoliday } from "./dateHelpers";
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
  console.log('Starting roster generation for config:', config.id);
  
  // 1. Fetch all approved leave requests, map staff_id → array of dates and types
  const { data: leaves } = await supabase
    .from("leave_requests")
    .select("staff_id, start_date, end_date, leave_type")
    .eq("status", "approved");
    
  console.log('Fetched leave requests:', leaves?.length || 0);
  
  const leaveMap: Record<string, { date: string; type: string }[]> = {};
  leaves?.forEach((lr: any) => {
    const s = lr.staff_id;
    for (let d = new Date(lr.start_date); d <= new Date(lr.end_date); d.setDate(d.getDate() + 1)) {
      leaveMap[s] = leaveMap[s] || [];
      leaveMap[s].push({ date: d.toDateString(), type: lr.leave_type });
    }
  });

  // 2. For now, initialize empty historical hours since staff_hours_history table doesn't exist
  // TODO: Create staff_hours_history table or use roster_assignments to calculate historical hours
  const pastWeeksMap: Record<string, number[]> = {};
  staffList.forEach((staff) => {
    pastWeeksMap[staff.id] = Array(config.cycle_length_weeks - 1).fill(0);
  });

  console.log('Initialized historical hours for', Object.keys(pastWeeksMap).length, 'staff members');

  // 3. Build one cycle assignments
  const cycle = buildRosterCycle(
    staffList,
    config.cycle_length_weeks,
    config.shift_type,
    config.operational_hours_per_day,
    config.handshake_minutes
  );

  console.log('Generated cycle assignments');

  // 4. Create a new roster_version
  const { data: rv, error: rvError } = await supabase
    .from("roster_versions")
    .insert({ 
      config_id: config.id,
      start_date: config.start_date,
      end_date: new Date(new Date(config.start_date).getTime() + config.cycle_length_weeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_by: 'system', // You might want to pass the actual user ID
      version_number: 1 // This should be calculated based on existing versions
    })
    .select("id, version_number")
    .single();
    
  if (rvError) {
    console.error('Error creating roster version:', rvError);
    throw rvError;
  }
  
  const versionId = rv.id;
  console.log('Created roster version:', versionId);

  // 5. Iterate through cycle weeks & days, enforce WTR, calculate hours & cost, and save
  for (let w = 0; w < config.cycle_length_weeks; w++) {
    for (let d = 0; d < 7; d++) {
      // Compute the actual date
      const dateObj = new Date(config.start_date);
      dateObj.setDate(dateObj.getDate() + w * 7 + d);
      const dateKey = dateObj.toDateString();

      // For each staff
      await Promise.all(
        staffList.map(async (staff) => {
          let code = cycle[w][d][staff.id];
          
          // Override if on leave/sick
          const leaveEntry = leaveMap[staff.id]?.find((e) => e.date === dateKey);
          if (leaveEntry) {
            code = leaveEntry.type === "sick" ? "S" : "R";
          }

          // Determine shift start/end times
          let shiftStart: Date | null = null;
          let shiftEnd: Date | null = null;
          let hours = 0;
          
          if (code !== "R" && code !== "S") {
            shiftStart = new Date(dateObj);
            
            if (config.shift_type === "12h") {
              // 12h: Day = 07:00–19:00, Night = 19:00–07:00 next day
              if (code === "D") {
                shiftStart.setHours(7, 0);
                shiftEnd = new Date(shiftStart);
                shiftEnd.setHours(19, 0);
              } else {
                shiftStart.setHours(19, 0);
                shiftEnd = new Date(shiftStart);
                shiftEnd.setDate(shiftEnd.getDate() + 1);
                shiftEnd.setHours(7, 0);
              }
              hours = 12;
            } else {
              // 8h: Early = 07:45–15:45, Late = 15:45–23:45, Night = 23:45–07:45 next day
              if (code === "E") {
                shiftStart.setHours(7, 45);
                shiftEnd = new Date(shiftStart);
                shiftEnd.setHours(15, 45);
              } else if (code === "L") {
                shiftStart.setHours(15, 45);
                shiftEnd = new Date(shiftStart);
                shiftEnd.setHours(23, 45);
              } else {
                shiftStart.setHours(23, 45);
                shiftEnd = new Date(shiftStart);
                shiftEnd.setDate(shiftEnd.getDate() + 1);
                shiftEnd.setHours(7, 45);
              }
              hours = 8;
            }
            
            // Apply 15min handshake if configured
            if (config.handshake_minutes === 15 && shiftEnd) {
              shiftEnd = new Date(shiftEnd.getTime() + 15 * 60 * 1000);
            }
          }

          // Compute this week's hours and check WTR
          const weekIndex = w;
          const prevHours = pastWeeksMap[staff.id]?.[weekIndex] || 0;
          const thisWeekHours = prevHours + hours;
          const wtdOK = withinWeeklyHours(thisWeekHours, staff.max_hours_per_week, staff.opted_out_wtd);
          const rollingOK = withinRollingAverage(pastWeeksMap[staff.id], thisWeekHours, 48);

          if (!wtdOK || !rollingOK) {
            console.log(`WTR violation for staff ${staff.id} on ${dateKey}, forcing rest`);
            // Force rest if violation
            code = "R";
            shiftStart = null;
            shiftEnd = null;
            hours = 0;
          }

          // Compute cost (only double on public holiday)
          const isPH = isPublicHoliday(dateObj);
          const multiplier = isPH ? staff.holiday_multiplier : 1;
          const cost = staff.hourly_rate * hours * multiplier;

          // Insert assignment to Supabase
          await supabase.from("roster_assignments").insert({
            roster_version_id: versionId,
            shift_date: dateObj.toISOString().split("T")[0],
            staff_id: staff.id,
            shift_type: code,
            shift_start: shiftStart?.toTimeString().split(' ')[0] || null,
            shift_end: shiftEnd?.toTimeString().split(' ')[0] || null,
            notes: leaveEntry ? `On ${leaveEntry.type} leave` : null
          });
        })
      );
    }
  }

  console.log('Roster generation completed for version:', versionId);
  return versionId;
}
