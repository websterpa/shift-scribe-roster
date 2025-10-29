
/**
 * This file serves as a redirector for backward compatibility.
 * All functionality has been moved to more focused utility files.
 */

import { createLogger } from "./errorLogger";

const logger = createLogger('EnhancedRosterCalculations');
logger.info('Using refactored roster calculation utilities');

// Re-export functionality from new utility files
export { 
  generateRoster,
  getDefaultRatePolicy,
  getDefaultRestRules,
  getDefaultGeneratorConfig
} from "./roster/rosterGeneration";

export {
  generateAndSaveRoster
} from "@/services/roster/generation";

export {
  saveRosterVersion,
  generateRosterAssignments
} from "./roster/rosterHelpers";

export {
  fetchStaffMembers
} from "@/services/roster/helpers";

// Types are now exported from types/roster.ts
export type {
  StaffMember, 
  RosterConfig, 
  Assignment 
} from "@/types/roster";
