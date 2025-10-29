/**
 * Public API for roster generation services
 * 
 * This is the STABLE FACADE for all roster generation functionality.
 * Import from here to access engine2 + persistence layer.
 * 
 * @example
 * ```ts
 * import { 
 *   generateAndSaveRoster,
 *   generateCorrectiveRoster,
 *   type RosterGenerationResult,
 *   type ManagerRosterConfig
 * } from '@/services/roster';
 * ```
 * 
 * @module services/roster
 */

// ============================================================================
// CORE GENERATION FUNCTIONS
// ============================================================================

export { generateAndSaveRoster } from './generation';
export { 
  generateCorrectiveRoster,
  generatePatternLockedDuties,
  transformToUIResult
} from '@/features/roster/engine';

// ============================================================================
// TYPES - CANONICAL EXPORTS
// ============================================================================

export type {
  // Core result types
  RosterGenerationResult,
  RosterGenerationResultUI,
  
  // Configuration
  ManagerRosterConfig,
  
  // Diagnostics & Statistics
  Diagnostics,
  DistributionStats,
  StaffDistributionStats,
  EligibilityReason,
  
  // Assignments
  Assignment,
} from '@/features/roster/types';

// ============================================================================
// ENGINE TYPES
// ============================================================================

export type {
  CorrectiveStaffMember,
  CoverageRequirements,
  CorrectiveResult,
  CorrectivePolicy,
  CorrectiveInput,
} from '@/features/roster/engine';

// ============================================================================
// DEFAULT POLICIES
// ============================================================================

export { DEFAULT_CORRECTIVE_POLICY } from '@/features/roster/engine';

// ============================================================================
// ROSTER HELPERS
// ============================================================================

/**
 * All roster utility functions are now in the services layer.
 * Migrated from utils/roster/* to services/roster/helpers/*.
 */
export * from './helpers';
