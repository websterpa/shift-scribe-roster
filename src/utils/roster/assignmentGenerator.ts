import { isPublicHoliday } from "../dateHelpers";
import { hasDailyRest, withinWeeklyHours, calculateRollingAverage, WeeklyHours } from "../wtrCompliance";
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
    shiftType: config.shift_type,
    handshakeMinutes: config.handshake_minutes
  });

  const assignments: Assignment[] = [];
  
  // Calculate shift details based on configuration
  const shiftDetails = calculateShiftDetails(config);
  logger.info('Calculated shift details:', shiftDetails);
  
  for (let w = 0; w < config.cycle_length_weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dateObj = new Date(config.start_date);
      dateObj.setDate(dateObj.getDate() + w * 7 + d);
      const dateKey = dateObj.toDateString();

      for (const staff of staffList) {
        if (!staff?.id) continue;
        
        let code = cycle[w]?.[d]?.[staff.id] || 'R';

        // Override if on leave/sick
        const leaveEntries = leaveMap[staff.id] || [];
        const leave = leaveEntries.find((e) => e.date === dateKey);
        if (leave) {
          code = leave.type; // 'S' for sick, 'R' for annual leave
        }

        // Determine hours and shift times
        const shiftInfo = calculateShiftInfo(code, config, shiftDetails, dateObj);
        
        // Check WTD compliance
        const weeklyHours = calculateWeeklyHours(assignments, staff.id, w, dateObj, shiftInfo.hours);
        const wtdCompliant = checkWTDCompliance(staff, weeklyHours, pastWeeksMap[staff.id]);
        
        if (!wtdCompliant && ['D', 'E', 'L', 'N'].includes(code)) {
          logger.debug('WTD compliance issue - changing to rest day', { 
            staffId: staff.id, 
            weeklyHours, 
            maxHours: staff.max_hours_per_week
          });
          code = 'R';
          shiftInfo.hours = 0;
          shiftInfo.shiftStart = null;
          shiftInfo.shiftEnd = null;
        }

        // Calculate cost including public holiday multiplier
        const cost = calculateCost(staff, shiftInfo.hours, dateObj, code);

        assignments.push({
          version_id: '', // Will be filled by generateAndSaveRoster
          date: dateObj.toISOString().split("T")[0],
          staff_id: staff.id,
          shift_code: code,
          shift_start: shiftInfo.shiftStart,
          shift_end: shiftInfo.shiftEnd,
          hours: shiftInfo.hours,
          cost
        });
      }
    }
  }

  logger.info('Assignment generation completed', { totalAssignments: assignments.length });
  return assignments;
}

/**
 * Calculate shift details based on configuration
 */
function calculateShiftDetails(config: {
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  handshake_minutes: number;
}) {
  const baseShiftHours = config.shift_type === "12h" ? 12 : 8;
  const handshakeHours = config.handshake_minutes / 60;
  const actualShiftHours = baseShiftHours + handshakeHours;
  
  if (config.shift_type === "12h") {
    return {
      D: { start: "06:00", duration: actualShiftHours, label: "Day" },
      N: { start: "18:00", duration: actualShiftHours, label: "Night" }
    };
  } else {
    return {
      E: { start: "06:00", duration: actualShiftHours, label: "Early" },
      L: { start: "14:00", duration: actualShiftHours, label: "Late" },
      N: { start: "22:00", duration: actualShiftHours, label: "Night" },
      D: { start: "06:00", duration: actualShiftHours, label: "Day" } // For supervisors
    };
  }
}

/**
 * Calculate shift information for a given shift code
 */
function calculateShiftInfo(
  code: string, 
  config: any, 
  shiftDetails: any, 
  date: Date
): { hours: number; shiftStart: string | null; shiftEnd: string | null } {
  if (!['D', 'E', 'L', 'N'].includes(code)) {
    return { hours: 0, shiftStart: null, shiftEnd: null };
  }

  const shift = shiftDetails[code];
  if (!shift) {
    return { hours: 0, shiftStart: null, shiftEnd: null };
  }

  const [startHour, startMinute] = shift.start.split(':').map(Number);
  const shiftStart = new Date(date);
  shiftStart.setHours(startHour, startMinute, 0, 0);
  
  const shiftEnd = new Date(shiftStart);
  shiftEnd.setHours(shiftEnd.getHours() + Math.floor(shift.duration));
  shiftEnd.setMinutes(shiftEnd.getMinutes() + Math.round((shift.duration % 1) * 60));

  return {
    hours: Math.round(shift.duration),
    shiftStart: shiftStart.toISOString(),
    shiftEnd: shiftEnd.toISOString()
  };
}

/**
 * Calculate weekly hours for a staff member
 */
function calculateWeeklyHours(
  assignments: Assignment[], 
  staffId: string, 
  currentWeek: number, 
  currentDate: Date, 
  additionalHours: number
): number {
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weeklyHours = assignments
    .filter(a => 
      a.staff_id === staffId && 
      new Date(a.date) >= weekStart && 
      new Date(a.date) <= weekEnd
    )
    .reduce((total, a) => total + (a.hours || 0), 0);

  return weeklyHours + additionalHours;
}

/**
 * Check WTD compliance for a staff member
 */
function checkWTDCompliance(
  staff: StaffMember, 
  weeklyHours: number, 
  pastHours: number[] = []
): boolean {
  const maxWeeklyHours = staff.max_hours_per_week || 48;
  
  if (!withinWeeklyHours(weeklyHours, maxWeeklyHours, staff.opted_out_wtd)) {
    return false;
  }

  if (!staff.opted_out_wtd && pastHours.length > 0) {
    // Convert past hours array to WeeklyHours format and calculate rolling average
    const weeklyHoursData: WeeklyHours[] = pastHours.map((hours, index) => ({
      weekStart: new Date(Date.now() - (pastHours.length - index) * 7 * 24 * 60 * 60 * 1000),
      hours,
      overtime: Math.max(0, hours - 48)
    }));
    
    const rollingAverage = calculateRollingAverage(weeklyHoursData);
    return rollingAverage <= 48;
  }

  return true;
}

/**
 * Calculate cost for a shift including public holiday multipliers
 */
function calculateCost(
  staff: StaffMember, 
  hours: number, 
  date: Date, 
  shiftCode: string
): number {
  if (!['D', 'E', 'L', 'N'].includes(shiftCode) || hours === 0) {
    return 0;
  }

  const baseRate = staff.hourly_rate || 0;
  const holidayMultiplier = staff.holiday_multiplier || 1;
  
  if (isPublicHoliday(date)) {
    return baseRate * hours * holidayMultiplier;
  }
  
  return baseRate * hours;
}

// Export the function under both names for compatibility
export const generateRosterAssignments = generateAssignments;
