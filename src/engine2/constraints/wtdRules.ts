/**
 * Working Time Directive (WTD) Rules Engine
 * Enforces UK WTD 1998 & NHS/HSE good practice for roster generation
 */

export interface WTDRules {
  min_daily_rest_hours: number; // 11h default
  weekly_rest: {
    min_24h_each_7_days: boolean;
    min_48h_each_14_days: boolean;
  };
  max_weekly_hours: number; // 48h default
  night_avg_limit: number; // 8h per 24h period
  max_consec_days: number; // 6 default
  max_consec_nights: number; // 3 default
  days_off_after_night_block: number; // 2 default
  reference_period_weeks: number; // 17 weeks for averaging
}

export const DEFAULT_WTD_RULES: WTDRules = {
  min_daily_rest_hours: 11,
  weekly_rest: {
    min_24h_each_7_days: true,
    min_48h_each_14_days: true,
  },
  max_weekly_hours: 48,
  night_avg_limit: 8,
  max_consec_days: 6,
  max_consec_nights: 3,
  days_off_after_night_block: 2,
  reference_period_weeks: 17,
};

export interface ShiftTimes {
  E: { start: string; end: string }; // Early: 06:00-14:00
  L: { start: string; end: string }; // Late: 14:00-22:00
  N: { start: string; end: string }; // Night: 22:00-06:00
}

export const DEFAULT_SHIFT_TIMES: ShiftTimes = {
  E: { start: '06:00', end: '14:00' },
  L: { start: '14:00', end: '22:00' },
  N: { start: '22:00', end: '06:00' },
};

/**
 * Calculate rest hours between two shifts
 */
export function calculateRestHours(
  shift1End: string,
  shift2Start: string
): number {
  const [h1, m1] = shift1End.split(':').map(Number);
  const [h2, m2] = shift2Start.split(':').map(Number);
  
  let minutesEnd = h1 * 60 + m1;
  let minutesStart = h2 * 60 + m2;
  
  // Handle overnight (next day start)
  if (minutesStart < minutesEnd) {
    minutesStart += 24 * 60;
  }
  
  return (minutesStart - minutesEnd) / 60;
}

/**
 * Invalid transitions (< 11h rest)
 */
export const INVALID_TRANSITIONS: Record<string, string[]> = {
  L: ['E'], // Late→Early = 8h rest
  N: ['E', 'L'], // Night→Early = 4h rest, Night→Late = 8h rest
};

/**
 * Check if a shift transition is valid (meets 11h rest)
 */
export function isValidTransition(
  fromShift: string,
  toShift: string,
  shiftTimes: ShiftTimes = DEFAULT_SHIFT_TIMES,
  minRestHours: number = 11
): boolean {
  if (fromShift === 'R' || toShift === 'R') return true; // Rest days always valid
  
  const fromEnd = shiftTimes[fromShift as keyof ShiftTimes]?.end;
  const toStart = shiftTimes[toShift as keyof ShiftTimes]?.start;
  
  if (!fromEnd || !toStart) return false;
  
  const restHours = calculateRestHours(fromEnd, toStart);
  return restHours >= minRestHours;
}

/**
 * Validate consecutive working days
 */
