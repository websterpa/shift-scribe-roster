import type { Holiday } from "../types";

/**
 * Simple helper to lookup public holiday for a local ISO date (YYYY-MM-DD).
 */
export function isPublicHoliday(localDateISO: string, holidays: Holiday[] | undefined): boolean {
  return !!holidays?.some(h => h.isPublicHoliday && h.dateISO === localDateISO);
}