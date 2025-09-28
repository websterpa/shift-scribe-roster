// Canonical tokens allowed by DB CHECK
export type ShiftToken = 'D' | 'E' | 'L' | 'N' | 'R' | 'S';

export const ALLOWED_SHIFT_TOKENS: ReadonlySet<string> =
  new Set<ShiftToken>(['D','E','L','N','R','S']);

// Use labels only for display
export const LABEL_FROM_TOKEN: Record<ShiftToken, string> = {
  D: 'Day',
  E: 'Early',
  L: 'Late',
  N: 'Night',
  R: 'Rest',
  S: 'Sickness',
};

// Shorter label mapping for UI
export const LABEL: Record<ShiftToken, string> = {
  D: 'Day',
  E: 'Early', 
  L: 'Late',
  N: 'Night',
  R: 'Rest',
  S: 'Sickness',
};

// Helper to get allowed tokens per system
export function allowedTokens(system: '8h' | '12h'): ShiftToken[] {
  return system === '12h' ? ['D', 'N'] : ['E', 'L', 'N'];
}

// Optional: normalize from various UI strings to tokens
export function normalizeToToken(input: string): ShiftToken {
  const s = input.trim().toUpperCase();
  if (s === 'D' || s === 'DAY') return 'D';
  if (s === 'E' || s === 'EARLY') return 'E';
  if (s === 'L' || s === 'LATE') return 'L';
  if (s === 'N' || s === 'NIGHT') return 'N';
  if (s === 'S' || s === 'SICK' || s === 'SICKNESS') return 'S';
  // Treat AL/SP/CL/Off/Rest as 'R' unless DB CHECK is extended
  if (s === 'R' || s === 'OFF' || s === 'AL' || s === 'SP' || s === 'CL' || s === 'REST') return 'R';
  return 'R';
}

// Pre-insert guard: fail fast before DB CHECK
export function assertShiftToken(x: string): asserts x is ShiftToken {
  if (!ALLOWED_SHIFT_TOKENS.has(x)) {
    throw new Error(
      `Invalid shift_code "${x}". Must be one of ${Array.from(ALLOWED_SHIFT_TOKENS).join(', ')}`
    );
  }
}

// Convert from current word-based system to tokens
export function mapShiftCodeToToken(shiftCode: string): ShiftToken {
  const normalized = normalizeToToken(shiftCode);
  assertShiftToken(normalized);
  return normalized;
}