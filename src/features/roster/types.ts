/**
 * Shared types for roster generation and results
 * 
 * This is the CANONICAL type definition file for all roster-related types.
 * All imports should reference: @/features/roster/types
 */

// ============================================================================
// ELIGIBILITY & EXCLUSION TRACKING
// ============================================================================

export interface EligibilityReason {
  code:
    | 'inactive'
    | 'wrongTenant'
    | 'roleMismatch'
    | 'unavailable'
    | 'skillMissing'
    | 'restViolationIfScheduled'
    | 'siteMismatch'
    | 'other';
  detail?: string;
}

// ============================================================================
// DIAGNOSTICS & DISTRIBUTION STATS
// ============================================================================

export interface StaffDistributionStats {
  staffId: string;
  staffName?: string;
  totalHours: number;
  totalShifts: number;
  nights: number;
  weekendDays: number;
  consecutiveDaysMax?: number;
}

export interface DistributionStats {
  byStaff: StaffDistributionStats[];
  byShiftCode: Record<string, { count: number; hours?: number }>;
}

export interface Diagnostics {
  distributionStats: DistributionStats;
  excludedStaff?: Array<{ 
    staffId: string; 
    name?: string; 
    reasons: EligibilityReason[] 
  }>;
  fairnessScore?: number;
  nightBalanceScore?: number;
  constraintViolations?: Record<string, number>; // e.g. { minRest: 2, maxConsec: 1 }
  seed?: string;
  
  // Pattern adherence tracking (when pattern-locked mode is enabled)
  patternAdherence?: Array<{
    staffId: string;
    staffName?: string;
    expectedDutyDays: number;      // Work days in pattern (not R)
    matchedDutyDays: number;        // Assignments on expected work days
    adherencePct: number;           // matchedDutyDays / expectedDutyDays * 100
    remappedELtoD?: number;         // E/L codes remapped to D (12h framework)
    restPreservedDays?: number;     // R days with no assignment
    absenceDays?: number;           // Days marked as absence (A)
  }>;
}

// Legacy format for backwards compatibility with CorrectiveResult
export interface RosterDiagnosticsLegacy {
  staffPoolCount?: number;
  staffUsedCount?: number;
  distributionStats?: Record<string, {
    nights: number;
    weekendDays: number;
    totalHours: number;
  }>;
  unfilledShifts?: Array<{
    dateISO: string;
    dayIndex: number;
    shift: 'E' | 'L' | 'N' | 'D';
    needed: number;
    filled: number;
    rejectionReasons: string[];
  }>;
  constraintViolations?: Record<string, number>;
}

// ============================================================================
// ASSIGNMENTS
// ============================================================================

export interface Assignment {
  id?: string;
  date: string;
  shift_code: 'E' | 'L' | 'N' | 'D';
  staff_id: string;
  site_id?: string;
  role_id?: string;
  start?: string;
  end?: string;
}

// ============================================================================
// ROSTER GENERATION RESULT
// ============================================================================

/**
 * Primary roster generation result (modern format)
 */
export interface RosterGenerationResult {
  assignments: Assignment[];
  warnings?: string[];
  diagnostics: Diagnostics;
}

/**
 * UI/Manager-facing roster generation result
 * (for components like ManagerRosterGenerator and RosterResultsSummary)
 */
export interface RosterGenerationResultUI {
  coverageAchieved: {
    total: number;
    byShift: Record<string, number>;
  };
  fairnessStats: {
    nights: { min: number; avg: number; max: number };
    weekends: { min: number; avg: number; max: number };
    publicHolidays: { min: number; avg: number; max: number };
  };
  cost: {
    total: number;
    budgetVariance?: number;
  };
  violations: string[];
  generatedVersionId?: string;
  diagnostics?: Diagnostics | RosterDiagnosticsLegacy; // Support both formats
}

// ============================================================================
// ROSTER CONFIGURATION
// ============================================================================

export interface ManagerRosterConfig {
  // Basic settings
  shiftSystem: '8h' | '12h';
  siteStartTime: string;
  timezone: string;
  weeks: number;
  
  // OT defaults
  defaultOtHours: number;
  defaultOtStartTime: string;
  
  // Optional constraints
  budget?: number;
  publicHolidayCap?: number;
  allowSupervisorNights: boolean;
  
  // Coverage targets
  coverageTargets: string; // JSON string
  
  // Pattern mode
  patternLocked?: boolean; // Enable pattern-based duty assignment
}
