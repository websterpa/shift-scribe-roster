/**
 * WTD Status Aggregator
 * Single source of truth for WTD compliance across all checks
 */

import { validateConsecutiveDays, validateConsecutiveNights, validateWeeklyRest, validate48HourAverage, DEFAULT_WTD_RULES, type WTDRules } from '@/engine2/constraints/wtdRules';
import { diagnosePattern, type RestViolation } from '@/engine2/constraints/wtdDiagnostics';
import type { WTDSimulationWeek } from '@/utils/feasibility/wtdSimulation';

export type WTDStatusLevel = 'success' | 'warning' | 'error';

export interface WTDStatusMetrics {
  rollingAvg: number;
  maxRolling: number;
  anyWeekOver48: boolean;
  dailyRestOk: boolean;
  continuousRestOk: boolean;
  consecutiveDaysOk: boolean;
  consecutiveNightsOk: boolean;
  restViolations: RestViolation[];
  breachWeeks: number[];
}

export interface WTDStatus {
  success: boolean;
  level: WTDStatusLevel;
  messages: string[];
  metrics: WTDStatusMetrics;
}

export interface ComputeWTDStatusInput {
  pattern: { sequence: string[] };
  shiftLength: number;
  simulation: WTDSimulationWeek[];
  wtdRules?: WTDRules;
}

/**
 * Compute unified WTD status from all available checks
 */
export function computeWTDStatus({
  pattern,
  shiftLength,
  simulation,
  wtdRules = DEFAULT_WTD_RULES
}: ComputeWTDStatusInput): WTDStatus {
  console.log('🔬 Computing unified WTD status...');
  
  const sequence = pattern.sequence;
  
  // 1. Simulation metrics (17-week rolling average)
  const finalRolling = simulation[simulation.length - 1]?.rolling_avg ?? 0;
  const maxRolling = Math.max(...simulation.map(w => w.rolling_avg));
  const breachWeeks = simulation.filter(w => !w.compliant).map(w => w.week);
  const anyWeekOver48 = breachWeeks.length > 0;
  
  // 2. Pattern-level WTD checks
  const consecDaysCheck = validateConsecutiveDays(sequence, wtdRules.max_consec_days);
  const consecNightsCheck = validateConsecutiveNights(sequence, wtdRules.max_consec_nights);
  const weeklyRestCheck = validateWeeklyRest(sequence);
  
  // 3. Rest diagnostics (11h between shifts)
  const shiftSystem = shiftLength === 12 ? '12h' : '8h';
  const diagnostics = diagnosePattern(sequence, { shiftSystem });
  const dailyRestOk = diagnostics.violations.length === 0;
  
  // 4. Aggregate violations
  const messages: string[] = [];
  
  if (finalRolling > 48) {
    messages.push(`17-week rolling average ${finalRolling.toFixed(1)}h exceeds 48h limit`);
  }
  
  if (anyWeekOver48) {
    messages.push(`${breachWeeks.length} week(s) exceed 48h limit (weeks: ${breachWeeks.slice(0, 5).join(', ')}${breachWeeks.length > 5 ? '...' : ''})`);
  }
  
  if (!dailyRestOk) {
    messages.push(`${diagnostics.violations.length} rest violation(s) detected (minimum 11h rest not met)`);
  }
  
  if (!consecDaysCheck.valid && consecDaysCheck.violation) {
    messages.push(consecDaysCheck.violation);
  }
  
  if (!consecNightsCheck.valid && consecNightsCheck.violation) {
    messages.push(consecNightsCheck.violation);
  }
  
  if (!weeklyRestCheck.valid && weeklyRestCheck.violation) {
    messages.push(weeklyRestCheck.violation);
  }
  
  // 5. Determine overall status
  const hasHardFailures = 
    finalRolling > 48 || 
    anyWeekOver48 || 
    !dailyRestOk || 
    !consecDaysCheck.valid || 
    !consecNightsCheck.valid || 
    !weeklyRestCheck.valid;
  
  const status: WTDStatus = {
    success: !hasHardFailures,
    level: hasHardFailures ? 'error' : 'success',
    messages: hasHardFailures ? messages : ['✅ Fully compliant across all WTD checks'],
    metrics: {
      rollingAvg: finalRolling,
      maxRolling,
      anyWeekOver48,
      dailyRestOk,
      continuousRestOk: weeklyRestCheck.valid,
      consecutiveDaysOk: consecDaysCheck.valid,
      consecutiveNightsOk: consecNightsCheck.valid,
      restViolations: diagnostics.violations,
      breachWeeks
    }
  };
  
  console.log('✅ WTD status computed:', {
    success: status.success,
    level: status.level,
    violations: messages.length
  });
  
  return status;
}
