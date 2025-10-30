/**
 * AI Fairness Balancer
 * 
 * Deterministic fairness model that analyzes historical roster assignments
 * to ensure equitable distribution of unpopular shifts and prevent staff fatigue.
 */

import { createLogger } from '@/utils/errorLogger';
import type { RosterAssignment } from '@/engine/generateRoster';

const logger = createLogger('FairnessBalancer');

export interface ShiftWeights {
  N: number;  // Night shifts (most demanding)
  E: number;  // Early shifts
  L: number;  // Late shifts
  D: number;  // Day shifts (12h)
  R: number;  // Rest days
}

// Default shift weights (higher = more demanding)
const DEFAULT_SHIFT_WEIGHTS: ShiftWeights = {
  N: 2.0,  // Night shifts weighted most heavily
  E: 1.2,
  L: 1.3,
  D: 1.5,
  R: 0.0
};

export interface StaffWorkloadScore {
  staffId: string;
  staffName: string;
  totalShifts: number;
  weightedLoad: number;
  nightShifts: number;
  weekendShifts: number;
  fairnessScore: number;  // Positive = underworked, Negative = overworked
}

export interface FairnessAnalysis {
  staffScores: Record<string, StaffWorkloadScore>;
  averageLoad: number;
  adjustmentsNeeded: number;
}

/**
 * Compute workload scores from historical roster data
 * 
 * @param history - Historical roster assignments
 * @param weights - Optional custom shift weights
 * @returns Staff workload scores and fairness analysis
 */
export function computeShiftScores(
  history: RosterAssignment[],
  weights: ShiftWeights = DEFAULT_SHIFT_WEIGHTS
): FairnessAnalysis {
  logger.info('[computeShiftScores] Analyzing historical workload', {
    assignments: history.length
  });

  if (history.length === 0) {
    return {
      staffScores: {},
      averageLoad: 0,
      adjustmentsNeeded: 0
    };
  }

  // Calculate weighted load per staff member
  const staffLoads: Record<string, {
    totalShifts: number;
    weightedLoad: number;
    nightShifts: number;
    weekendShifts: number;
    staffName: string;
  }> = {};

  for (const assignment of history) {
    if (!staffLoads[assignment.staffId]) {
      staffLoads[assignment.staffId] = {
        totalShifts: 0,
        weightedLoad: 0,
        nightShifts: 0,
        weekendShifts: 0,
        staffName: assignment.staffName
      };
    }

    const load = staffLoads[assignment.staffId];
    const weight = weights[assignment.shift as keyof ShiftWeights] ?? 1.0;
    
    load.totalShifts++;
    load.weightedLoad += weight;
    
    if (assignment.shift === 'N') {
      load.nightShifts++;
    }
    
    // Check if weekend (Saturday or Sunday)
    const dayOfWeek = assignment.date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      load.weekendShifts++;
    }
  }

  // Calculate average load
  const totalLoad = Object.values(staffLoads).reduce((sum, s) => sum + s.weightedLoad, 0);
  const staffCount = Object.keys(staffLoads).length;
  const averageLoad = staffCount > 0 ? totalLoad / staffCount : 0;

  logger.info('[computeShiftScores] Calculated average load', {
    totalLoad: totalLoad.toFixed(2),
    staffCount,
    averageLoad: averageLoad.toFixed(2)
  });

  // Compute fairness scores (positive = needs more work, negative = overworked)
  const staffScores: Record<string, StaffWorkloadScore> = {};
  let adjustmentsNeeded = 0;

  for (const [staffId, load] of Object.entries(staffLoads)) {
    const fairnessScore = parseFloat((averageLoad - load.weightedLoad).toFixed(2));
    
    staffScores[staffId] = {
      staffId,
      staffName: load.staffName,
      totalShifts: load.totalShifts,
      weightedLoad: parseFloat(load.weightedLoad.toFixed(2)),
      nightShifts: load.nightShifts,
      weekendShifts: load.weekendShifts,
      fairnessScore
    };

    // Count staff who need rebalancing (threshold: ±10% of average)
    if (Math.abs(fairnessScore) > averageLoad * 0.1) {
      adjustmentsNeeded++;
    }
  }

  logger.info('[computeShiftScores] Fairness analysis complete', {
    staffAnalyzed: staffCount,
    adjustmentsNeeded
  });

  return {
    staffScores,
    averageLoad: parseFloat(averageLoad.toFixed(2)),
    adjustmentsNeeded
  };
}

