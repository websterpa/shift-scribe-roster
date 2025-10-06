/**
 * Core costing utilities for shift calculations
 */

/**
 * Calculate duration in hours between two dates
 */
export function durationHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Calculate shift cost with differentials and multipliers
 */
export function shiftCost(
  start: Date,
  end: Date,
  hourlyRate: number,
  options?: {
    isNight?: boolean;
    isWeekend?: boolean;
    isHoliday?: boolean;
    nightDifferential?: number;
    weekendDifferential?: number;
    holidayMultiplier?: number;
  }
): number {
  const hours = durationHours(start, end);
  let baseCost = hours * hourlyRate;

  // Apply differentials (additive)
  if (options?.isNight && options?.nightDifferential) {
    baseCost += hours * hourlyRate * options.nightDifferential;
  }
  if (options?.isWeekend && options?.weekendDifferential) {
    baseCost += hours * hourlyRate * options.weekendDifferential;
  }

  // Apply holiday multiplier (multiplicative)
  if (options?.isHoliday && options?.holidayMultiplier) {
    baseCost *= options.holidayMultiplier;
  }

  return baseCost;
}