export function validateConsecutiveDays(
  assignments: string[],
  maxConsecDays: number
): { valid: boolean; violation?: string } {
  let consecCount = 0;
  let maxStreak = 0;
  
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i] !== 'R' && assignments[i] !== '') {
      consecCount++;
      maxStreak = Math.max(maxStreak, consecCount);
    } else {
      consecCount = 0;
    }
  }
  
  if (maxStreak > maxConsecDays) {
    return {
      valid: false,
      violation: `Consecutive working days (${maxStreak}) exceeds limit (${maxConsecDays})`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate consecutive night shifts
 */
export function validateConsecutiveNights(
  assignments: string[],
  maxConsecNights: number
): { valid: boolean; violation?: string } {
  let consecCount = 0;
  let maxStreak = 0;
  
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i] === 'N') {
      consecCount++;
      maxStreak = Math.max(maxStreak, consecCount);
    } else {
      consecCount = 0;
    }
  }
  
  if (maxStreak > maxConsecNights) {
    return {
      valid: false,
      violation: `Consecutive nights (${maxStreak}) exceeds limit (${maxConsecNights})`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate weekly rest (24h in each 7-day window)
 */
export function validateWeeklyRest(
  assignments: string[]
): { valid: boolean; violation?: string } {
  const windowSize = 7;
  
  for (let i = 0; i <= assignments.length - windowSize; i++) {
    const window = assignments.slice(i, i + windowSize);
    const workedDays = window.filter(s => s !== 'R' && s !== '').length;
    
    if (workedDays > 6) {
      return {
        valid: false,
        violation: `7 consecutive working days detected at day ${i + 1} (no weekly rest)`,
      };
    }
  }
  
  return { valid: true };
}

/**
 * Validate 48-hour average weekly limit
 */
export function validate48HourAverage(
  assignments: string[],
  hoursPerShift: number = 8,
  referencePeriodWeeks: number = 17,
  optedOut: boolean = false
): { valid: boolean; violation?: string } {
  if (optedOut) return { valid: true };
  
  const totalDays = Math.min(assignments.length, referencePeriodWeeks * 7);
  const workedShifts = assignments
    .slice(0, totalDays)
    .filter(s => s !== 'R' && s !== '').length;
  
  const totalHours = workedShifts * hoursPerShift;
  const weeks = totalDays / 7;
  const avgHoursPerWeek = totalHours / weeks;
  
  if (avgHoursPerWeek > 48) {
    return {
      valid: false,
      violation: `Average weekly hours (${avgHoursPerWeek.toFixed(1)}) exceeds 48h limit over ${weeks.toFixed(1)} weeks`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate night work average (≤ 8h per 24h period)
 */
export function validateNightWorkAverage(
  assignments: string[],
  nightShiftHours: number = 8,
  referencePeriodWeeks: number = 17
): { valid: boolean; violation?: string } {
  const totalDays = Math.min(assignments.length, referencePeriodWeeks * 7);
  const nightShifts = assignments
    .slice(0, totalDays)
    .filter(s => s === 'N').length;
  
  const totalNightHours = nightShifts * nightShiftHours;
  const avgNightHoursPerDay = totalNightHours / totalDays;
  
  if (avgNightHoursPerDay > 8) {
    return {
      valid: false,
      violation: `Average night hours per day (${avgNightHoursPerDay.toFixed(1)}) exceeds 8h limit`,
    };
  }
  
  return { valid: true };
}

/**
 * Comprehensive WTD validation for a single staff member
 */
export function validateStaffWTD(
  assignments: string[],
  rules: WTDRules = DEFAULT_WTD_RULES,
  shiftTimes: ShiftTimes = DEFAULT_SHIFT_TIMES,
  optedOut: boolean = false
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  // 1. Check consecutive days
  const consecDaysResult = validateConsecutiveDays(assignments, rules.max_consec_days);
  if (!consecDaysResult.valid && consecDaysResult.violation) {
    violations.push(consecDaysResult.violation);
  }
  
  // 2. Check consecutive nights
  const consecNightsResult = validateConsecutiveNights(assignments, rules.max_consec_nights);
  if (!consecNightsResult.valid && consecNightsResult.violation) {
    violations.push(consecNightsResult.violation);
  }
  
  // 3. Check daily rest (11h between shifts)
  for (let i = 0; i < assignments.length - 1; i++) {
    const today = assignments[i];
    const tomorrow = assignments[i + 1];
    
    if (today !== 'R' && today !== '' && tomorrow !== 'R' && tomorrow !== '') {
      if (!isValidTransition(today, tomorrow, shiftTimes, rules.min_daily_rest_hours)) {
        violations.push(
          `Invalid transition ${today}→${tomorrow} at day ${i + 1} (< ${rules.min_daily_rest_hours}h rest)`
        );
      }
    }
  }
  
  // 4. Check weekly rest
  if (rules.weekly_rest.min_24h_each_7_days) {
    const weeklyRestResult = validateWeeklyRest(assignments);
    if (!weeklyRestResult.valid && weeklyRestResult.violation) {
      violations.push(weeklyRestResult.violation);
    }
  }
  
  // 5. Check 48h average
  const avgResult = validate48HourAverage(
    assignments,
    8,
    rules.reference_period_weeks,
    optedOut
  );
  if (!avgResult.valid && avgResult.violation) {
    violations.push(avgResult.violation);
  }
  
  // 6. Check night work average
  const nightAvgResult = validateNightWorkAverage(
    assignments,
    8,
    rules.reference_period_weeks
  );
  if (!nightAvgResult.valid && nightAvgResult.violation) {
    violations.push(nightAvgResult.violation);
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}
