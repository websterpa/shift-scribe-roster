
// Helper functions for date-related operations

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export function isPublicHoliday(date: Date): boolean {
  // This is a basic implementation - you can extend this with actual holiday data
  // For now, we'll return false as a placeholder
  // In a real implementation, you would check against a list of public holidays
  console.log('Public holiday check for:', date.toDateString());
  return false;
}

export function weekdayLabel(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}
