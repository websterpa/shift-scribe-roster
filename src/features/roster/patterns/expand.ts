/**
 * Pattern expansion - generate daily shift codes across a date range
 * Uses staff member's personal start date to anchor the pattern cycle
 */

import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import type { PatternTemplate, StaffPatternBinding, ExpandedPatternDay, ShiftCode } from './types';

/**
 * Expand a staff member's pattern across a date range
 * 
 * @param template - The pattern template to expand
 * @param binding - Staff pattern binding with start date anchor
 * @param rosterStartDate - Start of roster period (YYYY-MM-DD)
 * @param rosterEndDate - End of roster period (YYYY-MM-DD, exclusive)
 * @returns Array of daily shift assignments
 */
export function expandPattern(
  template: PatternTemplate,
  binding: StaffPatternBinding,
  rosterStartDate: string,
  rosterEndDate: string
): ExpandedPatternDay[] {
  console.log('📅 Expanding pattern:', {
    patternName: template.pattern_name,
    patternLength: template.pattern_length,
    staffId: binding.staff_id,
    startAnchor: binding.pattern_start_date,
    rosterRange: `${rosterStartDate} to ${rosterEndDate}`,
  });

  // Validate inputs
  if (template.pattern_sequence.length === 0) {
    console.error('❌ Cannot expand empty pattern sequence');
    throw new Error(`Pattern ${template.id} has empty sequence`);
  }

  if (template.pattern_sequence.length !== template.pattern_length) {
    console.error('❌ Pattern length mismatch:', {
      expected: template.pattern_length,
      actual: template.pattern_sequence.length,
    });
    throw new Error(`Pattern ${template.id} length mismatch`);
  }

  const patternStart = parseISO(binding.pattern_start_date);
  const rosterStart = parseISO(rosterStartDate);
  const rosterEnd = parseISO(rosterEndDate);

  // Calculate how many days from pattern start to roster start
  const daysFromPatternStart = differenceInCalendarDays(rosterStart, patternStart);
  
  // Find starting position in pattern cycle (handle negative offsets)
  const patternLength = template.pattern_sequence.length;
  let startIndex = daysFromPatternStart % patternLength;
  if (startIndex < 0) {
    startIndex += patternLength; // Handle dates before pattern start
  }

  console.log('🔢 Pattern alignment:', {
    daysFromPatternStart,
    startIndex,
    patternLength,
  });

  // Generate daily entries
  const expanded: ExpandedPatternDay[] = [];
  let currentDate = rosterStart;
  let patternIndex = startIndex;

  while (currentDate < rosterEnd) {
    const shiftCode = template.pattern_sequence[patternIndex];
    
    expanded.push({
      date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD
      shift_code: shiftCode,
      is_rest: shiftCode === 'R',
    });

    // Advance to next day
    currentDate = addDays(currentDate, 1);
    patternIndex = (patternIndex + 1) % patternLength;
  }

  console.log(`✅ Expanded ${expanded.length} days for pattern ${template.pattern_name}`);
  
  return expanded;
}

/**
 * Expand patterns for multiple staff members in batch
 * Useful for roster generation across a team
 */
export function expandPatternsBatch(
  resolutions: Map<string, { template: PatternTemplate; binding: StaffPatternBinding }>,
  rosterStartDate: string,
  rosterEndDate: string
): Map<string, ExpandedPatternDay[]> {
  console.log(`📅 Batch expanding patterns for ${resolutions.size} staff members`);
  
  const results = new Map<string, ExpandedPatternDay[]>();

  for (const [staffId, { template, binding }] of resolutions.entries()) {
    try {
      const expanded = expandPattern(template, binding, rosterStartDate, rosterEndDate);
      results.set(staffId, expanded);
    } catch (err) {
      console.error(`❌ Failed to expand pattern for staff ${staffId}:`, err);
      // Continue with other staff members
    }
  }

  console.log(`✅ Successfully expanded patterns for ${results.size}/${resolutions.size} staff`);
  return results;
}

/**
 * Get shift code for a specific date (useful for single-day lookups)
 */
export function getShiftCodeForDate(
  template: PatternTemplate,
  binding: StaffPatternBinding,
  targetDate: string
): ShiftCode {
  const patternStart = parseISO(binding.pattern_start_date);
  const target = parseISO(targetDate);
  
  const daysFromStart = differenceInCalendarDays(target, patternStart);
  const patternLength = template.pattern_sequence.length;
  
  let index = daysFromStart % patternLength;
  if (index < 0) {
    index += patternLength;
  }
  
  return template.pattern_sequence[index];
}
