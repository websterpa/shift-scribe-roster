/**
 * COMPATIBILITY ADAPTERS
 * 
 * Thin wrappers around src/utils/roster/* helpers to maintain backward compatibility
 * while we transition to the new services layer architecture.
 * 
 * TODO: Phase 2b - Migrate these helpers into services/roster/helpers with proper
 * domain separation and type safety improvements.
 * 
 * @module services/roster/helpers
 */

// ============================================================================
// STAFFING CALCULATION & VALIDATION
// ============================================================================

// TODO: migrate helper to services/roster/helpers in Phase 2b
export { 
  calculateOptimalStaffing,
  validateStaffingAgainstRequirements,
  type StaffingRecommendation 
} from '@/utils/roster/staffingCalculator';

// TODO: migrate helper to services/roster/helpers in Phase 2b
export { 
  type StaffingValidationReport 
} from '@/utils/roster/staffingValidation';

// ============================================================================
// STAFF DATA ACCESS
// ============================================================================

// TODO: migrate helper to services/roster/helpers in Phase 2b
export { 
  fetchStaffMembers 
} from '@/utils/roster/staffHelpers';

// ============================================================================
// CYCLE INTEGRATION
// ============================================================================

// TODO: migrate helper to services/roster/helpers in Phase 2b
export { 
  generateEnhancedRosterCycle,
  validateEnhancedCycle,
  type CycleValidationResult 
} from '@/utils/roster/enhancedCycleIntegration';

// TODO: migrate helper to services/roster/helpers in Phase 2b
export { 
  generateShiftCycle,
  validateShiftCycle 
} from '@/utils/roster/shiftCycleGenerator';

// ============================================================================
// OT ASSIGNMENT HELPERS
// ============================================================================

// TODO: migrate helper to services/roster/helpers in Phase 2b
export { 
  validateOTRequest,
  createOTCycleEntry,
  createCommonOTPatterns 
} from '@/utils/roster/otAssignmentHelper';

// ============================================================================
// ROSTER GENERATION UTILITIES
// ============================================================================

// TODO: migrate helper to services/roster/helpers in Phase 2b
export { 
  generateRoster,
  getDefaultRatePolicy,
  getDefaultRestRules,
  getDefaultGeneratorConfig 
} from '@/utils/roster/rosterGeneration';

// ============================================================================
// UTILIZATION ANALYSIS
// ============================================================================

// TODO: migrate helper to services/roster/helpers in Phase 2b
export { 
  type UtilizationAnalysisReport,
  type StaffUtilizationMetrics 
} from '@/utils/roster/staffUtilizationAnalysis';

// ============================================================================
// NORMALIZATION UTILITIES
// ============================================================================

// TODO: migrate helper to services/roster/helpers in Phase 2b
export { 
  normalizeShiftCode 
} from '@/utils/roster/normalizeShift';
