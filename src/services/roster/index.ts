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
// COMPATIBILITY HELPERS (Phase 2a)
// ============================================================================

/**
 * Compatibility helpers re-exported for backward compatibility.
 * These are thin adapters around src/utils/roster/* helpers.
 * 
 * TODO: Phase 2b - Migrate underlying implementations to services layer
 */
export * from './helpers';
