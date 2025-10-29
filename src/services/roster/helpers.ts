/**
 * COMPATIBILITY ADAPTERS
 * 
 * Thin wrappers to maintain backward compatibility while we transition
 * to the new services layer architecture. Canonical versions now live
 * in src/services/roster/helpers/* subdirectory.
 * 
 * @module services/roster/helpers
 */

// ============================================================================
// MIGRATED HELPERS - Now in services/roster/helpers/
// ============================================================================

export * from './helpers/index';

// ============================================================================
// REMAINING UTILS (Not yet migrated)
// ============================================================================

// TODO: Phase 2c - migrate these helpers from utils/roster
export { 
  fetchStaffMembers 
} from '@/utils/roster/staffHelpers';

export { 
  generateEnhancedRosterCycle,
  validateEnhancedCycle,
  type CycleValidationResult 
} from '@/utils/roster/enhancedCycleIntegration';

export { 
  generateShiftCycle,
  validateShiftCycle 
} from '@/utils/roster/shiftCycleGenerator';

export { 
  generateRoster,
  getDefaultRatePolicy,
  getDefaultRestRules,
  getDefaultGeneratorConfig 
} from '@/utils/roster/rosterGeneration';

export { 
  normalizeShiftCode 
} from '@/utils/roster/normalizeShift';
