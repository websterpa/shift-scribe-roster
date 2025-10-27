/**
 * @deprecated COMPATIBILITY STUB for tests only
 * 
 * This file has been deleted. Tests importing from here should be updated to use:
 * - @/features/roster/engine for production code  
 * - @/utils/roster/rosterGeneration for schema-based generation (test infrastructure)
 */

/**
 * @deprecated This stub exists for test compatibility only
 */
export function generateAssignments(..._args: any[]): any[] {
  throw new Error(
    'generateAssignments is deprecated and removed. ' +
    'Tests should be updated to use generateCorrectiveRoster from @/features/roster/engine or ' +
    'generateRoster from @/utils/roster/rosterGeneration for schema-based testing.'
  );
}
