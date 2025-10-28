/**
 * Expand a staff member's repeating pattern across the roster horizon
 * Respects pattern offset to determine starting position in the sequence
 */

import { addDays, differenceInDays } from 'date-fns';

export interface StaffPatternExpansion {
  staffId: string;
  staffName: string;
  pattern: string[]; // e.g. ['E', 'E', 'L', 'L', 'N', 'N', 'R', 'R']
  patternOffset: number; // Starting index in the pattern
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface ExpandedAssignment {
  date: string; // YYYY-MM-DD
  staffId: string;
  shiftCode: string; // E, L, N, D, R
  dayInPattern: number; // Which day in the repeating cycle (0-indexed)
}

/**
 * Expand a single staff member's pattern across the roster horizon
 * 
 * @param expansion - Staff pattern expansion configuration
 * @returns Array of daily assignments for this staff member
 */
export function expandPatternForStaff(
  expansion: StaffPatternExpansion
): ExpandedAssignment[] {
  console.log(`🔄 Expanding pattern for staff ${expansion.staffName}:`, {
    pattern: expansion.pattern,
    offset: expansion.patternOffset,
    dateRange: `${expansion.startDate} to ${expansion.endDate}`
  });

  if (!expansion.pattern || expansion.pattern.length === 0) {
    console.warn(`⚠️ Staff ${expansion.staffName} has empty pattern`);
    return [];
  }

  const assignments: ExpandedAssignment[] = [];
  const patternLength = expansion.pattern.length;
  const start = new Date(expansion.startDate);
  const end = new Date(expansion.endDate);
  const totalDays = differenceInDays(end, start) + 1;

  console.log(`📅 Generating ${totalDays} days of assignments`);

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const currentDate = addDays(start, dayIndex);
    
    // Calculate position in pattern accounting for offset
    const patternIndex = (dayIndex + expansion.patternOffset) % patternLength;
    const shiftCode = expansion.pattern[patternIndex];

    assignments.push({
      date: currentDate.toISOString().split('T')[0],
      staffId: expansion.staffId,
      shiftCode,
      dayInPattern: patternIndex
    });
  }

  // Log summary
  const shiftCounts = assignments.reduce((acc, a) => {
    acc[a.shiftCode] = (acc[a.shiftCode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`✅ Generated ${assignments.length} assignments:`, shiftCounts);

  return assignments;
}

/**
 * Batch expand patterns for multiple staff members
 * 
 * @param expansions - Array of staff pattern expansions
 * @returns Combined array of all assignments
 */
export function expandPatternsForTeam(
  expansions: StaffPatternExpansion[]
): ExpandedAssignment[] {
  console.log(`🎯 Batch expanding patterns for ${expansions.length} staff members`);
  
  const allAssignments: ExpandedAssignment[] = [];
  
  for (const expansion of expansions) {
    const staffAssignments = expandPatternForStaff(expansion);
    allAssignments.push(...staffAssignments);
  }
  
  console.log(`✅ Total assignments generated: ${allAssignments.length}`);
  
  return allAssignments;
}

/**
 * Validate that a pattern is suitable for roster generation
 * 
 * @param pattern - Pattern sequence to validate
 * @returns Validation result with any issues
 */
export function validatePattern(pattern: string[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!pattern || pattern.length === 0) {
    issues.push('Pattern is empty');
  }
  
  if (pattern.length > 365) {
    issues.push('Pattern is too long (max 365 days)');
  }
  
  // Check for valid shift codes
  const validCodes = ['E', 'L', 'N', 'D', 'R', 'S', 'A'];
  const invalidCodes = pattern.filter(code => !validCodes.includes(code));
  
  if (invalidCodes.length > 0) {
    issues.push(`Invalid shift codes: ${invalidCodes.join(', ')}`);
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
