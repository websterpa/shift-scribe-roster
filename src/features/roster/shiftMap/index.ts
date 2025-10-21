/**
 * CANONICAL SHIFT MAPPING MODULE
 * 
 * This is the single source of truth for all shift code/name mappings in the application.
 * 
 * Key concepts:
 * - Shift Codes: Single-letter identifiers (D, E, L, N, R, S)
 * - Shift Names: Human-readable names (Day, Early, Late, Night, Rest, Sick)
 * - Frameworks: 8h (E/L/N) vs 12h (D/N)
 * 
 * @module shiftMap
 */

// ============================================================================
// TYPES
// ============================================================================

export type ShiftCode = "D" | "E" | "L" | "N" | "R" | "S";
export type ShiftName = "Day" | "Early" | "Late" | "Night" | "Rest" | "Sick";

// ============================================================================
// FRAMEWORK DEFINITIONS
// ============================================================================

/** Standard 8-hour shift framework uses Early, Late, Night */
export const FRAMEWORK_8H: ReadonlyArray<ShiftCode> = ['E', 'L', 'N'] as const;

/** Standard 12-hour shift framework uses Day, Night */
export const FRAMEWORK_12H: ReadonlyArray<ShiftCode> = ['D', 'N'] as const;

// ============================================================================
// CORE MAPPINGS
// ============================================================================

/** Map shift codes to human-readable names */
export const SHIFT_CODE_TO_NAME: Record<ShiftCode, ShiftName> = {
  'D': 'Day',
  'E': 'Early',
  'L': 'Late',
  'N': 'Night',
  'R': 'Rest',
  'S': 'Sick'
};

/** Map human-readable names to shift codes */
export const SHIFT_NAME_TO_CODE: Record<ShiftName, ShiftCode> = {
  'Day': 'D',
  'Early': 'E',
  'Late': 'L',
  'Night': 'N',
  'Rest': 'R',
  'Sick': 'S'
};

/** Legacy mapping for case-insensitive logical name to code conversion */
export const DEFAULT_SHIFT_MAP: Record<string, string> = {
  early: "E",
  late: "L",
  night: "N",
  day: "D",
  rest: "R",
  sickness: "S",
  sick: "S",
  // Capitalized versions
  Early: "E",
  Late: "L",
  Night: "N",
  Day: "D",
  Rest: "R",
  Sick: "S",
  Sickness: "S",
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a string is a valid shift code (D, E, L, N, R, S)
 */
export function isValidCode(code: string): code is ShiftCode {
  return code in SHIFT_CODE_TO_NAME;
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert shift code to human-readable name
 * @example shiftCodeToName('D') => 'Day'
 */
export function shiftCodeToName(code: ShiftCode): ShiftName {
  return SHIFT_CODE_TO_NAME[code];
}

/**
 * Convert human-readable name to shift code
 * @example shiftNameToCode('Day') => 'D'
 */
export function shiftNameToCode(name: ShiftName): ShiftCode {
  return SHIFT_NAME_TO_CODE[name];
}

/**
 * Map logical name or existing code to canonical code. Pass-through unknown strings.
 * Handles case-insensitive conversion: "Night" -> "N", "night" -> "N", "N" -> "N"
 * 
 * @example toCode('Night') => 'N'
 * @example toCode('night') => 'N'
 * @example toCode('N') => 'N'
 */
export function toCode(input: string): string {
  if (!input) return "";
  
  const trimmed = input.trim();
  
  // If it's already a known code, return it as-is
  if (isValidCode(trimmed)) return trimmed;
  
  // Try uppercase version
  const upper = trimmed.toUpperCase();
  if (isValidCode(upper)) return upper;
  
  // Try normalized lookup (lowercase)
  const normalized = trimmed.toLowerCase();
  return DEFAULT_SHIFT_MAP[normalized] ?? trimmed;
}

/**
 * Convert shift code to logical name for display
 * @example toLogical('N') => 'Night'
 */
export function toLogical(code: string): string {
  if (isValidCode(code)) {
    return SHIFT_CODE_TO_NAME[code];
  }
  return code;
}

/**
 * Normalize requirement keys like "Night", "N", "night" to canonical code
 * Alias for toCode for backward compatibility
 */
export function normalizeReqKey(k: string): string {
  return toCode(k);
}

// ============================================================================
// FRAMEWORK DETECTION
// ============================================================================

/**
 * Detect the framework type based on required shift codes
 * - 12h: Has D and N, no E or L
 * - 8h: Has E or L
 * - mixed: Has N but not clearly 8h or 12h
 */
export function detectFramework(requiredCodes: Set<string>): "8h" | "12h" | "mixed" {
  const hasE = requiredCodes.has("E");
  const hasL = requiredCodes.has("L");
  const hasD = requiredCodes.has("D");
  const hasN = requiredCodes.has("N");
  
  if (hasD && hasN && !hasE && !hasL) return "12h";
  if (hasE || hasL) return "8h";
  return hasN ? "mixed" : "8h";
}

// ============================================================================
// FRAMEWORK REMAPPING
// ============================================================================

/**
 * Remap shift codes to target framework
 * For 12h framework: E and L → D
 * 
 * @param codes - Array of shift codes to remap
 * @param targetFramework - Target framework ('8h' or '12h')
 * @returns Remapped array of shift codes
 */
export function remapToFramework(codes: string[], targetFramework: '8h' | '12h'): string[] {
  if (targetFramework === '8h') {
    return codes; // No remapping needed for 8h
  }
  
  // For 12h: remap E and L to D
  return codes.map(code => {
    if (code === 'E' || code === 'L') return 'D';
    return code;
  });
}

// ============================================================================
// STAFF ELIGIBILITY
// ============================================================================

/**
 * Check if a staff member is eligible for a specific shift code
 * Handles the conversion between database shift names and generation codes
 * 
 * @param staffEligibleShifts - Array of shift names the staff is eligible for (e.g., ['Day', 'Night'])
 * @param shiftCode - Shift code to check (e.g., 'D')
 * @returns true if staff is eligible for the shift
 */
export function isStaffEligibleForShift(
  staffEligibleShifts: string[] | null | undefined,
  shiftCode: ShiftCode
): boolean {
  if (!staffEligibleShifts || staffEligibleShifts.length === 0) {
    console.warn('Staff has no eligible shifts configured');
    return false;
  }

  const shiftName = shiftCodeToName(shiftCode);
  
  // Check if the staff is eligible for this shift (by name)
  const isEligible = staffEligibleShifts.includes(shiftName);
  
  console.log(`🔍 Eligibility check: Staff eligible shifts: [${staffEligibleShifts.join(', ')}], checking for: ${shiftName} (${shiftCode}) = ${isEligible}`);
  
  return isEligible;
}

/**
 * Get all shift codes that a staff member is eligible for
 * 
 * @param staffEligibleShifts - Array of shift names (e.g., ['Day', 'Night'])
 * @returns Array of shift codes (e.g., ['D', 'N'])
 */
export function getEligibleShiftCodes(staffEligibleShifts: string[] | null | undefined): ShiftCode[] {
  if (!staffEligibleShifts || staffEligibleShifts.length === 0) {
    return [];
  }

  return staffEligibleShifts
    .filter((name): name is ShiftName => name in SHIFT_NAME_TO_CODE)
    .map(name => SHIFT_NAME_TO_CODE[name as ShiftName]);
}
