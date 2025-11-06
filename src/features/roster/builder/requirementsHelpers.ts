/**
 * Helper functions for staffing requirements management
 */

type Framework = "8h" | "12h";
type DayType = "weekdays" | "saturday" | "sunday";

interface DayTypeValues {
  E: number;
  L: number;
  N: number;
  D: number;
}

/**
 * Copy weekday requirements to both saturday and sunday
 * Works for both 8h (E/L/N) and 12h (D/N) frameworks
 */
export function copyWeekdayToWeekend(
  values: Record<DayType, DayTypeValues>,
  framework: Framework
): Record<DayType, DayTypeValues> {
  const result = structuredClone(values);
  const weekday = values.weekdays;

  if (framework === "8h") {
    result.saturday = { E: weekday.E, L: weekday.L, N: weekday.N, D: 0 };
    result.sunday = { E: weekday.E, L: weekday.L, N: weekday.N, D: 0 };
  } else {
    result.saturday = { D: weekday.D, N: weekday.N, E: 0, L: 0 };
    result.sunday = { D: weekday.D, N: weekday.N, E: 0, L: 0 };
  }

  return result;
}

/**
 * Check if weekend values differ from weekday values
 */
export function weekendDiffersFromWeekday(
  values: Record<DayType, DayTypeValues>,
  framework: Framework
): boolean {
  const { weekdays, saturday, sunday } = values;

  if (framework === "8h") {
    return (
      saturday.E !== weekdays.E ||
      saturday.L !== weekdays.L ||
      saturday.N !== weekdays.N ||
      sunday.E !== weekdays.E ||
      sunday.L !== weekdays.L ||
      sunday.N !== weekdays.N
    );
  } else {
    return (
      saturday.D !== weekdays.D ||
      saturday.N !== weekdays.N ||
      sunday.D !== weekdays.D ||
      sunday.N !== weekdays.N
    );
  }
}
