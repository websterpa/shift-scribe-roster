/**
 * CANONICAL ROSTER ENGINE API
 * 
 * This module serves as the single entry point for all roster generation
 * and validation logic, wrapping the engine2 implementation.
 * 
 * IMPORTANT: All roster generation features should import from this module
 * instead of directly importing from engine2/* or src/utils/roster/*.
 * 
 * @module roster/engine
 */

// ============================================================================
// RE-EXPORTS: TYPES
// ============================================================================

export type {
  // Core types
  Money,
  Hours,
  DateTimeISO,
  SegmentTag,
  Segment,
  ShiftSpec,
  Differential,
  PremiumMultiplier,
  StackingPolicy,
  RatePolicy,
  Holiday,
  ExplainLine,
  CostBreakdown,
  RestRules,
  Assignment,
} from '@/engine2/types';

// ============================================================================
// RE-EXPORTS: TIME EXPANSION
// ============================================================================

export { expandShift } from '@/engine2/time/expandShift';

/**
 * Expand a shift specification into time segments with tags
 * 
 * Takes a shift with start/end times and breaks it into segments,
 * tagging each segment with applicable conditions (NIGHT, WEEKEND, etc.)
 * 
 * @param shift - The shift specification with start/end dates
 * @param options - Configuration for night hours and holidays
 * @returns Array of time segments with tags
 * 
 * @example
 * ```ts
 * const shift = { start: new Date('2025-01-10T22:00'), end: new Date('2025-01-11T06:00') };
 * const segments = expandShift(shift, { nightStartHour: 22, nightEndHour: 6 });
 * // Returns segments tagged with NIGHT for overnight hours
 * ```
 */

// ============================================================================
// RE-EXPORTS: COSTING
// ============================================================================

export { costShift } from '@/engine2/cost/costShift';

/**
 * Calculate the cost breakdown for a shift based on segments and rate policy
 * 
 * Applies base rates, differentials, premiums, and stacking rules to
 * compute total shift cost with detailed component breakdown.
 * 
 * @param shift - The shift specification
 * @param segments - Time segments from expandShift
 * @param ratePolicy - Rate policy with base pay and premiums
 * @returns Detailed cost breakdown
 * 
 * @example
 * ```ts
 * const cost = costShift(shift, segments, {
 *   baseHourly: 15,
 *   differentials: [{ tag: 'NIGHT', percentage: 0.30 }],
 *   premiumMultipliers: [],
 *   stacking: { kind: 'MAX_OF', components: ['DIFF'], includeFlat: true }
 * });
 * console.log(cost.total); // Total cost including all premiums
 * ```
 */

// ============================================================================
// RE-EXPORTS: REST VALIDATION
// ============================================================================

export { validateRest } from '@/engine2/rules/validateRest';

/**
 * Validate rest period compliance for a set of assignments
 * 
 * Checks that assignments comply with Working Time Directive rules:
 * - Minimum daily rest between shifts
 * - Minimum weekly rest periods
 * - Maximum weekly working hours
 * 
 * @param assignments - Array of staff assignments with shifts
 * @param rules - Rest rules configuration (daily, weekly limits)
 * @returns Array of explanation lines (violations if any)
 * 
 * @example
 * ```ts
 * const violations = validateRest(assignments, {
 *   minDailyRestHours: 11,
 *   minWeeklyRestHours: 24,
 *   maxWeeklyHours: 48
 * });
 * if (violations.length > 0) {
 *   console.warn('WTD violations:', violations);
 * }
 * ```
 */

// ============================================================================
// RE-EXPORTS: CORRECTIVE ROSTER GENERATOR
// ============================================================================

export {
  generateCorrectiveRoster,
  type CorrectiveStaffMember,
  type CoverageRequirements,
  type CorrectivePolicy,
  type CorrectiveInput,
  type CorrectiveResult,
  DEFAULT_CORRECTIVE_POLICY,
} from '@/engine2/generators/correctiveRosterGenerator';

