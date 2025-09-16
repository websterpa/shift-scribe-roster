export type ShiftSystem = "8h" | "12h";
export type DayIdx = 0|1|2|3|4|5|6;
export type Coverage8h = { E?: number; L?: number; N?: number; D?: number };
export type Coverage12h = { D?: number; N?: number; E?: number; L?: number };
export type Coverage = Record<DayIdx, Coverage8h | Coverage12h>;

export const EMPTY_8H: Coverage8h = { E:0, L:0, N:0, D:0 };
export const EMPTY_12H: Coverage12h = { D:0, N:0, E:0, L:0 };

export function defaultCoverage(system: ShiftSystem): Coverage {
  const base = system === "8h" ? EMPTY_8H : EMPTY_12H;
  return {
    0: { ...base }, 1: { ...base }, 2: { ...base },
    3: { ...base }, 4: { ...base }, 5: { ...base }, 6: { ...base },
  } as Coverage;
}

export function clamp(v: number, min=0, max=20) { return Math.min(max, Math.max(min, Math.floor(v))); }

export function applyPreset(system: ShiftSystem, size: "Small"|"Standard"|"Large"): Coverage {
  const cov = defaultCoverage(system);
  const set = (d: DayIdx, key: string, v: number) => { (cov[d] as any)[key] = clamp(v); };

  if (system === "8h") {
    // Mon–Fri heavier, weekend lighter
    const wk = { E: size==="Small"?2: size==="Standard"?3:4, L: size==="Small"?2: size==="Standard"?3:4, N: 1 };
    const we = { E: size==="Small"?1:2, L: size==="Small"?1:2, N: 1 };
    ( [1,2,3,4,5] as DayIdx[]).forEach(d => { set(d,"E",wk.E); set(d,"L",wk.L); set(d,"N",wk.N); });
    ( [0,6] as DayIdx[]).forEach(d => { set(d,"E",we.E); set(d,"L",we.L); set(d,"N",we.N); });
  } else {
    const wk = { D: size==="Small"?3: size==="Standard"?4:5, N: 1 };
    const we = { D: size==="Small"?2:3, N: 1 };
    ( [1,2,3,4,5] as DayIdx[]).forEach(d => { set(d,"D",wk.D); set(d,"N",wk.N); });
    ( [0,6] as DayIdx[]).forEach(d => { set(d,"D",we.D); set(d,"N",we.N); });
  }
  return cov;
}

export function copyWeekdaysToWeekend(cov: Coverage, system: ShiftSystem): Coverage {
  const sunday: DayIdx = 0, saturday: DayIdx = 6;
  const fri: DayIdx = 5;
  const keys = system === "8h" ? ["E","L","N"] : ["D","N"];
  const out = structuredClone(cov);
  for (const k of keys) {
    (out[sunday] as any)[k] = (cov[fri] as any)[k] ?? 0;
    (out[saturday] as any)[k] = (cov[fri] as any)[k] ?? 0;
  }
  return out;
}

export function applyToAllDays(
  cov: Coverage, system: ShiftSystem, template: Partial<Coverage8h|Coverage12h>
): Coverage {
  const keys = system === "8h" ? ["E","L","N"] : ["D","N"];
  const out = structuredClone(cov);
  ( [0,1,2,3,4,5,6] as DayIdx[]).forEach(d => {
    for (const k of keys) (out[d] as any)[k] = clamp((template as any)[k] ?? 0);
  });
  return out;
}

export function parseOrDefault(json: string, system: ShiftSystem): Coverage {
  try {
    const obj = JSON.parse(json);
    const cov = defaultCoverage(system);
    for (const d of [0,1,2,3,4,5,6] as DayIdx[]) {
      if (obj[d] && typeof obj[d] === "object") cov[d] = { ...cov[d], ...obj[d] };
    }
    return cov;
  } catch { return defaultCoverage(system); }
}

export function serialiseCoverage(cov: Coverage): string {
  // Stable key order Sun..Sat
  const ordered: any = {};
  for (const d of [0,1,2,3,4,5,6] as DayIdx[]) ordered[d] = cov[d];
  return JSON.stringify(ordered, null, 2);
}

// --- Weekly totals helpers ---

export interface WeeklyTotals {
  byShift: Record<string, number>; // e.g., { E: 18, L: 17, N: 7 } or { D: 20, N: 7 }
  overall: number;                 // sum of all byShift
}

/** Compute totals across Sun..Sat for the current system */
export function computeWeeklyTotals(system: ShiftSystem, cov: Coverage): WeeklyTotals {
  const keys = system === "8h" ? ["E","L","N"] : ["D","N"];
  const byShift: Record<string, number> = {};
  for (const k of keys) byShift[k] = 0;

  for (const d of [0,1,2,3,4,5,6] as DayIdx[]) {
    const row = cov[d] as any;
    for (const k of keys) byShift[k] += clamp(Number(row?.[k] ?? 0));
  }

  const overall = Object.values(byShift).reduce((a, b) => a + b, 0);
  return { byShift, overall };
}

// --- Estimated weekly hours helpers ---

export interface WeeklyHours {
  byShift: Record<string, number>; // hours per shift code (e.g., {E:280, L:0, N:0} for 8h)
  overall: number;                 // total hours for all shifts
}

/**
 * Given weekly coverage counts and the active system, estimate weekly hours.
 *  - 8h system: E/L/N = 8h each
 *  - 12h system: D/N = 12h each
 */
export function computeEstimatedWeeklyHours(system: ShiftSystem, cov: Coverage): WeeklyHours {
  const keys = system === "8h" ? ["E","L","N"] : ["D","N"];
  const perShiftDuration = system === "8h" ? 8 : 12;

  const byShift: Record<string, number> = {};
  for (const k of keys) byShift[k] = 0;

  for (const d of [0,1,2,3,4,5,6] as DayIdx[]) {
    const row = cov[d] as any;
    for (const k of keys) {
      const headcount = clamp(Number(row?.[k] ?? 0));
      byShift[k] += headcount * perShiftDuration;
    }
  }
  const overall = Object.values(byShift).reduce((a,b) => a + b, 0);
  return { byShift, overall };
}

// --- Estimated weekly wage cost helpers ---

/** Returns per-shift and overall cost given weekly hours and an average hourly rate. */
export function computeEstimatedWeeklyWageCost(
  weeklyHours: { byShift: Record<string, number>; overall: number },
  avgHourlyRate: number
): { byShift: Record<string, number>; overall: number } {
  const rate = Number.isFinite(avgHourlyRate) && avgHourlyRate > 0 ? avgHourlyRate : 0;
  const byShift: Record<string, number> = {};
  for (const [k, hrs] of Object.entries(weeklyHours.byShift)) {
    byShift[k] = +(hrs * rate).toFixed(2);
  }
  const overall = +(weeklyHours.overall * rate).toFixed(2);
  return { byShift, overall };
}