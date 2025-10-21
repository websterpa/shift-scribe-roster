/**
 * @deprecated Use `@/features/roster/engine` instead.
 * 
 * This module has been deprecated in favor of the canonical roster engine.
 * All generation logic should use the unified API from @/features/roster/engine.
 * 
 * Migration guide:
 * - Old: import { generateAssignments } from '@/utils/roster/assignmentGenerator'
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

/**
 * @deprecated Legacy assignment generator - use generateCorrectiveRoster from @/features/roster/engine
 */
export function generateAssignments(
  staffList: StaffMember[],
  cycle: Array<{ day: number; staffId: string; shiftCode: string; date: string; otOptions?: any }>,
  config: any,
  leaveMap: any,
  pastWeeksMap: Record<string, number[]>,
  restValidationFn?: any
): Assignment[] {
  console.warn('⚠️ generateAssignments is deprecated. Use @/features/roster/engine instead.');
  
  // This is a compatibility stub - for full functionality, migrate to engine
  throw new Error(
    'generateAssignments is deprecated. Please migrate to @/features/roster/engine. ' +
    'See src/utils/roster/generateAndSaveRoster.ts for example usage.'
  );
}
