
import { createLogger } from "./errorLogger";

const logger = createLogger('UKBankHolidays');

// UK Bank Holidays for 2024-2026 (extensible)
const UK_BANK_HOLIDAYS: Record<string, Date[]> = {
  "2024": [
    new Date(2024, 0, 1),   // New Year's Day
    new Date(2024, 2, 29),  // Good Friday
    new Date(2024, 3, 1),   // Easter Monday
    new Date(2024, 4, 6),   // Early May Bank Holiday
    new Date(2024, 4, 27),  // Spring Bank Holiday
    new Date(2024, 7, 26),  // Summer Bank Holiday
    new Date(2024, 11, 25), // Christmas Day
    new Date(2024, 11, 26), // Boxing Day
  ],
  "2025": [
    new Date(2025, 0, 1),   // New Year's Day
    new Date(2025, 3, 18),  // Good Friday
    new Date(2025, 3, 21),  // Easter Monday
    new Date(2025, 4, 5),   // Early May Bank Holiday
    new Date(2025, 4, 26),  // Spring Bank Holiday
    new Date(2025, 7, 25),  // Summer Bank Holiday
    new Date(2025, 11, 25), // Christmas Day
    new Date(2025, 11, 26), // Boxing Day
  ],
  "2026": [
    new Date(2026, 0, 1),   // New Year's Day
    new Date(2026, 3, 3),   // Good Friday
    new Date(2026, 3, 6),   // Easter Monday
    new Date(2026, 4, 4),   // Early May Bank Holiday
    new Date(2026, 4, 25),  // Spring Bank Holiday
    new Date(2026, 7, 31),  // Summer Bank Holiday
    new Date(2026, 11, 25), // Christmas Day
    new Date(2026, 11, 28), // Boxing Day (substitute)
  ]
};

export function isUKBankHoliday(date: Date): boolean {
  const year = date.getFullYear().toString();
  const holidays = UK_BANK_HOLIDAYS[year];
  
  if (!holidays) {
    logger.warn(`No bank holiday data available for year ${year}`);
    return false;
  }
  
  return holidays.some(holiday => 
    holiday.getDate() === date.getDate() &&
    holiday.getMonth() === date.getMonth() &&
    holiday.getFullYear() === date.getFullYear()
  );
}

export function getUKBankHolidays(year: number): Date[] {
  return UK_BANK_HOLIDAYS[year.toString()] || [];
}

export function getNextUKBankHoliday(fromDate: Date = new Date()): Date | null {
  const currentYear = fromDate.getFullYear();
  const nextYear = currentYear + 1;
  
  // Check current year holidays
  let holidays = getUKBankHolidays(currentYear);
  let upcomingHolidays = holidays.filter(holiday => holiday > fromDate);
  
  // If no upcoming holidays this year, check next year
  if (upcomingHolidays.length === 0) {
    holidays = getUKBankHolidays(nextYear);
    upcomingHolidays = holidays;
  }
  
  return upcomingHolidays.length > 0 ? upcomingHolidays[0] : null;
}

export function isWeekendOrBankHoliday(date: Date): boolean {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  return isWeekend || isUKBankHoliday(date);
}
