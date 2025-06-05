
import { isWeekend, isPublicHoliday } from "./dateHelpers";

// ≥ 11h rest between end of prev shift and next start
export function hasDailyRest(prevEnd: Date, nextStart: Date): boolean {
  return nextStart.getTime() - prevEnd.getTime() >= 11 * 60 * 60 * 1000;
}

// ≥ 24h off in any 7-day rolling window
export function hasWeeklyRest(assignedDates: Date[]): boolean {
  // assignedDates sorted: check if at least one missing-day in the week
  const daysWorked = new Set(assignedDates.map(d => d.toDateString()));
  for (let offset = 0; offset < 7; offset++) {
    const check = new Date(assignedDates[0]);
    check.setDate(check.getDate() + offset);
    if (!daysWorked.has(check.toDateString())) return true;
  }
  return false;
}

// Check weekly max: <= maxHours unless optedOut
export function withinWeeklyHours(hoursThisWeek: number, maxHours: number, optedOut: boolean): boolean {
  if (optedOut) return true;
  return hoursThisWeek <= maxHours;
}

// Check rolling average over previous (cycleLengthWeeks - 1) + current week
export function withinRollingAverage(pastWeeks: number[], thisWeek: number, maxAvg: number): boolean {
  const sum = pastWeeks.reduce((a, b) => a + b, 0) + thisWeek;
  return sum / pastWeeks.length <= maxAvg;
}
