
/**
 * This file serves as a redirector for backward compatibility.
 * All functionality has been moved to more focused utility files.
 */

import { createLogger } from "./errorLogger";

const logger = createLogger('EnhancedRosterCalculations');
logger.info('Using refactored roster calculation utilities');

// Re-export functionality from new utility files
export { 
  generateAndSaveRoster,
  generateRosterAssignments,
  saveRosterVersion
} from "./roster/rosterGeneration";

export {
  fetchStaffMembers
} from "./roster/staffHelpers";

// Types are now exported from types/roster.ts
export type { 
  StaffMember, 
  RosterConfig, 
  Assignment 
} from "@/types/roster";
