/**
 * Pattern-Driven Allocator
 * 
 * Allocates shifts to staff based on their assigned repeating patterns.
 * Supports both 8h (E,L,N,R) and 12h (D,N,R) shift systems.
 * 
 * @module features/roster/engine2/allocators/patternAllocator
 */

import { createLogger } from '@/utils/errorLogger';
import { violatesSameDayDayToNight } from '@/utils/restValidation';
import { isWorkCode } from '@/utils/constraints';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const logger = createLogger('PatternAllocator');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PatternAllocationInput {
  rosterStart: Date;
  rosterEnd: Date;
  staff: StaffMemberForPattern[];
  supabase: SupabaseClient<Database>;
}

export interface StaffMemberForPattern {
  id: string;
  pattern_id?: string | null;
  pattern_offset?: number;
  opted_out_wtd?: boolean;
  wtd_opt_out?: boolean;
  first_name?: string;
  last_name?: string;
}

export interface PatternAssignment {
  staff_id: string;
  date: Date;
  shift_code: string;
}

interface LoadedPattern {
  id: string;
  sequence: string[];
  cycle_length: number;
  system: string;
}

// ============================================================================
// PATTERN ALLOCATION
// ============================================================================

/**
 * Allocate shifts to staff based on their assigned patterns
 * 
 * @param input - Roster period, staff list, and database client
 * @returns Array of pattern-based shift assignments
 */
export async function patternAllocator(
  input: PatternAllocationInput
): Promise<PatternAssignment[]> {
  const { rosterStart, rosterEnd, staff, supabase } = input;
  
  logger.info('Starting pattern allocation', {
    rosterStart: rosterStart.toISOString(),
    rosterEnd: rosterEnd.toISOString(),
    staffCount: staff.length,
  });

  const assignments: PatternAssignment[] = [];
  const staffWithPatterns = staff.filter(s => s.pattern_id);

  if (staffWithPatterns.length === 0) {
    logger.warn('No staff members have assigned patterns');
    return assignments;
  }

  // Load all unique patterns
  const patternIds = [...new Set(staffWithPatterns.map(s => s.pattern_id!))];
  const patterns = await loadPatterns(supabase, patternIds);

  logger.info('Loaded patterns', { 
    patternCount: patterns.length,
    patternIds,
    patterns: patterns.map(p => ({
      id: p.id,
      system: p.system,
      sequenceLength: p.sequence.length,
      sequence: p.sequence.join(','),
    })),
  });

  // Generate assignments for each staff member
  for (const member of staffWithPatterns) {
    const pattern = patterns.find(p => p.id === member.pattern_id);
    if (!pattern) {
      logger.warn('Pattern not found for staff', { 
        staffId: member.id, 
        patternId: member.pattern_id,
      });
      continue;
    }

    const staffAssignments = generateStaffAssignments({
      member,
      pattern,
      rosterStart,
      rosterEnd,
    });

    assignments.push(...staffAssignments);
  }

  console.info(
    `[PatternAllocator] Generated ${assignments.length} pattern-based assignments for ${staffWithPatterns.length} staff`
  );

  return assignments;
}

// ============================================================================
// PATTERN LOADING
// ============================================================================

/**
 * Load patterns from database
 */
async function loadPatterns(
  supabase: SupabaseClient<Database>,
  patternIds: string[]
): Promise<LoadedPattern[]> {
  const { data, error } = await supabase
    .from('site_patterns')
    .select('id, sequence, cycle_length, system')
    .in('id', patternIds);

  if (error) {
    logger.error('Failed to load patterns', { error });
    throw new Error(`Failed to load patterns: ${error.message}`);
  }

  if (!data || data.length === 0) {
    logger.warn('No patterns found for given IDs', { patternIds });
    return [];
  }

  return data.map(p => ({
    id: p.id,
    sequence: Array.isArray(p.sequence) 
      ? p.sequence.filter((s): s is string => typeof s === 'string')
      : [],
    cycle_length: p.cycle_length || 17,
    system: p.system || '8h',
  }));
}

// ============================================================================
// STAFF ASSIGNMENT GENERATION
// ============================================================================

interface GenerateStaffAssignmentsInput {
  member: StaffMemberForPattern;
  pattern: LoadedPattern;
  rosterStart: Date;
  rosterEnd: Date;
}

/**
 * Generate shift assignments for a single staff member
 */
function generateStaffAssignments(
  input: GenerateStaffAssignmentsInput
): PatternAssignment[] {
  const { member, pattern, rosterStart, rosterEnd } = input;
  const assignments: PatternAssignment[] = [];

  if (!pattern.sequence || pattern.sequence.length === 0) {
    logger.warn('Empty pattern sequence', { 
      staffId: member.id, 
      patternId: pattern.id,
    });
    return assignments;
  }

  const seq = pattern.sequence;
  const cycle = pattern.cycle_length || seq.length;
  const offset = member.pattern_offset || 0;
  const totalDays = Math.floor(
    (rosterEnd.getTime() - rosterStart.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  // Check if WTD validation is required
  const requiresWTDValidation = !(member.opted_out_wtd ?? member.wtd_opt_out ?? false);

  let prevDateISO: string | null = null;
  let prevCode: string | null = null;

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(rosterStart);
    date.setDate(date.getDate() + i);
    const dateISO = date.toISOString().split('T')[0];

    // Calculate position in pattern cycle (accounting for offset)
    const patternIndex = (i + offset) % cycle;
    const shiftCode = seq[patternIndex];

    // Skip rest days
    if (shiftCode === 'R' || !isWorkCode(shiftCode as any)) {
      prevDateISO = dateISO;
      prevCode = shiftCode;
      continue;
    }

    // WTD validation: check same-day Day→Night ban
    if (requiresWTDValidation) {
      if (violatesSameDayDayToNight(prevDateISO, prevCode as any, dateISO, shiftCode as any)) {
        logger.warn('WTD violation detected, skipping assignment', {
          staffId: member.id,
          date: dateISO,
          prevCode,
          nextCode: shiftCode,
          staffName: `${member.first_name} ${member.last_name}`.trim(),
        });
        prevDateISO = dateISO;
        prevCode = 'R'; // Mark as rest to avoid cascade violations
        continue;
      }
    }

    assignments.push({
      staff_id: member.id,
      date,
      shift_code: shiftCode,
    });

    prevDateISO = dateISO;
    prevCode = shiftCode;
  }

  logger.info('Generated assignments for staff', {
    staffId: member.id,
    staffName: `${member.first_name} ${member.last_name}`.trim() || 'Unknown',
    assignmentCount: assignments.length,
    totalDays,
    patternLength: seq.length,
    patternOffset: offset,
    patternCycle: cycle,
    patternSequence: seq.join(','),
    assignedShifts: assignments.map(a => a.shift_code).join(','),
  });

  // Log offset application for diagnostics
  if (offset > 0) {
    console.info(`[PatternAllocator] Auto-offset applied: ${offset} days for ${member.first_name} ${member.last_name}`);
  }

  return assignments;
}
