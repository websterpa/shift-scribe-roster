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
