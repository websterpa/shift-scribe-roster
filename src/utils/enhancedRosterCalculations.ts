
import { buildRosterCycle } from "./rosterCycle";
import { withinWeeklyHours, withinRollingAverage } from "./wtrCompliance";
import { supabase } from "@/integrations/supabase/client";
import { fetchLeaveRequests } from "./roster/leaveManager";
import { calculateShiftDetails, calculateShiftCost } from "./roster/shiftCalculator";
import { createRosterVersion } from "./roster/rosterVersion";

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

interface RosterConfig {
  id: string;
  cycle_length_weeks: number;
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
}

export async function generateAndSaveRoster(
  staffList: Staff[],
  config: RosterConfig
): Promise<string> {
  console.log('Starting roster generation for config:', config.id);
  
  // 1. Fetch all approved leave requests
  const leaveMap = await fetchLeaveRequests();

  // 2. Initialize empty historical hours (simplified for now)
  const pastWeeksMap: Record<string, number[]> = {};
  staffList.forEach((staff) => {
    pastWeeksMap[staff.id] = Array(config.cycle_length_weeks - 1).fill(0);
  });

  console.log('Initialized historical hours for', Object.keys(pastWeeksMap).length, 'staff members');

  // 3. Build roster cycle assignments
  const cycle = buildRosterCycle(
    staffList,
    config.cycle_length_weeks,
    config.shift_type,
    config.operational_hours_per_day,
    config.handshake_minutes
  );

  console.log('Generated cycle assignments');

  // 4. Create a new roster version
  const versionId = await createRosterVersion(
    config.id,
    config.start_date,
    config.cycle_length_weeks
  );

  // 5. Generate and save all roster assignments
  await generateRosterAssignments(
    staffList,
    config,
    cycle,
    leaveMap,
    pastWeeksMap,
    versionId
  );

  console.log('Roster generation completed for version:', versionId);
  return versionId;
}

async function generateRosterAssignments(
  staffList: Staff[],
  config: RosterConfig,
  cycle: any,
  leaveMap: Record<string, { date: string; type: string }[]>,
  pastWeeksMap: Record<string, number[]>,
  versionId: string
): Promise<void> {
  for (let w = 0; w < config.cycle_length_weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dateObj = new Date(config.start_date);
      dateObj.setDate(dateObj.getDate() + w * 7 + d);
      const dateKey = dateObj.toDateString();

      await Promise.all(
        staffList.map(async (staff) => {
          let code = cycle[w][d][staff.id];
          
          // Override if on leave/sick
          const leaveEntry = leaveMap[staff.id]?.find((e) => e.date === dateKey);
          if (leaveEntry) {
            code = leaveEntry.type === "sick" ? "S" : "R";
          }

          // Calculate shift details
          const { shiftStart, shiftEnd, hours } = calculateShiftDetails(
            code,
            dateObj,
            config.shift_type,
            config.handshake_minutes
          );

          // Check WTR compliance
          const weekIndex = w;
          const prevHours = pastWeeksMap[staff.id]?.[weekIndex] || 0;
          const thisWeekHours = prevHours + hours;
          const wtdOK = withinWeeklyHours(thisWeekHours, staff.max_hours_per_week, staff.opted_out_wtd);
          const rollingOK = withinRollingAverage(pastWeeksMap[staff.id], thisWeekHours, 48);

          if (!wtdOK || !rollingOK) {
            console.log(`WTR violation for staff ${staff.id} on ${dateKey}, forcing rest`);
            code = "R";
          }

          // Calculate final shift details after WTR check
          const finalShiftDetails = code === "R" 
            ? { shiftStart: null, shiftEnd: null, hours: 0 }
            : { shiftStart, shiftEnd, hours };

          // Calculate cost
          const cost = calculateShiftCost(
            finalShiftDetails.hours,
            staff.hourly_rate,
            dateObj,
            staff.holiday_multiplier
          );

          // Insert assignment to database
          await supabase.from("roster_assignments").insert({
            roster_version_id: versionId,
            shift_date: dateObj.toISOString().split("T")[0],
            staff_id: staff.id,
            shift_type: code,
            shift_start: finalShiftDetails.shiftStart?.toTimeString().split(' ')[0] || null,
            shift_end: finalShiftDetails.shiftEnd?.toTimeString().split(' ')[0] || null,
            notes: leaveEntry ? `On ${leaveEntry.type} leave` : null
          });
        })
      );
    }
  }
}
