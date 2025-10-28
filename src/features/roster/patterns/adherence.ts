/**
 * Pattern adherence diagnostics
 * Validates that generated rosters match staff patterns and calculates compliance metrics
 */

import { supabase } from '@/integrations/supabase/client';
import { differenceInCalendarDays } from 'date-fns';
import type { ShiftCode, PatternTemplate, StaffPatternBinding } from './types';

export interface StaffAdherenceMetrics {
  staffId: string;
  staffName: string;
  totalDays: number;
  matchingDays: number;
  deviations: number;
  adherencePercent: number;
  expectedPattern: string[]; // Pattern sequence
  deviationDetails: Array<{
    date: string;
    expected: ShiftCode;
    actual: ShiftCode;
  }>;
}

export interface PatternAdherenceSummary {
  overallAdherence: number;
  totalStaff: number;
  fullyCompliant: number; // 100% adherence
  mostlyCompliant: number; // >= 90% adherence
  partiallyCompliant: number; // >= 70% adherence
  nonCompliant: number; // < 70% adherence
  staffMetrics: StaffAdherenceMetrics[];
  generatedAt: string;
}

/**
 * Calculate pattern adherence for a roster
 * Compares actual assignments against expected pattern expansion
 * 
 * @param versionId - Roster version to analyze
 * @param startDate - Start of roster period (YYYY-MM-DD)
 * @param endDate - End of roster period (YYYY-MM-DD)
 * @returns Pattern adherence metrics
 */
export async function calculatePatternAdherence(
  versionId: string,
  startDate: string,
  endDate: string
): Promise<PatternAdherenceSummary> {
  console.log('📊 Calculating pattern adherence for version:', versionId);

  // Fetch actual assignments
  const { data: assignments, error: assignError } = await supabase
    .from('roster_assignments')
    .select('staff_id, date, shift_code')
    .eq('version_id', versionId);

  if (assignError || !assignments) {
    throw new Error(`Failed to fetch assignments: ${assignError?.message}`);
  }

  // Get unique staff IDs
  const staffIds = Array.from(new Set(assignments.map(a => a.staff_id)));

  // Fetch staff patterns and bindings
  const { data: staffProfiles } = await supabase
    .from('staff_profiles')
    .select('id, first_name, last_name, name, pattern_id, pattern_offset')
    .in('id', staffIds);

  if (!staffProfiles || staffProfiles.length === 0) {
    console.warn('No staff profiles found for adherence calculation');
    return createEmptySummary();
  }

  const staffMetrics: StaffAdherenceMetrics[] = [];

  // Calculate metrics for each staff member
  for (const staff of staffProfiles) {
    if (!staff.pattern_id) {
      console.warn(`Staff ${staff.id} has no pattern - skipping adherence check`);
      continue;
    }

    // Fetch pattern template
    const { data: pattern } = await supabase
      .from('site_patterns')
      .select('id, name, sequence, system')
      .eq('id', staff.pattern_id)
      .maybeSingle();

    if (!pattern || !pattern.sequence) {
      console.warn(`Pattern ${staff.pattern_id} not found or has no sequence`);
      continue;
    }

    // Calculate expected vs actual
    const staffName = staff.name || `${staff.first_name} ${staff.last_name}`;
    const patternSequence = (Array.isArray(pattern.sequence) 
      ? pattern.sequence.filter((s): s is string => typeof s === 'string')
      : []) as string[];
    const patternOffset = staff.pattern_offset ?? 0;
    const staffAssignments = assignments.filter(a => a.staff_id === staff.id);

    const deviations: Array<{ date: string; expected: ShiftCode; actual: ShiftCode }> = [];
    let matchingDays = 0;
    let totalDays = 0;

    // Compare each assignment against expected pattern
    for (const assignment of staffAssignments) {
      totalDays++;
      
      // Calculate expected shift code from pattern
      const dateObj = new Date(assignment.date);
      const anchor = new Date(startDate);
      const daysSinceStart = differenceInCalendarDays(dateObj, anchor);
      const patternIndex = (daysSinceStart + patternOffset) % patternSequence.length;
      const expectedCode = patternSequence[patternIndex] as ShiftCode;
      const actualCode = assignment.shift_code as ShiftCode;

      if (expectedCode === actualCode) {
        matchingDays++;
      } else {
        deviations.push({
          date: assignment.date,
          expected: expectedCode,
          actual: actualCode,
        });
      }
    }

    const adherencePercent = totalDays > 0 ? (matchingDays / totalDays) * 100 : 0;

    staffMetrics.push({
      staffId: staff.id,
      staffName,
      totalDays,
      matchingDays,
      deviations: deviations.length,
      adherencePercent,
      expectedPattern: patternSequence,
      deviationDetails: deviations.slice(0, 10), // Limit to first 10 for performance
    });
  }

  // Calculate summary statistics
  const fullyCompliant = staffMetrics.filter(m => m.adherencePercent === 100).length;
  const mostlyCompliant = staffMetrics.filter(m => m.adherencePercent >= 90 && m.adherencePercent < 100).length;
  const partiallyCompliant = staffMetrics.filter(m => m.adherencePercent >= 70 && m.adherencePercent < 90).length;
  const nonCompliant = staffMetrics.filter(m => m.adherencePercent < 70).length;

  const overallAdherence = staffMetrics.length > 0
    ? staffMetrics.reduce((sum, m) => sum + m.adherencePercent, 0) / staffMetrics.length
    : 0;

  console.log('✅ Pattern adherence calculated:', {
    overallAdherence: `${overallAdherence.toFixed(1)}%`,
    fullyCompliant,
    totalStaff: staffMetrics.length,
  });

  return {
    overallAdherence,
    totalStaff: staffMetrics.length,
    fullyCompliant,
    mostlyCompliant,
    partiallyCompliant,
    nonCompliant,
    staffMetrics,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Create empty summary for cases with no data
 */
function createEmptySummary(): PatternAdherenceSummary {
  return {
    overallAdherence: 0,
    totalStaff: 0,
    fullyCompliant: 0,
    mostlyCompliant: 0,
    partiallyCompliant: 0,
    nonCompliant: 0,
    staffMetrics: [],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validate pattern adherence thresholds
 * Returns pass/fail based on compliance targets
 */
export function validatePatternAdherence(
  summary: PatternAdherenceSummary,
  thresholds: {
    minOverallAdherence?: number; // Default: 95%
    maxNonCompliantStaff?: number; // Default: 0
  } = {}
): { passed: boolean; issues: string[] } {
  const {
    minOverallAdherence = 95,
    maxNonCompliantStaff = 0,
  } = thresholds;

  const issues: string[] = [];

  if (summary.overallAdherence < minOverallAdherence) {
    issues.push(
      `Overall adherence ${summary.overallAdherence.toFixed(1)}% is below threshold ${minOverallAdherence}%`
    );
  }

  if (summary.nonCompliant > maxNonCompliantStaff) {
    issues.push(
      `${summary.nonCompliant} staff members have less than 70% adherence (max allowed: ${maxNonCompliantStaff})`
    );
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
