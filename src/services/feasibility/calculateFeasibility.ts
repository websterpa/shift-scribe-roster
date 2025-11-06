/**
 * Feasibility Calculator Service
 * Integrates shift patterns with WTD validation and staffing calculations
 */

import { 
  validateStaffWTD, 
  validate48HourAverage,
  validateConsecutiveDays,
  validateConsecutiveNights,
  validateWeeklyRest,
  DEFAULT_WTD_RULES,
  type WTDRules 
} from '@/engine2/constraints/wtdRules';

export interface PatternSequence {
  sequence: string[];
  cycle_length?: number;
  avg_weekly_hours?: number;
  teams_required?: number;
}

export interface FeasibilityInput {
  pattern: PatternSequence;
  shiftLengthHours: number;
  requiredShiftsPerDay: number;
  bufferPercent?: number;
  currentStaffCount?: number;
  standardContractHours?: number;
  wtdRules?: WTDRules;
}

export interface FeasibilityResult {
  // Workload metrics
  workRatio: number;
  activeDaysInCycle: number;
  restDaysInCycle: number;
  hoursPerStaffPerWeek: number; // Pattern-derived (informational only)
  weeklyHoursRequired: number;
  
  // Staffing metrics (CONTRACT-BASED)
  requiredStaff: number; // Based on standardContractHours
  utilizationPct: number; // Based on standardContractHours
  surplus: number | null;
  standardContractHours: number; // Contract basis for all capacity calculations
  availableHoursPerWeek: number; // requiredStaff * standardContractHours
  overtimeGapPerWeek: number;
  fteRequired: number;
  fteAvailable: number;
  
  // WTD Compliance
  isWTDCompliant: boolean;
  wtdViolations: string[];
  wtdChecks: {
    restPeriodsOk: boolean;
    weeklyAverageOk: boolean;
    consecutiveDaysOk: boolean;
    consecutiveNightsOk: boolean;
    weeklyRestOk: boolean;
  };
  
  // Metadata
  bufferPct: number;
  warnings: string[];
}

/**
 * Calculate total required hours per week across all shifts
 */
export function requiredHoursPerWeek(requiredPerDay: Record<string, number>, shiftLength: number): number {
  const perDay = Object.values(requiredPerDay || {}).reduce((a, b) => a + (b || 0), 0);
  return perDay * 7 * shiftLength; // team-hours/week
}

/**
 * Calculate total available hours per week from staff
 */
export function availableHoursPerWeek(staffCount: number, standardContractHours: number): number {
  return Math.max(0, staffCount) * Math.max(0, standardContractHours);
}

/**
 * Calculate overtime and slack hours per week
 */
export function overtimeSlack(requiredHrsWk: number, availableHrsWk: number): { overtime: number; slack: number } {
  const overtime = Math.max(0, requiredHrsWk - availableHrsWk);
  const slack = Math.max(0, availableHrsWk - requiredHrsWk);
  return { overtime, slack };
}

/**
 * Calculate FTE gap
 */
export function fteGap(requiredHrsWk: number, standardContractHours: number, staffCount: number): { reqFTE: number; haveFTE: number; gapFTE: number } {
  const reqFTE = requiredHrsWk / Math.max(1, standardContractHours);
  const haveFTE = staffCount;
  return { reqFTE, haveFTE, gapFTE: reqFTE - haveFTE };
}

/**
 * Calculate total required hours over 17 weeks
 * Handles non-uniform cycles by using weekly baseline
 */
export function requiredHoursOver17Weeks(
  patternSeq: string[],
  cycleLength: number,
  shiftLength: number,
  requiredPerDay: Record<string, number>
): number {
  const weekly = requiredHoursPerWeek(requiredPerDay, shiftLength);
  return weekly * 17;
}

