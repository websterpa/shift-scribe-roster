import { addDays, differenceInCalendarDays } from 'date-fns';

/**
 * Calculate which index in the cycle pattern a given date corresponds to.
 */
export function cycleIndexOnDate(date: Date, cycleStart: Date, cycleLen: number): number {
  const diff = differenceInCalendarDays(date, cycleStart);
  return ((diff % cycleLen) + cycleLen) % cycleLen;
}

/**
 * Find the first date in the visible month that matches a target cycle index.
 * Searches up to 42 days (6-row calendar grid).
 */
export function firstDateForCycleIndex(
  visibleMonthStartISO: string,   // 'YYYY-MM-01'
  cycleStartISO: string,          // pattern_start_date or fallback to month start
  cycleLen: number,
  targetIdx: number
): Date | null {
  const monthStart = new Date(visibleMonthStartISO);
  const cycleStart = new Date(cycleStartISO || visibleMonthStartISO);
  let d = monthStart;
  
  // Search up to 42 days (6 rows grid) to cover full month view
  for (let i = 0; i < 42; i++) {
    if (cycleIndexOnDate(d, cycleStart, cycleLen) === targetIdx) {
      return d;
    }
    d = addDays(d, 1);
  }
  
  return null;
}
