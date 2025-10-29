/**
 * This file serves as a redirector for backward compatibility.
 * All functionality has been moved to the services layer.
 */

import { createLogger } from "./errorLogger";

const logger = createLogger('EnhancedRosterCalculations');
logger.info('Using refactored roster calculation utilities');

// Re-export functionality from services layer
export { 
  generateRoster,
  getDefaultRatePolicy,
  getDefaultRestRules,
  getDefaultGeneratorConfig
} from "@/services/roster/helpers/rosterGeneration";

export {
  generateAndSaveRoster
} from "@/services/roster/generation";

export {
  fetchStaffMembers
} from "@/services/roster/helpers";

// Types are now exported from types/roster.ts
export type {
  StaffMember, 
  RosterConfig, 
  Assignment 
} from "@/types/roster";
