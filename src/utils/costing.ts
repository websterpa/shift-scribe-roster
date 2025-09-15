import { ShiftCode, isWorkCode } from "./constraints";

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

export function shiftCost(
  hourlyRate: number,
  hours: number,
  code: ShiftCode,
  dateISO: string,
  publicHolidays: string[] = []
): number {
  const phSet = new Set(publicHolidays);
  if (code === "OT") {
    return hourlyRate * hours * otMultiplier(dateISO, phSet);
  }
  // Base cost (apply your own PH multipliers here if you already have them)
  return hourlyRate * hours;
}