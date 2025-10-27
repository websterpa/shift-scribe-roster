/**
 * Pattern expansion - generate daily shift codes across a date range
 * Uses staff member's personal start date to anchor the pattern cycle
 */

import { addDays, differenceInCalendarDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import type { PatternTemplate, StaffPatternBinding, ExpandedPatternDay, ShiftCode } from './types';

const VALID_SHIFT_CODES: ShiftCode[] = ['D', 'N', 'E', 'L', 'R'];

/**
 * Expand a staff member's pattern across a date range
 * 
 * @param template - The pattern template to expand
 * @param binding - Staff pattern binding with start date anchor
 * @param startDateISO - Start of roster period (YYYY-MM-DD)
 * @param endDateISO - End of roster period (YYYY-MM-DD, inclusive)
 * @returns Array of daily shift assignments
 */
export function expandPatternOverRange(
  template: PatternTemplate,
  binding: StaffPatternBinding,
  startDateISO: string,
  endDateISO: string
): ExpandedPatternDay[] {
  console.log('📅 Expanding pattern:', {
    patternName: template.pattern_name,
    patternLength: template.pattern_length,
    staffId: binding.staff_id,
    startAnchor: binding.pattern_start_date,
    rosterRange: `${startDateISO} to ${endDateISO}`,
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

  const out: ExpandedPatternDay[] = [];
  const start = new Date(startDateISO);
  const end = new Date(endDateISO);
  const anchor = new Date(binding.pattern_start_date);
  
  let invalidCodesFound = false;
  const invalidCodes = new Set<string>();

  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const offset = differenceInCalendarDays(d, anchor);
    const idx = ((offset % template.pattern_length) + template.pattern_length) % template.pattern_length;
    const code = template.pattern_sequence[idx] as ShiftCode;
    
    // Validate shift code
    if (!VALID_SHIFT_CODES.includes(code)) {
      console.error('❌ Invalid shift code in pattern:', code);
      invalidCodesFound = true;
      invalidCodes.add(code);
      continue; // Skip this day
    }
    
    out.push({ 
      date: d.toISOString().slice(0, 10), 
      shift_code: code, 
      is_rest: code === 'R' 
    });
  }

  // Show toast if invalid codes were found
  if (invalidCodesFound) {
    toast({
      title: "Invalid Shift Codes",
      description: `Pattern "${template.pattern_name}" contains invalid codes: ${Array.from(invalidCodes).join(', ')}. Valid codes: ${VALID_SHIFT_CODES.join(', ')}`,
      variant: "destructive",
    });
  }

  // Validate output length
  const expectedDays = differenceInCalendarDays(end, start) + 1;
  console.log('🔢 Pattern expansion result:', {
    expectedDays,
    actualDays: out.length,
    skippedDays: expectedDays - out.length,
  });

  console.log(`✅ Expanded ${out.length} days for pattern ${template.pattern_name}`);
  
  return out;
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
      const expanded = expandPatternOverRange(template, binding, rosterStartDate, rosterEndDate);
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
  const anchor = new Date(binding.pattern_start_date);
  const target = new Date(targetDate);
  
  const offset = differenceInCalendarDays(target, anchor);
  const idx = ((offset % template.pattern_length) + template.pattern_length) % template.pattern_length;
  
  return template.pattern_sequence[idx];
}
