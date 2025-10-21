/**
 * @deprecated Use `@/features/roster/engine` instead.
 * 
 * This module has been deprecated in favor of the canonical roster engine.
 * All generation logic should use the unified API from @/features/roster/engine.
 * 
 * Migration guide:
 * - Old: import { generateRosterEnhanced } from '@/utils/roster/enhancedRosterGenerator'
 * - New: import { generateCorrectiveRoster } from '@/features/roster/engine'
 * 
 * The new engine provides:
 * - Unified generation API
 * - Better WTD compliance
 * - Consistent costing
 * - Improved rest validation
 */

import { generateCorrectiveRoster } from '@/features/roster/engine';
import type { StaffMember, Assignment } from "@/types/roster";

export interface GeneratorInput {
  system: "8h" | "12h";
  versionId: string;
  staff: StaffMember[];
  requirementsByDay: Record<number, Record<string, number>>;
  startDate: string;
  siteStartHH?: number;
  allowSupervisorNights?: boolean;
  includeNights?: boolean;
  patternTokens?: string[];
}

export interface GeneratorResult {
  assignments: Assignment[];
  nightsGenerated: number;
}

/**
 * @deprecated Legacy enhanced generator - use generateCorrectiveRoster from @/features/roster/engine
 */
export function generateRosterEnhanced(input: GeneratorInput): GeneratorResult {
  console.warn('⚠️ generateRosterEnhanced is deprecated. Use @/features/roster/engine instead.');
  
  // This is a compatibility stub - for full functionality, migrate to engine
  throw new Error(
    'generateRosterEnhanced is deprecated. Please migrate to @/features/roster/engine. ' +
    'See src/utils/roster/generateAndSaveRoster.ts for example usage.'
  );
}
