/**
 * Shared types for roster generation and results
 */

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

export interface RosterDiagnostics {
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
}

// ============================================================================
// ROSTER GENERATION RESULT
// ============================================================================

export interface RosterGenerationResult {
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
  diagnostics?: RosterDiagnostics;
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
}
