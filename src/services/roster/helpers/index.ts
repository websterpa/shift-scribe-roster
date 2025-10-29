/* Migrated from utils/roster; canonical version for engine2 integration */

/**
 * Roster Services Helpers
 * 
 * This module re-exports all helper utilities for roster services.
 * These are the canonical versions for engine2 integration.
 * 
 * @module services/roster/helpers
 */

// ============================================================================
// STAFFING CALCULATORS
// ============================================================================

export {
  calculateOptimalStaffing,
  validateStaffingAgainstRequirements,
  type StaffingCalculation,
  type StaffingRecommendation
} from './staffingCalculators';

// ============================================================================
// OVERTIME ASSIGNMENTS
// ============================================================================

export {
  createOTCycleEntry,
  createCommonOTPatterns,
  validateOTRequest,
  buildMixedCycleExample,
  type OTAssignmentRequest
} from './overtimeAssignments';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export {
  validateStaffingRequirements,
  formatValidationReport,
  type StaffingValidationReport
} from './validationUtils';

// ============================================================================
// UTILIZATION ANALYSIS
// ============================================================================

export {
  analyzeStaffUtilization,
  calculateProjectedUtilization,
  type StaffUtilizationMetrics,
  type UtilizationAnalysisReport
} from './utilizationAnalysis';

// ============================================================================
// STAFF DATA FETCHING
// ============================================================================

export {
  fetchStaffMembers
} from './fetchStaffMembers';

// ============================================================================
// CYCLE GENERATION & VALIDATION
// ============================================================================

export {
  generateEnhancedRosterCycle,
  validateEnhancedCycle,
  type CycleValidationResult
} from './enhancedCycleIntegration';

export {
  generateShiftCycle,
  validateShiftCycle,
  generateCycleForRoster,
  type ShiftCycleValidation
} from './shiftCycleGenerator';

// ============================================================================
// ROSTER GENERATION (LEGACY)
// ============================================================================

export {
  generateRoster,
  getDefaultRatePolicy,
  getDefaultRestRules,
  getDefaultGeneratorConfig,
  type GeneratorConfig,
  type GenerateParams,
  type GenerateSummary
} from './rosterGeneration';

// ============================================================================
// SHIFT CODE NORMALIZATION
// ============================================================================

export {
  normalizeShiftCode,
  type Token
} from './normalizeShift';
