/**
 * Canonical shift mapping between logical names and codes
 * Database stores codes ("E", "L", "N", "D", "R", "S")
 * UI and config may use logical names ("Early", "Late", "Night", etc.)
 * 
 * THIS IS THE SINGLE SOURCE OF TRUTH FOR SHIFT MAPPINGS
 */

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

const CODE_TO_LOGICAL: Record<string, string> = {
  E: "Early",
  L: "Late",
  N: "Night",
  D: "Day",
  R: "Rest",
  S: "Sick",
};

function norm(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Map logical name or existing code to canonical code. Pass-through unknown strings.
 * Handles: "Night" -> "N", "night" -> "N", "N" -> "N", "NIGHT" -> "N"
 */
export function toCode(input: string): string {
  if (!input) return "";
  
  const trimmed = input.trim();
  
  // If it's already a known code, return it as-is
  if (CODE_TO_LOGICAL[trimmed]) return trimmed;
  
  // Try uppercase version
  const upper = trimmed.toUpperCase();
  if (CODE_TO_LOGICAL[upper]) return upper;
  
  // Try normalized lookup (lowercase)
  const n = norm(trimmed);
  return DEFAULT_SHIFT_MAP[n] ?? trimmed;
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

/**
 * Normalize requirement keys like "Night", "N", "night" to canonical code
 */
export function normalizeReqKey(k: string): string {
  return toCode(k);
}

/**
 * Identify framework by required codes present
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