export function calculateFeasibility(input: FeasibilityInput): FeasibilityResult {
  console.log('🧮 Calculating feasibility:', input);
  
  const {
    pattern,
    shiftLengthHours,
    requiredShiftsPerDay,
    bufferPercent = 10,
    currentStaffCount,
    standardContractHours = 37.5,
    wtdRules = DEFAULT_WTD_RULES
  } = input;
  
  const sequence = pattern.sequence || [];
  const cycleLength = pattern.cycle_length || sequence.length;
  
  // Calculate work ratio
  const activeDays = sequence.filter(s => s !== 'R' && s !== '').length;
  const restDays = cycleLength - activeDays;
  const workRatio = activeDays / cycleLength;
  
  if (workRatio === 0) {
    return {
      workRatio: 0,
      activeDaysInCycle: 0,
      restDaysInCycle: cycleLength,
      hoursPerStaffPerWeek: 0,
      weeklyHoursRequired: 0,
      requiredStaff: 0,
      utilizationPct: 0,
      surplus: null,
      standardContractHours,
      availableHoursPerWeek: 0,
      overtimeGapPerWeek: 0,
      fteRequired: 0,
      fteAvailable: 0,
      isWTDCompliant: false,
      wtdViolations: ['Pattern has no work days'],
      wtdChecks: {
        restPeriodsOk: false,
        weeklyAverageOk: false,
        consecutiveDaysOk: false,
        consecutiveNightsOk: false,
        weeklyRestOk: false
      },
      bufferPct: bufferPercent,
      warnings: ['Pattern contains only rest days']
    };
  }
  
  // Feasibility is contract-based; pattern per-staff hours are informational only.
  // Calculate pattern-based hours per staff per week (for reference/display only)
  const hoursPerStaffPerWeek = (activeDays / cycleLength) * 7 * shiftLengthHours;
  
  // Calculate weekly demand (team-level requirement)
  const weeklyHoursRequired = requiredShiftsPerDay * 7 * shiftLengthHours;
  
  // Calculate required staff (CONTRACT-BASED with buffer)
  const bufferMultiplier = 1 + (bufferPercent / 100);
  const requiredStaff = Math.ceil((weeklyHoursRequired / standardContractHours) * bufferMultiplier);
  
  // Calculate utilization (CONTRACT-BASED)
  const availableHoursPerWeekCalc = requiredStaff * standardContractHours;
  const utilizationPct = (weeklyHoursRequired / availableHoursPerWeekCalc) * 100;
  
  // Calculate surplus/deficit
  const surplus = currentStaffCount ? currentStaffCount - requiredStaff : null;
  
  // Calculate operational capacity vs requirement (CONTRACT-BASED)
  const availableHoursPerWeek = requiredStaff * standardContractHours;
  const overtimeGapPerWeek = Math.max(0, weeklyHoursRequired - availableHoursPerWeek);
  
  // Calculate FTE (Full-Time Equivalent) based on standard contract hours
  const fteRequired = weeklyHoursRequired / standardContractHours;
  const fteAvailable = currentStaffCount ? (currentStaffCount * standardContractHours) / standardContractHours : requiredStaff;
  
  // WTD Validation - Extend sequence to cover 17 weeks for proper validation
  // @deprecated Legacy WTD validation - UI now uses unified wtdStatus from engine2
  const extendedSequence = generateExtendedSequence(sequence, wtdRules.reference_period_weeks);
  
  // Run comprehensive WTD validation
  // @deprecated Legacy - kept for backward compatibility only
  const wtdValidation = validateStaffWTD(extendedSequence, wtdRules);
  
  // Individual checks for detailed feedback
  // @deprecated Legacy checks - UI uses unified status
  const consecDaysCheck = validateConsecutiveDays(extendedSequence, wtdRules.max_consec_days);
  const consecNightsCheck = validateConsecutiveNights(extendedSequence, wtdRules.max_consec_nights);
  const weeklyRestCheck = validateWeeklyRest(extendedSequence);
  const weeklyAvgCheck = validate48HourAverage(extendedSequence, shiftLengthHours, wtdRules.reference_period_weeks, false);
  
  const wtdChecks = {
    restPeriodsOk: !wtdValidation.violations.some(v => v.includes('rest')),
    weeklyAverageOk: weeklyAvgCheck.valid,
    consecutiveDaysOk: consecDaysCheck.valid,
    consecutiveNightsOk: consecNightsCheck.valid,
    weeklyRestOk: weeklyRestCheck.valid
  };
  
  // Generate warnings (pattern hours are informational only - not used for capacity)
  const warnings: string[] = [];
  
  // Note: hoursPerStaffPerWeek is pattern-derived and informational only
  // Warnings based on contract hours instead
  if (standardContractHours < 30) {
    warnings.push('Low contracted hours - check contract configuration');
  }
  
  if (weeklyHoursRequired / requiredStaff > 48) {
    warnings.push('Required workload exceeds 48h/staff/week - WTD compliance at risk');
  }
  
  if (utilizationPct < 70) {
    warnings.push('Low utilization - consider reducing staff count');
  }
  
  if (utilizationPct > 95) {
    warnings.push('Very high utilization - little flexibility for absences');
  }
  
  // @deprecated Legacy WTD warning - UI now uses unified wtdStatus banner
  // This warning is filtered out in FeasibilityCalculator.tsx
  if (!wtdValidation.valid) {
    warnings.push('Pattern violates WTD regulations - review required');
  }
  
  const result: FeasibilityResult = {
    workRatio,
    activeDaysInCycle: activeDays,
    restDaysInCycle: restDays,
    hoursPerStaffPerWeek,
    weeklyHoursRequired,
    requiredStaff,
    utilizationPct,
    surplus,
    standardContractHours,
    availableHoursPerWeek,
    overtimeGapPerWeek,
    fteRequired,
    fteAvailable,
    isWTDCompliant: wtdValidation.valid,
    wtdViolations: wtdValidation.violations,
    wtdChecks,
    bufferPct: bufferPercent,
    warnings
  };
  
  console.log('✅ Feasibility result:', result);
  
  return result;
}

/**
 * Generate extended sequence for WTD validation
 * Repeats the pattern to cover the reference period
 */
function generateExtendedSequence(sequence: string[], weeks: number): string[] {
  const daysNeeded = weeks * 7;
  const extended: string[] = [];
  
  for (let i = 0; i < daysNeeded; i++) {
    extended.push(sequence[i % sequence.length]);
  }
  
  return extended;
}
