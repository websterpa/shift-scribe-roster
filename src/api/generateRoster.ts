/**
 * API wrapper for roster generation
 * 
 * Provides UI-friendly access to the Atlas roster generator with validation
 */

import { generateRosterWithChecks } from '@/engine/generateRoster';
import type { 
  GenerateRosterInput, 
  RosterAssignment,
  RosterWithChecks,
  RosterDiagnostics 
} from '@/engine/generateRoster';

/**
 * Generate a roster with WTD validation and diagnostics for UI consumption
 * 
 * @param params - Generation parameters
 * @returns Promise resolving to roster with diagnostics
 */
export async function apiGenerateRoster(
  params: GenerateRosterInput
): Promise<RosterWithChecks> {
  try {
    const result = await generateRosterWithChecks(params);
    
    console.info(
      `[API] Roster generated: ${result.roster.length} assignments`,
      {
        params,
        compliance: result.diagnostics.overallCompliance,
        violations: Object.values(result.diagnostics.restViolations)
          .reduce((sum, v) => sum + v.length, 0)
      }
    );
    
    return result;
  } catch (error) {
    console.error('[API] Roster generation failed:', error);
    throw error;
  }
}

// Re-export types for convenience
export type { 
  GenerateRosterInput, 
  RosterAssignment,
  RosterWithChecks,
  RosterDiagnostics 
};
