/**
 * Canonical types for pattern-locked roster generation
 * 
 * A "pattern" is the source of truth for each staff member: a repeating 
 * sequence of shift codes anchored at a personal start date.
 */

// ============================================================================
// SHIFT CODES
// ============================================================================

/** Valid shift codes for patterns (R = Rest) */
export type ShiftCode = 'D' | 'N' | 'E' | 'L' | 'R';

/** Shift system determines which codes are valid for work shifts */
export type ShiftSystem = '8h' | '12h';

// ============================================================================
// PATTERN DEFINITION
// ============================================================================

/**
 * A repeating pattern of shift codes assigned to a staff member
 */
export interface StaffPattern {
  /** Unique identifier for this pattern */
  id: string;
  
  /** Human-readable name (e.g., "4 on 4 off", "Continental") */
  name: string;
  
  /** The repeating sequence of shift codes */
  sequence: ShiftCode[];
  
  /** Which shift system this pattern is designed for */
  shiftSystem: ShiftSystem;
  
  /** Optional: how many weeks this pattern repeats over (for display) */
  cycleWeeks?: number;
}

/**
 * A pattern assignment for a specific staff member
 */
export interface StaffPatternAssignment {
  /** Staff member ID */
  staffId: string;
  
  /** The pattern to apply */
  pattern: StaffPattern;
  
  /** Personal anchor date (YYYY-MM-DD) - day 0 of the pattern sequence */
  startDate: string;
  
  /** Optional: when this pattern assignment ends */
  endDate?: string;
}

// ============================================================================
// PATTERN RESOLUTION
// ============================================================================

/**
 * Result of resolving a pattern for a specific date
 */
export interface ResolvedShift {
  /** The date (YYYY-MM-DD) */
  date: string;
  
  /** The shift code from the pattern */
  shiftCode: ShiftCode;
  
  /** Index in the pattern sequence */
  patternIndex: number;
  
  /** Days elapsed since pattern start */
  daysFromStart: number;
}

// ============================================================================
// PATTERN LIBRARY (Database-aligned canonical types)
// ============================================================================

/**
 * Pattern template stored in database (site_patterns/custom_patterns table)
 * This is the canonical source of truth for pattern definitions.
 */
export interface PatternTemplate {
  id: string;
  tenant_id: string;
  site_id?: string | null;
  pattern_name: string;
  pattern_sequence: ShiftCode[]; // e.g. ['D','D','N','N','R','R','R','R']
  pattern_length: number;         // must equal pattern_sequence.length
}

/**
 * Binds a staff member to a specific pattern with a start date
 */
export interface StaffPatternBinding {
  staff_id: string;
  pattern_id: string;
  pattern_start_date: string; // ISO (first day this cycle applies to the staff member)
}

/**
 * A single day in an expanded pattern sequence
 */
export interface ExpandedPatternDay {
  date: string; // ISO yyyy-mm-dd
  shift_code: ShiftCode;
  is_rest: boolean;
}

// ============================================================================
// GENERATION CONFIG
// ============================================================================

/**
 * Configuration for pattern-locked roster generation
 */
export interface PatternLockedConfig {
  /** Start date for the roster period (YYYY-MM-DD) */
  rosterStartDate: string;
  
  /** Number of weeks to generate */
  weeks: number;
  
  /** Shift system for this roster */
  shiftSystem: ShiftSystem;
  
  /** Pattern assignments for each staff member */
  assignments: StaffPatternAssignment[];
  
  /** Optional: site ID */
  siteId?: string;
}
