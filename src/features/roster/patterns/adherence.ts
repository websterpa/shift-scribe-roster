/**
 * Pattern adherence tracking and diagnostics
 * 
 * Calculates how closely roster assignments follow staff patterns,
 * tracking matches, overrides, remaps, and absences.
 */

import type { ExpandedPatternDay } from './types';
import type { Assignment } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface PatternAdherenceMetrics {
  staffId: string;
  staffName?: string;
  expectedDutyDays: number;      // Work days in pattern (not R)
  matchedDutyDays: number;        // Assignments on expected work days
  adherencePct: number;           // matchedDutyDays / expectedDutyDays * 100
  remappedELtoD?: number;         // E/L codes remapped to D (12h framework)
  restPreservedDays?: number;     // R days with no assignment
  absenceDays?: number;           // Days marked as absence (A)
}

export interface PatternAdherenceSummary {
  byStaff: PatternAdherenceMetrics[];
  overallAdherence: number;       // Average adherence across all staff
  totalExpectedDays: number;
  totalMatchedDays: number;
  totalRestPreserved: number;
  totalAbsenceDays: number;
}

// ============================================================================
// ADHERENCE CALCULATION
// ============================================================================

/**
 * Calculate pattern adherence metrics for a single staff member
 * 
 * @param staffId - Staff member ID
 * @param expandedPattern - Expanded pattern days
 * @param assignments - Actual roster assignments for this staff
 * @param staffName - Optional staff name for display
 * @returns Adherence metrics
 */
export function calculateStaffAdherence(
  staffId: string,
  expandedPattern: Array<ExpandedPatternDay & { absence?: 'A'; absenceType?: string }>,
  assignments: Assignment[],
  staffName?: string
): PatternAdherenceMetrics {
  console.log(`📊 Calculating adherence for staff: ${staffId}`);

  // Create assignment lookup by date
  const assignmentsByDate = new Map<string, Assignment>();
  for (const assignment of assignments) {
    if (assignment.staff_id === staffId) {
      assignmentsByDate.set(assignment.date, assignment);
    }
  }

  let expectedDutyDays = 0;
  let matchedDutyDays = 0;
  let remappedELtoD = 0;
  let restPreservedDays = 0;
  let absenceDays = 0;

  for (const day of expandedPattern) {
    const hasAssignment = assignmentsByDate.has(day.date);

    // Track absences
    if (day.absence === 'A') {
      absenceDays++;
      // Absence days should be rest (no assignment)
      if (!hasAssignment) {
        restPreservedDays++;
      }
      continue;
    }

    // Track rest days
    if (day.is_rest) {
      if (!hasAssignment) {
        restPreservedDays++;
      }
      continue;
    }

    // Work day in pattern
    expectedDutyDays++;

    // Check if assignment matches pattern
    const assignment = assignmentsByDate.get(day.date);
    if (assignment) {
      matchedDutyDays++;

      // Track E/L → D remapping
      if ((day.shift_code === 'E' || day.shift_code === 'L') && 
          assignment.shift_code === 'D') {
        remappedELtoD++;
      }
    }
  }

  const adherencePct = expectedDutyDays > 0 
    ? (matchedDutyDays / expectedDutyDays) * 100 
    : 100;

  console.log(`✓ Adherence for ${staffId}: ${adherencePct.toFixed(1)}%`, {
    expectedDutyDays,
    matchedDutyDays,
    restPreservedDays,
    absenceDays,
  });

  return {
    staffId,
    staffName,
    expectedDutyDays,
    matchedDutyDays,
    adherencePct,
    remappedELtoD: remappedELtoD > 0 ? remappedELtoD : undefined,
    restPreservedDays,
    absenceDays: absenceDays > 0 ? absenceDays : undefined,
  };
}

/**
 * Calculate pattern adherence for all staff members
 * 
 * @param expansions - Pattern expansions by staff ID
 * @param assignments - All roster assignments
 * @param staffNames - Optional map of staff IDs to names
 * @returns Complete adherence summary
 */
export function calculatePatternAdherence(
  expansions: Map<string, Array<ExpandedPatternDay & { absence?: 'A'; absenceType?: string }>>,
  assignments: Assignment[],
  staffNames?: Map<string, string>
): PatternAdherenceSummary {
  console.log('📊 Calculating pattern adherence for all staff');

  const byStaff: PatternAdherenceMetrics[] = [];
  let totalExpectedDays = 0;
  let totalMatchedDays = 0;
  let totalRestPreserved = 0;
  let totalAbsenceDays = 0;

  for (const [staffId, expandedPattern] of expansions.entries()) {
    const staffName = staffNames?.get(staffId);
    const metrics = calculateStaffAdherence(
      staffId,
      expandedPattern,
      assignments,
      staffName
    );

    byStaff.push(metrics);
    totalExpectedDays += metrics.expectedDutyDays;
    totalMatchedDays += metrics.matchedDutyDays;
    totalRestPreserved += metrics.restPreservedDays || 0;
    totalAbsenceDays += metrics.absenceDays || 0;
  }

  const overallAdherence = totalExpectedDays > 0
    ? (totalMatchedDays / totalExpectedDays) * 100
    : 100;

  console.log('✅ Overall pattern adherence:', {
    overallAdherence: `${overallAdherence.toFixed(1)}%`,
    totalExpectedDays,
    totalMatchedDays,
    totalRestPreserved,
    totalAbsenceDays,
  });

  return {
    byStaff,
    overallAdherence,
    totalExpectedDays,
    totalMatchedDays,
    totalRestPreserved,
    totalAbsenceDays,
  };
}

/**
 * Validate pattern adherence meets minimum threshold
 * 
 * @param summary - Adherence summary
 * @param minAdherencePct - Minimum acceptable adherence percentage (default: 95)
 * @returns Whether adherence meets threshold
 */
export function validatePatternAdherence(
  summary: PatternAdherenceSummary,
  minAdherencePct: number = 95
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check overall adherence
  if (summary.overallAdherence < minAdherencePct) {
    violations.push(
      `Overall adherence ${summary.overallAdherence.toFixed(1)}% below minimum ${minAdherencePct}%`
    );
  }

  // Check individual staff adherence
  for (const staff of summary.byStaff) {
    if (staff.adherencePct < minAdherencePct) {
      violations.push(
        `Staff ${staff.staffName || staff.staffId} adherence ${staff.adherencePct.toFixed(1)}% below minimum`
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
