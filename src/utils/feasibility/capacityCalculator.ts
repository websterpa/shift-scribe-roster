/**
 * Capacity Calculator for Roster Feasibility Analysis
 * Computes minimum staff requirements based on pattern, shift durations, and WTD constraints.
 */

export interface PatternSequence {
  sequence: string[]; // e.g., ['E', 'E', 'L', 'L', 'N', 'N', 'R', 'R']
}

export interface RequiredShifts {
  E?: number;
  L?: number;
  N?: number;
  D?: number;
}

export interface WTDRules {
  maxWeeklyHours: number; // e.g., 48
  minDailyRestHours: number; // e.g., 11
  minWeeklyRestHours: number; // e.g., 24
}

export interface FeasibilityResult {
  workRatio: number; // fraction of days worked in cycle
  hoursPerStaffPerWeek: number; // average hours per staff member per week
  weeklyHoursRequired: number; // total hours needed per week
  requiredStaff: number; // minimum staff needed (rounded up)
  utilizationPct: number; // staff utilization percentage
  isWTDCompliant: boolean; // whether the pattern respects WTD limits
  warnings: string[]; // any feasibility warnings
  surplus: number | null; // surplus/deficit if staff_count provided
  bufferPct: number; // buffer percentage applied
}

/**
 * Calculate roster feasibility metrics
 * @param pattern - Work pattern with sequence of shift codes
 * @param requiredShifts - Daily shift requirements
 * @param shiftLengthHours - Duration of each shift in hours
 * @param wtdRules - Working Time Directive rules
 * @param bufferPct - Buffer percentage (0-20) for flexibility
 * @param staffCount - Optional: current staff count for surplus/deficit calculation
 * @returns Feasibility analysis result
 */
export function calculateFeasibility(
  pattern: PatternSequence,
  requiredShifts: RequiredShifts,
  shiftLengthHours: number,
  wtdRules: WTDRules,
  bufferPct: number = 10,
  staffCount?: number
): FeasibilityResult {
  console.log('🧮 calculateFeasibility entry', { pattern, requiredShifts, shiftLengthHours, wtdRules, bufferPct, staffCount });

  const warnings: string[] = [];

  // Count work days in pattern (exclude 'R' for rest)
  const workDays = pattern.sequence.filter(s => s !== 'R' && s !== '').length;
  const cycleDays = pattern.sequence.length;

  // Handle edge case: all-rest pattern
  if (workDays === 0) {
    console.warn('⚠️ Pattern contains no work days');
    return {
      workRatio: 0,
      hoursPerStaffPerWeek: 0,
      weeklyHoursRequired: 0,
      requiredStaff: 0,
      utilizationPct: 0,
      isWTDCompliant: true,
      warnings: ['Pattern contains no work days - cannot calculate staffing requirements'],
      surplus: null,
      bufferPct
    };
  }

  // Calculate work ratio (fraction of cycle spent working)
  const workRatio = workDays / cycleDays;

  // Calculate average hours per staff per week
  const hoursPerStaffPerWeek = workRatio * 7 * shiftLengthHours;

  // Check WTD compliance
  const isWTDCompliant = hoursPerStaffPerWeek <= wtdRules.maxWeeklyHours;
  if (!isWTDCompliant) {
    warnings.push(
      `Pattern averages ${hoursPerStaffPerWeek.toFixed(1)}h/week, exceeding WTD limit of ${wtdRules.maxWeeklyHours}h`
    );
  }

  // Calculate total daily hours required across all shifts
  const dailyHoursRequired = Object.entries(requiredShifts).reduce(
    (sum, [shiftCode, count]) => sum + (count || 0) * shiftLengthHours,
    0
  );

  // Calculate weekly hours required
  const weeklyHoursRequired = dailyHoursRequired * 7;

  // Calculate minimum required staff with buffer (rounded up to nearest whole number)
  const requiredStaff = Math.ceil((weeklyHoursRequired / hoursPerStaffPerWeek) * (1 + bufferPct / 100));

  // Calculate utilization (how efficiently staff time is used)
  const utilizationPct = (weeklyHoursRequired / (requiredStaff * hoursPerStaffPerWeek)) * 100;

  // Calculate surplus/deficit if staff count provided
  const surplus = staffCount !== undefined ? staffCount - requiredStaff : null;

  // Add utilization warnings
  if (utilizationPct < 70) {
    warnings.push(`Low utilization (${utilizationPct.toFixed(1)}%) - consider adjusting pattern or requirements`);
  } else if (utilizationPct > 95) {
    warnings.push(`Very high utilization (${utilizationPct.toFixed(1)}%) - minimal buffer for flexibility`);
  }

  // Add surplus/deficit warnings
  if (surplus !== null) {
    if (surplus < -1) {
      warnings.push(`Staff deficit: ${Math.abs(surplus).toFixed(1)} additional staff needed`);
    } else if (surplus > 1) {
      warnings.push(`Staff surplus: ${surplus.toFixed(1)} excess staff available`);
    }
  }

  console.log('✅ calculateFeasibility result', {
    workRatio,
    hoursPerStaffPerWeek,
    weeklyHoursRequired,
    requiredStaff,
    utilizationPct,
    isWTDCompliant,
    surplus,
    bufferPct,
    warnings
  });

  return {
    workRatio,
    hoursPerStaffPerWeek,
    weeklyHoursRequired,
    requiredStaff,
    utilizationPct,
    isWTDCompliant,
    warnings,
    surplus,
    bufferPct
  };
}
