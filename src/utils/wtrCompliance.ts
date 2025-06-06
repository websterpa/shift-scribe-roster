
import { isWeekend, isPublicHoliday } from "./dateHelpers";
import { createLogger } from "./errorLogger";

const logger = createLogger('WTDCompliance');

// Working Time Directive constants
export const WTD_CONSTANTS = {
  MAX_WEEKLY_HOURS: 48,
  MAX_DAILY_HOURS: 13, // Including rest breaks
  MIN_DAILY_REST_HOURS: 11,
  MIN_WEEKLY_REST_HOURS: 24,
  ROLLING_AVERAGE_WEEKS: 17,
  MAX_NIGHT_HOURS_PER_24H: 8,
} as const;

export interface WTDComplianceResult {
  compliant: boolean;
  violations: string[];
  weeklyHours: number;
  rollingAverage: number;
  canWork: boolean;
}

export interface WeeklyHours {
  weekStart: Date;
  hours: number;
  overtime: number;
}

// ≥ 11h rest between end of prev shift and next start
export function hasDailyRest(prevEnd: Date, nextStart: Date): boolean {
  const restHours = (nextStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60);
  return restHours >= WTD_CONSTANTS.MIN_DAILY_REST_HOURS;
}

// ≥ 24h off in any 7-day rolling window
export function hasWeeklyRest(assignedDates: Date[]): boolean {
  if (assignedDates.length === 0) return true;
  
  // Sort dates
  const sortedDates = [...assignedDates].sort((a, b) => a.getTime() - b.getTime());
  const daysWorked = new Set(sortedDates.map(d => d.toDateString()));
  
  // Check if there's at least one day off in any 7-day period
  for (let i = 0; i <= sortedDates.length - 7; i++) {
    const weekStart = sortedDates[i];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    let hasRestDay = false;
    for (let d = 0; d < 7; d++) {
      const checkDate = new Date(weekStart);
      checkDate.setDate(checkDate.getDate() + d);
      if (!daysWorked.has(checkDate.toDateString())) {
        hasRestDay = true;
        break;
      }
    }
    
    if (!hasRestDay) return false;
  }
  
  return true;
}

// Check weekly max: <= maxHours unless optedOut
export function withinWeeklyHours(hoursThisWeek: number, maxHours: number, optedOut: boolean): boolean {
  if (optedOut) {
    logger.debug('Staff opted out of WTD - no weekly limit applied');
    return true;
  }
  return hoursThisWeek <= maxHours;
}

// Calculate rolling average over 17-week period
export function calculateRollingAverage(weeklyHours: WeeklyHours[]): number {
  if (weeklyHours.length === 0) return 0;
  
  // Sort by week start date (most recent first)
  const sortedWeeks = [...weeklyHours].sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  
  // Take the most recent 17 weeks (or fewer if not available)
  const relevantWeeks = sortedWeeks.slice(0, WTD_CONSTANTS.ROLLING_AVERAGE_WEEKS);
  
  if (relevantWeeks.length === 0) return 0;
  
  const totalHours = relevantWeeks.reduce((sum, week) => sum + week.hours, 0);
  return totalHours / relevantWeeks.length;
}

// Check rolling average compliance
export function withinRollingAverage(weeklyHours: WeeklyHours[], maxAvg: number = WTD_CONSTANTS.MAX_WEEKLY_HOURS): boolean {
  const average = calculateRollingAverage(weeklyHours);
  return average <= maxAvg;
}

// Comprehensive WTD compliance check
export function checkWTDCompliance(
  staffId: string,
  weeklyHours: WeeklyHours[],
  proposedWeeklyHours: number,
  optedOut: boolean = false,
  lastShiftEnd?: Date,
  nextShiftStart?: Date
): WTDComplianceResult {
  const violations: string[] = [];
  let compliant = true;

  logger.debug('Checking WTD compliance', { 
    staffId, 
    proposedWeeklyHours, 
    optedOut,
    historicalWeeks: weeklyHours.length 
  });

  // 1. Check weekly hours limit
  if (!withinWeeklyHours(proposedWeeklyHours, WTD_CONSTANTS.MAX_WEEKLY_HOURS, optedOut)) {
    violations.push(`Weekly hours (${proposedWeeklyHours}h) exceed limit (${WTD_CONSTANTS.MAX_WEEKLY_HOURS}h)`);
    compliant = false;
  }

  // 2. Check rolling average (only if not opted out)
  if (!optedOut && weeklyHours.length > 0) {
    // Add proposed week to calculate new rolling average
    const testWeek: WeeklyHours = {
      weekStart: new Date(),
      hours: proposedWeeklyHours,
      overtime: Math.max(0, proposedWeeklyHours - WTD_CONSTANTS.MAX_WEEKLY_HOURS)
    };
    
    const testWeeklyHours = [testWeek, ...weeklyHours];
    if (!withinRollingAverage(testWeeklyHours)) {
      const newAverage = calculateRollingAverage(testWeeklyHours);
      violations.push(`Rolling average (${newAverage.toFixed(1)}h) exceeds 48h over ${WTD_CONSTANTS.ROLLING_AVERAGE_WEEKS} weeks`);
      compliant = false;
    }
  }

  // 3. Check daily rest periods
  if (lastShiftEnd && nextShiftStart) {
    if (!hasDailyRest(lastShiftEnd, nextShiftStart)) {
      const restHours = (nextShiftStart.getTime() - lastShiftEnd.getTime()) / (1000 * 60 * 60);
      violations.push(`Insufficient daily rest (${restHours.toFixed(1)}h) - minimum ${WTD_CONSTANTS.MIN_DAILY_REST_HOURS}h required`);
      compliant = false;
    }
  }

  const rollingAverage = calculateRollingAverage(weeklyHours);
  
  return {
    compliant,
    violations,
    weeklyHours: proposedWeeklyHours,
    rollingAverage,
    canWork: compliant || optedOut
  };
}

// Generate WTD compliance report for a staff member
export function generateComplianceReport(
  staffId: string,
  staffName: string,
  weeklyHours: WeeklyHours[],
  optedOut: boolean = false
): {
  staffId: string;
  staffName: string;
  currentAverage: number;
  weeksAnalyzed: number;
  optedOut: boolean;
  status: 'compliant' | 'at-risk' | 'non-compliant';
  recommendations: string[];
} {
  const currentAverage = calculateRollingAverage(weeklyHours);
  const weeksAnalyzed = Math.min(weeklyHours.length, WTD_CONSTANTS.ROLLING_AVERAGE_WEEKS);
  
  let status: 'compliant' | 'at-risk' | 'non-compliant' = 'compliant';
  const recommendations: string[] = [];

  if (!optedOut) {
    if (currentAverage > WTD_CONSTANTS.MAX_WEEKLY_HOURS) {
      status = 'non-compliant';
      recommendations.push('Reduce weekly hours to bring rolling average below 48h');
    } else if (currentAverage > 45) {
      status = 'at-risk';
      recommendations.push('Monitor closely - approaching 48h limit');
    }

    if (weeksAnalyzed < WTD_CONSTANTS.ROLLING_AVERAGE_WEEKS) {
      recommendations.push(`Need ${WTD_CONSTANTS.ROLLING_AVERAGE_WEEKS - weeksAnalyzed} more weeks of data for full compliance assessment`);
    }
  } else {
    recommendations.push('Staff has opted out of WTD - monitor for health and safety');
  }

  return {
    staffId,
    staffName,
    currentAverage,
    weeksAnalyzed,
    optedOut,
    status,
    recommendations
  };
}
