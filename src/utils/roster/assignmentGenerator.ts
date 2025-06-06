
import { isPublicHoliday } from "../dateHelpers";
import { hasDailyRest, withinWeeklyHours, withinRollingAverage } from "../wtrCompliance";
import { StaffMember, Assignment } from "@/types/roster";
import { createLogger } from "../errorLogger";

const logger = createLogger('AssignmentGenerator');

/**
 * Generates roster assignments based on cycle, staff, config, and constraints
 */
export function generateAssignments(
  staffList: StaffMember[],
  cycle: any,
  config: {
    id: string;
    cycle_length_weeks: number;
    shift_type: "8h" | "12h";
    operational_hours_per_day: number;
    handshake_minutes: number;
    start_date: string;
  },
  leaveMap: Record<string, { date: string; type: string }[]>,
  pastWeeksMap: Record<string, number[]>
): Assignment[] {
  logger.info('Generating assignments', { 
    staffCount: staffList.length,
    cycleWeeks: config.cycle_length_weeks,
    shiftType: config.shift_type
  });

  const assignments: Assignment[] = [];
  
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
          logger.debug('WTD compliance issue - changing to rest day', { 
            staffId: staff.id, 
            thisWeek, 
            maxHours: staff.max_hours_per_week
          });
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
          version_id: '', // Will be filled by generateAndSaveRoster
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

  return assignments;
}

// Export the function under both names for compatibility
export const generateRosterAssignments = generateAssignments;
