import { ShiftCode, isWorkCode } from "./constraints";

// Add a helper to compute duration hours from start/end
export function durationHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 3_600_000;
}

export function isSunday(d: Date) { return d.getDay() === 0; } // Sunday=0
export function isPublicHoliday(dateISO: string, ph: Set<string>) {
  return ph.has(dateISO);
}

export function otMultiplier(dateISO: string, ph: Set<string>) {
  // OT: 1.5x weekdays, 2x Sundays & PHs
  if (isPublicHoliday(dateISO, ph)) return 2.0;
  const d = new Date(dateISO + "T00:00:00Z");
  if (isSunday(d)) return 2.0;
  return 1.5;
}

/**
 * shiftCost: If you pass start/end, we compute hours from the window.
 * Otherwise pass explicit hours.
 */
export function shiftCost(
  hourlyRate: number,
  code: ShiftCode,
  dateISO: string,
  publicHolidays: string[] = [],
  options?: { start?: Date; end?: Date; hoursOverride?: number }
): number {
  const phSet = new Set(publicHolidays);
  const hours =
    options?.hoursOverride ??
    (options?.start && options?.end ? durationHours(options.start, options.end) : 0);
  if (hours <= 0) return 0;

  if (code === "OT") {
    return hourlyRate * hours * otMultiplier(dateISO, phSet);
  }
  // Base cost; if you have PH multipliers for non-OT, integrate here
  return hourlyRate * hours;
}

// Legacy function signature for backward compatibility
export function shiftCostLegacy(
  hourlyRate: number,
  hours: number,
  code: ShiftCode,
  dateISO: string,
  publicHolidays: string[] = []
): number {
  return shiftCost(hourlyRate, code, dateISO, publicHolidays, { hoursOverride: hours });
}