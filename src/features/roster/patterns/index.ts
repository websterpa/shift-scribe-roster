/**
 * Pattern management - centralized exports
 * 
 * This module provides all pattern-related functionality:
 * - Type definitions
 * - Pattern loading from database
 * - Pattern resolution (custom > site default)
 * - Pattern expansion over date ranges
 * - Pattern-locked roster generation
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  ShiftCode,
  ShiftSystem,
  StaffPattern,
  StaffPatternAssignment,
  ResolvedShift,
  PatternTemplate,
  StaffPatternBinding,
  ExpandedPatternDay,
  PatternLockedConfig,
} from './types';

// ============================================================================
// LOADER EXPORTS
// ============================================================================

export {
  loadShiftPatterns,
  loadSitePatterns, // deprecated alias
  loadCustomPatterns,
  loadAllPatterns,
} from './loaders';

// ============================================================================
// RESOLVER EXPORTS
// ============================================================================

export {
  getStaffPatternBinding,
  resolvePatternForStaff,
  resolvePatternsBatch,
} from './resolve';

// ============================================================================
// EXPANSION EXPORTS
// ============================================================================

export {
  expandPatternOverRange,
  expandPatternsBatch,
  getShiftCodeForDate,
} from './expand';

// ============================================================================
// ABSENCE OVERLAY EXPORTS
// ============================================================================

export {
  loadApprovedAbsences,
  overlayAbsencesOnPatterns,
  applyAbsenceOverlay,
  type AbsenceRecord,
  type ExpandedPatternDayWithAbsence,
} from './overlayAbsence';

// ============================================================================
// ADHERENCE TRACKING EXPORTS
// ============================================================================

export {
  calculatePatternAdherence,
  validatePatternAdherence,
  type StaffAdherenceMetrics,
  type PatternAdherenceSummary,
} from './adherence';

// ============================================================================
// GENERATOR EXPORTS
// ============================================================================

export {
  generatePatternLockedDuties,
  isPatternRestDay,
  type PatternDuty,
  type PatternLockedInput,
  type PatternLockedResult,
} from './generator';
