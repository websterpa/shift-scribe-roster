/**
 * Pattern Offset Distributor
 * 
 * Automatically distributes pattern_offset values among staff sharing the same Shift Pattern
 * to ensure balanced team rotation and prevent staff from always working together.
 */

import { createLogger } from './errorLogger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const logger = createLogger('PatternOffsetDistributor');

export interface StaffForOffsetDistribution {
  id: string;
  pattern_id?: string | null;
  pattern_offset?: number | null;
  first_name?: string;
  last_name?: string;
}

export interface PatternInfo {
  id: string;
  name: string;
  cycle_length: number;
}

/**
 * Automatically distribute pattern offsets among staff sharing the same pattern
 * 
 * @param staff - List of staff members
 * @param supabase - Supabase client
 * @param respectManualOffsets - If true, don't override manually-set offsets (default: true)
 * @returns Updated staff list with distributed offsets
 */
export async function autoDistributePatternOffsets(
  staff: StaffForOffsetDistribution[],
  supabase: SupabaseClient<Database>,
  respectManualOffsets: boolean = true
): Promise<StaffForOffsetDistribution[]> {
  logger.info('Starting auto-distribution of pattern offsets', {
    staffCount: staff.length,
    respectManualOffsets,
  });

  // Group staff by pattern_id
  const staffByPattern = new Map<string, StaffForOffsetDistribution[]>();
  
  staff.forEach(member => {
    if (member.pattern_id) {
      if (!staffByPattern.has(member.pattern_id)) {
        staffByPattern.set(member.pattern_id, []);
      }
      staffByPattern.get(member.pattern_id)!.push(member);
    }
  });

  logger.info(`Grouped staff into ${staffByPattern.size} patterns`);

  // Load pattern info for all unique patterns
  const patternIds = Array.from(staffByPattern.keys());
  const { data: patterns, error } = await supabase
    .from('site_patterns')
    .select('id, name, cycle_length')
    .in('id', patternIds);

  if (error) {
    logger.error('Failed to load patterns', { error });
    throw new Error(`Failed to load patterns: ${error.message}`);
  }

  if (!patterns || patterns.length === 0) {
    logger.warn('No patterns found for distribution');
    return staff;
  }

  const patternMap = new Map<string, PatternInfo>(
    patterns.map(p => [p.id, { id: p.id, name: p.name, cycle_length: p.cycle_length }])
  );

  // Distribute offsets for each pattern group
  const updates: Array<{ id: string; pattern_offset: number }> = [];
  
  for (const [patternId, patternStaff] of staffByPattern.entries()) {
    const pattern = patternMap.get(patternId);
    if (!pattern) {
      logger.warn(`Pattern not found: ${patternId}`);
      continue;
    }

    logger.info(`Distributing offsets for pattern: ${pattern.name}`, {
      patternId,
      cycleLength: pattern.cycle_length,
      staffCount: patternStaff.length,
    });

    // Filter staff who need offset assignment
    const staffNeedingOffset = respectManualOffsets
      ? patternStaff.filter(s => s.pattern_offset == null || s.pattern_offset === 0)
      : patternStaff;

    if (staffNeedingOffset.length === 0) {
      logger.info(`All staff have manual offsets for pattern ${pattern.name}, skipping`);
      continue;
    }

    // Calculate step size for even distribution
    const step = Math.floor(pattern.cycle_length / staffNeedingOffset.length);
    
    logger.info(`Calculated step size: ${step} days`, {
      cycleLength: pattern.cycle_length,
      staffCount: staffNeedingOffset.length,
    });

    // Assign offsets
    staffNeedingOffset.forEach((member, idx) => {
      const newOffset = (idx * step) % pattern.cycle_length;
      member.pattern_offset = newOffset;
      
      updates.push({
        id: member.id,
        pattern_offset: newOffset,
      });

      logger.info(`Assigned offset to ${member.first_name} ${member.last_name}`, {
        staffId: member.id,
        offset: newOffset,
        index: idx,
      });
    });
  }

  // Persist offsets to database
  if (updates.length > 0) {
    logger.info(`Persisting ${updates.length} offset updates to database`);
    
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('staff_profiles')
        .update({ pattern_offset: update.pattern_offset })
        .eq('id', update.id);

      if (updateError) {
        logger.error(`Failed to update offset for staff ${update.id}`, { error: updateError });
      }
    }

    logger.info('✅ Pattern offset distribution complete');
  } else {
    logger.info('No offset updates needed');
  }

  return staff;
}

/**
 * Calculate optimal offset distribution for a given pattern
 * 
 * @param cycleLength - Pattern cycle length
 * @param staffCount - Number of staff to distribute
 * @returns Array of offset values
 */
export function calculateOptimalOffsets(cycleLength: number, staffCount: number): number[] {
  const step = Math.floor(cycleLength / staffCount);
  return Array.from({ length: staffCount }, (_, idx) => (idx * step) % cycleLength);
}

/**
 * Validate that offsets are evenly distributed
 * 
 * @param offsets - Array of offset values
 * @param cycleLength - Pattern cycle length
 * @returns True if offsets are well-distributed
 */
export function validateOffsetDistribution(offsets: number[], cycleLength: number): boolean {
  if (offsets.length === 0) return true;
  
  // Check for duplicates
  const uniqueOffsets = new Set(offsets);
  if (uniqueOffsets.size !== offsets.length) {
    logger.warn('Duplicate offsets detected');
    return false;
  }
  
  // Check that offsets are within valid range
  const allValid = offsets.every(offset => offset >= 0 && offset < cycleLength);
  if (!allValid) {
    logger.warn('Invalid offset values detected');
    return false;
  }
  
  return true;
}
