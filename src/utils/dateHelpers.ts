
// Helper functions for date-related operations

import { isUKBankHoliday } from "./ukBankHolidays";

export function toDate(year: number, dayOfYear: number): Date {
  const d = new Date(year, 0);
  d.setDate(dayOfYear);
  return d;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export function isPublicHoliday(date: Date): boolean {
  return isUKBankHoliday(date);
}

export function weekdayLabel(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = startDate.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short' 
  });
  const end = endDate.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  
  return `${start} - ${end}`;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
}

export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}
