/**
 * @deprecated COMPATIBILITY STUB for tests only
 * 
 * This file has been deleted. Tests importing from here should be updated to use:
 * - @/features/roster/engine for production code
 * - @/utils/roster/rosterGeneration for schema-based generation (test infrastructure)
 */

export interface GeneratorInput {
  system: "8h" | "12h";
  versionId: string;
  staff: any[];
  requirementsByDay: Record<number, Record<string, number>>;
  startDate: string;
  siteStartHH?: number;
  allowSupervisorNights?: boolean;
  includeNights?: boolean;
  patternTokens?: string[];
}

export interface GeneratorResult {
  assignments: any[];
  nightsGenerated: number;
}

/**
 * @deprecated This stub exists for test compatibility only
 */
export function generateRosterEnhanced(_input: GeneratorInput): GeneratorResult {
  throw new Error(
    'generateRosterEnhanced is deprecated and removed. ' +
    'Tests should be updated to use generateCorrectiveRoster from @/features/roster/engine or ' +
    'generateRoster from @/utils/roster/rosterGeneration for schema-based testing.'
  );
}
