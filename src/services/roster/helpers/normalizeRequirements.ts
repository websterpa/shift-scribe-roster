/* Migrated from utils/roster — canonical version */

/**
 * Requirement Normalization
 * 
 * Normalizes various requirement formats to tokenized per-day maps.
 * Handles both legacy formats (night_shift_staff, "Night") and modern tokens (N).
 * 
 * @module services/roster/helpers/normalizeRequirements
 */

export type DayReq = { 
  D?: number; 
  E?: number; 
  L?: number; 
  N?: number;
  R?: number;
  S?: number;
};

export type NormalizedRequirements = Record<number, DayReq>;

/**
 * Normalize requirement input to canonical token format
 * Supports:
 * - Legacy field names: night_shift_staff, day_shift_staff, etc.
 * - Legacy labels: "Night", "Day", "Early", "Late"
 * - Modern tokens: "N", "D", "E", "L"
 */
export function normalizeRequirements(input: unknown): NormalizedRequirements {
  console.log("[normalizeRequirements] Input:", input);
  
  if (!input || typeof input !== 'object') {
    return {};
  }

  const result: NormalizedRequirements = {};

  // Handle array format (from form)
  if (Array.isArray(input)) {
    input.forEach((day: any) => {
      if (typeof day.dow === 'number' && day.need) {
        result[day.dow] = normalizeTokenMap(day.need);
      }
    });
    return result;
  }

  // Handle legacy flat format with weekday keys
  const obj = input as Record<string, any>;
  for (const [key, value] of Object.entries(obj)) {
    const dayIdx = parseInt(key);
    if (!isNaN(dayIdx) && dayIdx >= 0 && dayIdx <= 6) {
      result[dayIdx] = normalizeTokenMap(value);
    }
  }

  console.log("[normalizeRequirements] Normalized:", result);
  return result;
}

/**
 * Normalize a single day's shift requirements to token map
 */
function normalizeTokenMap(input: any): DayReq {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const result: DayReq = {};

  for (const [key, value] of Object.entries(input)) {
    const count = typeof value === 'number' ? value : parseInt(String(value));
    if (isNaN(count) || count <= 0) continue;

    // Map various formats to canonical tokens
    const token = normalizeToToken(key);
    if (token) {
      result[token] = (result[token] || 0) + count;
    }
  }

  return result;
}

/**
 * Map various shift name formats to canonical tokens
 */
function normalizeToToken(input: string): keyof DayReq | null {
  const normalized = input.trim().toUpperCase();
  
  // Direct token match
  if (['D', 'E', 'L', 'N', 'R', 'S'].includes(normalized)) {
    return normalized as keyof DayReq;
  }

  // Legacy field names
  if (normalized === 'NIGHT_SHIFT_STAFF' || normalized === 'NIGHT') return 'N';
  if (normalized === 'DAY_SHIFT_STAFF' || normalized === 'DAY') return 'D';
  if (normalized === 'EARLY_SHIFT_STAFF' || normalized === 'EARLY') return 'E';
  if (normalized === 'LATE_SHIFT_STAFF' || normalized === 'LATE') return 'L';
  if (normalized === 'REST') return 'R';
  if (normalized === 'SICK' || normalized === 'SICKNESS') return 'S';

  return null;
}

/**
 * DEV diagnostic: Print total requirements per token
 */
export function printRequirementsSummary(reqs: NormalizedRequirements): void {
  if (!import.meta.env.DEV) return;

  const totals: DayReq = {};
  for (const dayReqs of Object.values(reqs)) {
    for (const [token, count] of Object.entries(dayReqs)) {
      totals[token as keyof DayReq] = (totals[token as keyof DayReq] || 0) + count;
    }
  }

  console.table({
    'Requirements Summary': {
      'Day (D)': totals.D || 0,
      'Early (E)': totals.E || 0,
      'Late (L)': totals.L || 0,
      'Night (N)': totals.N || 0,
      'Rest (R)': totals.R || 0,
      'Sick (S)': totals.S || 0,
    }
  });

  console.log(`🌙 N required: ${(totals.N || 0) > 0 ? 'YES' : 'NO'}`);
}
