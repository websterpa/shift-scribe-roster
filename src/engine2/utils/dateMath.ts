/**
 * Pure date mathematics utilities for engine2
 * Handles midnight boundaries, weekends, and hour calculations safely
 */

export function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 3_600_000;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday=0, Saturday=6
}

export function overlaps(a1: Date, a2: Date, b1: Date, b2: Date): boolean {
  return a1 < b2 && b1 < a2;
}

/**
 * Split a time range into segments at midnight boundaries
 * Handles crossing midnight properly for night shifts
 */
export function clampToMidnightBoundaries(start: Date, end: Date): Date[] {
  const boundaries: Date[] = [new Date(start.getTime())];
  
  let cursor = new Date(start.getTime());
  while (cursor < end) {
    // Advance to next midnight
    const nextMidnight = new Date(cursor.getTime());
    nextMidnight.setHours(24, 0, 0, 0); // This automatically rolls to next day
    
    if (nextMidnight < end) {
      boundaries.push(new Date(nextMidnight.getTime()));
    }
    cursor = nextMidnight;
  }
  
  boundaries.push(new Date(end.getTime()));
  return boundaries;
}

/**
 * Get the local date in YYYY-MM-DD format
 */
export function getLocalDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}