/**
 * Balance roster assignments based on historical fairness scores
 * 
 * Prevents staff fatigue by reducing demanding shifts for overworked staff
 * and redistributing to underworked staff.
 * 
 * @param roster - Current roster to balance
 * @param history - Historical assignments for fairness calculation
 * @returns Balanced roster with fatigue prevention notes
 */
export function balanceRoster(
  roster: RosterAssignment[],
  history: RosterAssignment[]
): RosterAssignment[] {
  logger.info('[balanceRoster] Starting fairness balancing', {
    currentRoster: roster.length,
    historicalData: history.length
  });

  if (history.length === 0) {
    logger.warn('[balanceRoster] No historical data available, skipping balance');
    return roster;
  }

  // Compute fairness scores from history
  const analysis = computeShiftScores(history);
  
  if (Object.keys(analysis.staffScores).length === 0) {
    return roster;
  }

  const balancedRoster: RosterAssignment[] = [];
  let adjustmentCount = 0;

  for (const assignment of roster) {
    const staffScore = analysis.staffScores[assignment.staffId];
    
    if (!staffScore) {
      // New staff member not in history
      balancedRoster.push(assignment);
      continue;
    }

    // Apply fatigue prevention for overworked staff on demanding shifts
    const isOverworked = staffScore.fairnessScore < -0.5;
    const isDemandingShift = assignment.shift === 'N' || assignment.shift === 'D';
    
    if (isOverworked && isDemandingShift) {
      // Convert demanding shift to rest for overworked staff
      logger.info('[balanceRoster] Applying fatigue prevention', {
        staffId: assignment.staffId,
        staffName: assignment.staffName,
        originalShift: assignment.shift,
        fairnessScore: staffScore.fairnessScore
      });

      balancedRoster.push({
        ...assignment,
        shift: 'R',
        notes: `Fatigue prevention (overwork score: ${staffScore.fairnessScore})`
      });
      adjustmentCount++;
    } else {
      balancedRoster.push(assignment);
    }
  }

  logger.info('[balanceRoster] Balancing complete', {
    adjustmentsMade: adjustmentCount,
    originalAssignments: roster.length,
    balancedAssignments: balancedRoster.length
  });

  return balancedRoster;
}

/**
 * Get staff members who need rebalancing
 */
export function getRebalancingCandidates(
  analysis: FairnessAnalysis,
  threshold: number = 0.5
): StaffWorkloadScore[] {
  return Object.values(analysis.staffScores)
    .filter(s => s.fairnessScore < -threshold)
    .sort((a, b) => a.fairnessScore - b.fairnessScore);
}

/**
 * Generate fairness report for display
 */
export function generateFairnessReport(analysis: FairnessAnalysis): string {
  const lines = [
    '='.repeat(60),
    'FAIRNESS ANALYSIS REPORT',
    '='.repeat(60),
    `Average Workload: ${analysis.averageLoad.toFixed(2)}`,
    `Staff Needing Rebalancing: ${analysis.adjustmentsNeeded}`,
    '',
    'Staff Workload Breakdown:',
    '-'.repeat(60)
  ];

  const sortedStaff = Object.values(analysis.staffScores)
    .sort((a, b) => a.fairnessScore - b.fairnessScore);

  for (const staff of sortedStaff) {
    const status = staff.fairnessScore > 0 ? '▼ Underworked' : 
                   staff.fairnessScore < 0 ? '▲ Overworked' : 
                   '= Balanced';
    lines.push(
      `${staff.staffName.padEnd(20)} | Load: ${staff.weightedLoad.toFixed(1).padStart(6)} | ` +
      `Nights: ${staff.nightShifts.toString().padStart(2)} | ` +
      `Score: ${staff.fairnessScore.toFixed(2).padStart(6)} | ${status}`
    );
  }

  lines.push('='.repeat(60));
  return lines.join('\n');
}
