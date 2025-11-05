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
  hoursPerStaffPerWeek: number;
  weeklyHoursRequired: number;
  
  // Staffing metrics
  requiredStaff: number;
  utilizationPct: number;
  surplus: number | null;
  standardContractHours: number;
  availableHoursPerWeek: number;
  overtimeGapPerWeek: number;
  
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
  
  // Calculate hours per staff per week
  const hoursPerStaffPerWeek = (activeDays / cycleLength) * 7 * shiftLengthHours;
  
  // Calculate weekly demand
  const weeklyHoursRequired = requiredShiftsPerDay * 7 * shiftLengthHours;
  
  // Calculate required staff (with buffer)
  const bufferMultiplier = 1 + (bufferPercent / 100);
  const requiredStaff = Math.ceil((weeklyHoursRequired / hoursPerStaffPerWeek) * bufferMultiplier);
  
  // Calculate utilization
  const utilizationPct = (weeklyHoursRequired / (requiredStaff * hoursPerStaffPerWeek)) * 100;
  
  // Calculate surplus/deficit
  const surplus = currentStaffCount ? currentStaffCount - requiredStaff : null;
  
  // Calculate operational capacity vs requirement
  const availableHoursPerWeek = standardContractHours * requiredStaff;
  const overtimeGapPerWeek = Math.max(0, weeklyHoursRequired - availableHoursPerWeek);
  
  // WTD Validation - Extend sequence to cover 17 weeks for proper validation
  const extendedSequence = generateExtendedSequence(sequence, wtdRules.reference_period_weeks);
  
  // Run comprehensive WTD validation
  const wtdValidation = validateStaffWTD(extendedSequence, wtdRules);
  
  // Individual checks for detailed feedback
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
  
  // Generate warnings
  const warnings: string[] = [];
  
  if (hoursPerStaffPerWeek < 30) {
    warnings.push('Low weekly hours per staff - may indicate underutilization');
  }
  
  if (hoursPerStaffPerWeek > 48) {
    warnings.push('High weekly hours per staff - WTD compliance at risk');
  }
  
  if (utilizationPct < 70) {
    warnings.push('Low utilization - consider reducing staff count');
  }
  
  if (utilizationPct > 95) {
    warnings.push('Very high utilization - little flexibility for absences');
  }
  
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
