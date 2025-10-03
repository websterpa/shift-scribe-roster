/**
 * Canonical shift mapping between logical names and codes
 * Database stores codes ("E", "L", "N", "D", "R", "S")
 * UI and config may use logical names ("Early", "Late", "Night", etc.)
 */

export const DEFAULT_SHIFT_MAP: Record<string, string> = {
  Early: "E",
  Late: "L",
  Night: "N",
  Day: "D",
  Rest: "R",
  Sick: "S",
  Sickness: "S",
};

export const CODE_TO_LOGICAL: Record<string, string> = {
  E: "Early",
  L: "Late",
  N: "Night",
  D: "Day",
  R: "Rest",
  S: "Sick",
};

/**
 * Convert logical shift name to code
 * If input is already a code, returns it unchanged
 */
export function toCode(logical: string): string {
  if (!logical) return "";
  
  // Check if it's already a code (single letter)
  if (logical.length === 1 && CODE_TO_LOGICAL[logical]) {
    return logical;
  }
  
  // Map from logical name
  return DEFAULT_SHIFT_MAP[logical] ?? logical;
}

/**
 * Convert shift code to logical name for display
 */
export function toLogical(code: string): string {
  return CODE_TO_LOGICAL[code] ?? code;
}

/**
 * Validate that a shift code is valid
 */
export function isValidCode(code: string): boolean {
  return !!CODE_TO_LOGICAL[code];
}
