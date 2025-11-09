/**
 * Team Index Assignment Module
 * 
 * Automatically assigns team_index to staff members for deterministic pattern positioning.
 * Staff are distributed evenly across teams (0 to teams_required-1) based on surname.
 */

import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('TeamIndexAssignment');

export interface StaffWithTeamIndex {
  id: string;
  first_name: string;
  last_name: string;
  team_index: number | null;
}

/**
 * Auto-assign team_index to staff who don't have one
 * Distributes staff evenly across teams based on surname alphabetical order
 */
export async function ensureTeamIndices(
  staffList: StaffWithTeamIndex[],
  teamsRequired: number
): Promise<Map<string, number>> {
  console.log('[TeamIndex] Ensuring team indices for staff members', {
    totalStaff: staffList.length,
    teamsRequired
  });

  const assignments = new Map<string, number>();
  const staffNeedingAssignment: StaffWithTeamIndex[] = [];

  // Collect staff who need team_index assigned
  for (const staff of staffList) {
    if (staff.team_index === null || staff.team_index === undefined) {
      staffNeedingAssignment.push(staff);
    } else {
      assignments.set(staff.id, staff.team_index);
    }
  }

  if (staffNeedingAssignment.length === 0) {
    console.log('[TeamIndex] All staff already have team_index assigned');
    staffList.forEach(s => {
      if (s.team_index !== null && s.team_index !== undefined) {
        assignments.set(s.id, s.team_index);
      }
    });
    return assignments;
  }

  console.log(`[TeamIndex] Assigning team_index to ${staffNeedingAssignment.length} staff members`);

  // Sort by last name for consistent assignment
  const sorted = [...staffNeedingAssignment].sort((a, b) => {
    const lastNameA = (a.last_name || '').toLowerCase();
    const lastNameB = (b.last_name || '').toLowerCase();
    return lastNameA.localeCompare(lastNameB);
  });

  // Assign team indices evenly
  const updates: Array<{ id: string; team_index: number }> = [];
  
  sorted.forEach((staff, idx) => {
    const teamIndex = idx % teamsRequired;
    assignments.set(staff.id, teamIndex);
    updates.push({ id: staff.id, team_index: teamIndex });
  });

  // Persist to database
  if (updates.length > 0) {
    try {
      console.log('[TeamIndex] Persisting team_index assignments to database', {
        count: updates.length
      });

      // Use individual updates to avoid RLS issues
      for (const update of updates) {
        const { error } = await supabase
          .from('staff_profiles')
          .update({ team_index: update.team_index })
          .eq('id', update.id);

        if (error) {
          logger.warn('[TeamIndex] Failed to update team_index for staff', {
            staffId: update.id,
            error
          });
        }
      }

      console.log('[TeamIndex] ✅ Team indices persisted successfully');
    } catch (error) {
      logger.error('[TeamIndex] Failed to persist team indices', { error });
      // Continue with in-memory assignments even if persistence fails
    }
  }

  // Include existing assignments
  staffList.forEach(s => {
    if (s.team_index !== null && s.team_index !== undefined && !assignments.has(s.id)) {
      assignments.set(s.id, s.team_index);
    }
  });

  console.log('[TeamIndex] Team index distribution:', {
    total: assignments.size,
    byTeam: Array.from({ length: teamsRequired }, (_, i) => 
      Array.from(assignments.values()).filter(ti => ti === i).length
    )
  });

  return assignments;
}

/**
 * Calculate expected shift token for a staff member on a given day
 * 
 * Formula:
 * - anchorOffset = daysBetween(cycle_anchor_date, day) % cycle_length
 * - staffStart = floor((team_index / teams_required) * cycle_length)
 * - idx = (anchorOffset + staffStart) % cycle_length
 * - expected = sequence[idx]
 */
export function calculateExpectedToken(
  date: Date,
  cycleAnchorDate: Date,
  teamIndex: number,
  teamsRequired: number,
  sequence: string[],
  framework: '8h' | '12h'
): string {
  const cycleLength = sequence.length;
  
  // Calculate days between anchor and target date
  const daysBetween = Math.floor(
    (date.getTime() - cycleAnchorDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Anchor offset (position in cycle for this date)
  const anchorOffset = ((daysBetween % cycleLength) + cycleLength) % cycleLength;
  
  // Staff starting position in cycle
  const staffStart = Math.floor((teamIndex / teamsRequired) * cycleLength);
  
  // Final index in sequence
  const idx = (anchorOffset + staffStart) % cycleLength;
  
  // Get expected token
  let token = sequence[idx];
  
  // Remap for 12h framework
  if (framework === '12h' && (token === 'E' || token === 'L')) {
    console.log(`[TeamIndex] Remapping ${token} → D for 12h framework`);
    token = 'D';
  }
  
  return token;
}

/**
 * Get or default cycle anchor date
 * If not specified in config, defaults to start date of the roster period
 */
export function getCycleAnchorDate(
  config: { cycle_anchor_date?: string | null; start_date: string }
): Date {
  if (config.cycle_anchor_date) {
    return new Date(config.cycle_anchor_date);
  }
  
  // Default to start date
  const anchorDate = new Date(config.start_date);
  console.log('[TeamIndex] Using start_date as cycle_anchor_date:', config.start_date);
  return anchorDate;
}