/**
 * Primary roster generator replacing deprecated `generateRosterEnhanced`
 * 
 * Generate a roster using the corrective algorithm with hard constraint enforcement
 * and fairness-based optimization. This is the canonical roster generation function.
 * 
 * FRAMEWORK SUPPORT:
 * - 8h mode: Uses E (Early), L (Late), N (Night) shifts
 * - 12h mode: Uses D (Day), N (Night) shifts only
 * - Framework detection: Based on requirements or explicit parameter
 * - Strict isolation: No E/L in 12h mode, no D in 8h mode
 * 
 * HARD CONSTRAINTS (enforced before accepting assignments):
 * - Minimum rest hours: Default 11h between consecutive shifts (configurable)
 * - Maximum consecutive days: Default 6 working days before forced rest
 * - Maximum consecutive nights: Default 3 night shifts before forced rest
 * - Corrective pass: Automatically inserts REST days where constraints violated
 * 
 * SOFT FAIRNESS PREFERENCES:
 * - Variance minimization: Spreads hours evenly across all staff
 * - Rotation preference: Avoids reusing same staff consecutively
 * - Night balance: Additional fairness weight for night shifts
 * - Deterministic tie-breaking: Seeded RNG for reproducible results
 * 
 * FAIRNESS TUNING PARAMETERS:
 * - fairnessWeight (0.2-0.4): Penalty for variance in total hours
 * - nightBalanceWeight (0.2-0.4): Additional weight for night shift balance
 * - rotationPreference (0-1): Bonus for not using same staff consecutively
 * - variancePenaltyStrength (default 1.0): Multiplier for variance penalty
 * 
 * METRICS LOGGED:
 * - Gini coefficient (0=perfect equality, 1=perfect inequality)
 * - Hours variance across all staff
 * - Min/max/mean hours distribution
 * - REST days enforced during corrective pass
 * 
 * @param input - Generation parameters (staff, requirements, policy, framework)
 * @returns Complete roster with assignments, fairness metrics, and diagnostics
 * 
 * @example
 * ```ts
 * // 8h framework (E/L/N shifts)
 * const result8h = generateCorrectiveRoster({
 *   days: ['2025-01-10', '2025-01-11', '2025-01-12'],
 *   staff: [{ id: '1', name: 'John', availability: {}, isNightEligible: true }],
 *   requirements: { '2025-01-10': { E: 2, L: 2, N: 1 } },
 *   policy: { ...DEFAULT_CORRECTIVE_POLICY, fairnessWeight: 0.3 },
 *   framework: '8h'
 * });
 * 
 * // 12h framework (D/N shifts only)
 * const result12h = generateCorrectiveRoster({
 *   days: ['2025-01-10', '2025-01-11'],
 *   staff: [{ id: '1', name: 'John', availability: {}, isNightEligible: true }],
 *   requirements: { '2025-01-10': { D: 2, N: 1 } },
 *   policy: { ...DEFAULT_CORRECTIVE_POLICY },
 *   framework: '12h'
 * });
 * ```
 */

// ============================================================================
// RE-EXPORTS: WTD ROSTER GENERATOR
// ============================================================================

export {
  generateWTDRoster,
  type WTDStaffMember,
  type CoverageRequirement,
  type WTDGeneratorInput,
  type WTDGeneratorResult,
} from '@/engine2/generators/wtdRosterGenerator';

/**
 * Generate a Working Time Directive compliant roster
 * 
 * Creates rosters that strictly comply with UK WTD 1998 regulations:
 * - 11h daily rest between shifts
 * - 24h weekly rest minimum
 * - 48h maximum weekly hours (averaged over 17 weeks)
 * - 8h average night work per 24h period
 * 
 * @param input - Generation parameters with WTD rules
 * @returns WTD-compliant roster with violation tracking
 * 
 * @example
 * ```ts
 * const result = generateWTDRoster({
 *   staff: [...],
 *   requirements: [{ date: '2025-01-10', E: 2, L: 2, N: 1 }],
 *   rules: DEFAULT_WTD_RULES
 * });
 * ```
 */

// ============================================================================
// RE-EXPORTS: WTD CONSTRAINTS & VALIDATION
// ============================================================================

export {
  type WTDRules,
  type ShiftTimes,
  DEFAULT_WTD_RULES,
  DEFAULT_SHIFT_TIMES,
  calculateRestHours,
  isValidTransition,
  validateStaffWTD,
  validateNightWorkAverage,
} from '@/engine2/constraints/wtdRules';

/**
 * WTD constraint validation utilities
 * 
 * - calculateRestHours: Compute rest time between shift end and next shift start
 * - isValidTransition: Check if consecutive shifts meet rest requirements
 * - validateStaffWTD: Validate entire staff assignment sequence
 * - validateNightWorkAverage: Check 17-week night work averaging
 * 
 * @example
 * ```ts
 * const restHours = calculateRestHours('22:00', '06:00');
 * const isValid = isValidTransition('N', 'E', DEFAULT_SHIFT_TIMES);
 * const violations = validateStaffWTD(staffAssignments, DEFAULT_WTD_RULES);
 * ```
 */

// ============================================================================
// LEGACY COMPATIBILITY NOTES
// ============================================================================

/**
 * MIGRATION GUIDE:
 * 
 * Old imports:
 * - import { expandShift } from '@/engine2/time/expandShift'
 * - import { costShift } from '@/engine2/cost/costShift'
 * - import { validateRest } from '@/engine2/rules/validateRest'
 * - import { generateCorrectiveRoster } from '@/engine2/generators/correctiveRosterGenerator'
 * 
 * New imports:
 * - import { expandShift, costShift, validateRest, generateCorrectiveRoster } from '@/features/roster/engine'
 * 
 * Benefits:
 * - Single canonical import path
 * - Consistent API surface
 * - Easier refactoring and testing
 * - Clear separation between engine internals and public API
 */
