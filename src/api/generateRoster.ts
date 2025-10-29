/**
 * API wrapper for roster generation
 * 
 * Provides UI-friendly access to the Atlas roster generator
 */

import { generateRoster } from '@/engine/generateRoster';
import type { GenerateRosterInput, RosterAssignment } from '@/engine/generateRoster';

/**
 * Generate a roster for UI consumption
 * 
 * @param params - Generation parameters
 * @returns Promise resolving to generated assignments
 */
export async function apiGenerateRoster(
  params: GenerateRosterInput
): Promise<RosterAssignment[]> {
  try {
    const assignments = await generateRoster(params);
    
    console.info(
      `[API] Roster generated: ${assignments.length} assignments`,
      { params }
    );
    
    return assignments;
  } catch (error) {
    console.error('[API] Roster generation failed:', error);
    throw error;
  }
}

// Re-export types for convenience
export type { GenerateRosterInput, RosterAssignment };
