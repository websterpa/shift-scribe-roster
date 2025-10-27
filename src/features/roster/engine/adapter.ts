/**
 * Adapter functions to transform between engine types and application types
 * 
 * Bridges the gap between:
 * - Engine's CorrectiveResult (internal format)
 * - Application's RosterGenerationResult (UI-facing format)
 */

import type { CorrectiveResult } from '@/engine2/generators/correctiveRosterGenerator';
import type { 
  RosterGenerationResult, 
  RosterGenerationResultUI,
  DistributionStats,
  StaffDistributionStats,
  Diagnostics,
  Assignment,
  EligibilityReason
} from '../types';

/**
 * Transform CorrectiveResult into the canonical RosterGenerationResult format
 * 
 * @param engineResult - Result from generateCorrectiveRoster
 * @param warnings - Optional array of warning messages
 * @returns Standardized roster generation result
 */
export function transformCorrectiveResult(
  engineResult: CorrectiveResult,
  warnings?: string[]
): RosterGenerationResult {
  console.log('✓ Adapter: Transforming CorrectiveResult to RosterGenerationResult');
  
  // Transform engine assignments to standard format
  const assignments: Assignment[] = engineResult.assignments.map(a => ({
    id: undefined,
    date: a.dateISO,
    shift_code: a.shiftType as 'E' | 'L' | 'N' | 'D',
    staff_id: a.staffId,
  }));

  // Transform distribution stats from engine format to standard format
  const distributionStats: DistributionStats = {
    byStaff: Object.entries(engineResult.diagnostics.distributionStats).map(([staffId, stats]) => ({
      staffId,
      staffName: undefined, // Engine doesn't provide names directly
      totalHours: stats.totalHours,
      totalShifts: 0, // Calculate from assignments if needed
      nights: stats.nights,
      weekendDays: stats.weekendDays,
    })),
    byShiftCode: {
      E: { count: engineResult.fairness.staffTotals ? Object.values(engineResult.fairness.staffTotals).reduce((sum, s) => sum + s.E, 0) : 0 },
      L: { count: engineResult.fairness.staffTotals ? Object.values(engineResult.fairness.staffTotals).reduce((sum, s) => sum + s.L, 0) : 0 },
      N: { count: engineResult.fairness.staffTotals ? Object.values(engineResult.fairness.staffTotals).reduce((sum, s) => sum + s.N, 0) : 0 },
      D: { count: engineResult.fairness.staffTotals ? Object.values(engineResult.fairness.staffTotals).reduce((sum, s) => sum + s.D, 0) : 0 },
    },
  };

  // Build constraint violations record
  const constraintViolations: Record<string, number> = {};
  if (engineResult.violations.length > 0) {
    engineResult.violations.forEach(v => {
      if (v.includes('rest')) constraintViolations.minRest = (constraintViolations.minRest || 0) + 1;
      if (v.includes('consecutive')) constraintViolations.maxConsec = (constraintViolations.maxConsec || 0) + 1;
    });
  }

  // Build diagnostics
  const diagnostics: Diagnostics = {
    distributionStats,
    fairnessScore: engineResult.fairness.variance 
      ? 100 - (engineResult.fairness.variance.E + engineResult.fairness.variance.L + engineResult.fairness.variance.N)
      : undefined,
    constraintViolations: Object.keys(constraintViolations).length > 0 ? constraintViolations : undefined,
    excludedStaff: engineResult.unfilledShifts?.length 
      ? engineResult.unfilledShifts
          .map(us => us.rejectionReasons)
          .flat()
          .filter((v, i, a) => a.indexOf(v) === i) // unique
          .map(reason => ({
            staffId: 'unknown',
            reasons: [{ code: 'other' as const, detail: reason }]
          }))
      : undefined,
  };

  console.log('✓ Adapter: Diagnostics populated', {
    staffCount: distributionStats.byStaff.length,
    violations: constraintViolations,
    fairnessScore: diagnostics.fairnessScore
  });

  return {
    assignments,
    warnings: warnings || engineResult.violations,
    diagnostics,
  };
}

/**
 * Transform CorrectiveResult into legacy UI result format
 * 
 * @param engineResult - Result from generateCorrectiveRoster
 * @param versionId - Optional version ID for navigation
 * @param budgetSet - Optional budget for variance calculation
 * @returns UI-facing roster generation result
 */
export function transformToUIResult(
  engineResult: CorrectiveResult,
  versionId?: string,
  budgetSet?: number
): RosterGenerationResultUI {
  console.log('✓ Adapter: Transforming to UI result format');
  
  // Calculate fairness stats from engine fairness data
  const nightCounts = Object.values(engineResult.fairness.staffTotals).map(s => s.N);
  const fairnessStats = {
    nights: {
      min: Math.min(...nightCounts),
      avg: nightCounts.reduce((sum, n) => sum + n, 0) / nightCounts.length,
      max: Math.max(...nightCounts),
    },
    weekends: { min: 0, avg: 0, max: 0 }, // Engine doesn't track weekends yet
    publicHolidays: { min: 0, avg: 0, max: 0 }, // Engine doesn't track PH yet
  };

  // Calculate coverage achieved
  const totalRequired = Object.values(engineResult.coverage).reduce((sum, day) => 
    sum + day.E + day.L + day.N + day.D, 0
  );
  const totalAssigned = engineResult.assignments.length;
  const coveragePercent = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0;

  return {
    coverageAchieved: {
      total: Math.round(coveragePercent),
      byShift: {
        E: engineResult.coverage ? Object.values(engineResult.coverage).reduce((sum, day) => sum + day.E, 0) : 0,
        L: engineResult.coverage ? Object.values(engineResult.coverage).reduce((sum, day) => sum + day.L, 0) : 0,
        N: engineResult.coverage ? Object.values(engineResult.coverage).reduce((sum, day) => sum + day.N, 0) : 0,
        D: engineResult.coverage ? Object.values(engineResult.coverage).reduce((sum, day) => sum + day.D, 0) : 0,
      },
    },
    fairnessStats,
    cost: {
      total: 0, // Costing not yet integrated in engine
      budgetVariance: budgetSet ? -budgetSet : undefined,
    },
    violations: engineResult.violations,
    generatedVersionId: versionId,
    diagnostics: engineResult.diagnostics,
  };
}
