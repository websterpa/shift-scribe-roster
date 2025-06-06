
import { isUKBankHoliday, isWeekendOrBankHoliday } from "./ukBankHolidays";
import { StaffMember } from "@/types/roster";
import { createLogger } from "./errorLogger";

const logger = createLogger('CostCalculations');

export interface ShiftCost {
  baseHours: number;
  overtimeHours: number;
  basePay: number;
  overtimePay: number;
  holidayPay: number;
  totalPay: number;
  isHoliday: boolean;
  isWeekend: boolean;
}

export interface StaffCostSummary {
  staffId: string;
  staffName: string;
  totalHours: number;
  totalBasePay: number;
  totalOvertimePay: number;
  totalHolidayPay: number;
  totalCost: number;
  shiftsWorked: number;
  holidayShifts: number;
  weekendShifts: number;
}

export interface PeriodCostSummary {
  periodStart: Date;
  periodEnd: Date;
  totalStaffCosts: StaffCostSummary[];
  totalHours: number;
  totalCost: number;
  averageHourlyRate: number;
}

const OVERTIME_THRESHOLD = 37.5; // Standard UK working week
const OVERTIME_MULTIPLIER = 1.5;  // Time and a half
const HOLIDAY_MULTIPLIER = 2.0;   // Double time
const WEEKEND_MULTIPLIER = 1.25;  // Weekend premium

export function calculateShiftCost(
  staff: StaffMember,
  shiftHours: number,
  shiftDate: Date,
  weeklyHoursWorked: number = 0
): ShiftCost {
  if (shiftHours <= 0) {
    return {
      baseHours: 0,
      overtimeHours: 0,
      basePay: 0,
      overtimePay: 0,
      holidayPay: 0,
      totalPay: 0,
      isHoliday: false,
      isWeekend: false
    };
  }

  const baseRate = staff.hourly_rate || 15; // Default minimum wage
  const isHoliday = isUKBankHoliday(shiftDate);
  const isWeekend = !isHoliday && (shiftDate.getDay() === 0 || shiftDate.getDay() === 6);

  logger.debug('Calculating shift cost', {
    staffId: staff.id,
    shiftHours,
    weeklyHoursWorked,
    isHoliday,
    isWeekend,
    baseRate
  });

  // Determine if this shift triggers overtime
  const totalWeeklyHours = weeklyHoursWorked + shiftHours;
  const overtimeThreshold = staff.contract_hours || OVERTIME_THRESHOLD;
  
  let baseHours = shiftHours;
  let overtimeHours = 0;

  if (totalWeeklyHours > overtimeThreshold) {
    const overtimeStart = Math.max(0, overtimeThreshold - weeklyHoursWorked);
    baseHours = Math.max(0, overtimeStart);
    overtimeHours = shiftHours - baseHours;
  }

  // Calculate base pay
  let basePay = baseHours * baseRate;
  let overtimePay = overtimeHours * baseRate * OVERTIME_MULTIPLIER;
  let holidayPay = 0;

  // Apply holiday multiplier (replaces all other multipliers)
  if (isHoliday) {
    const holidayMultiplier = staff.holiday_multiplier || HOLIDAY_MULTIPLIER;
    holidayPay = shiftHours * baseRate * (holidayMultiplier - 1); // Additional pay on top of base
    basePay = shiftHours * baseRate; // Base rate for all hours
    overtimePay = 0; // No separate overtime on holidays
  } else if (isWeekend) {
    // Apply weekend premium
    basePay *= WEEKEND_MULTIPLIER;
    overtimePay *= WEEKEND_MULTIPLIER;
  }

  const totalPay = basePay + overtimePay + holidayPay;

  logger.debug('Shift cost calculated', {
    baseHours,
    overtimeHours,
    basePay,
    overtimePay,
    holidayPay,
    totalPay
  });

  return {
    baseHours,
    overtimeHours,
    basePay,
    overtimePay,
    holidayPay,
    totalPay,
    isHoliday,
    isWeekend
  };
}

export function calculateStaffCostSummary(
  staff: StaffMember,
  shifts: Array<{ date: Date; hours: number }>,
  periodStart: Date,
  periodEnd: Date
): StaffCostSummary {
  const relevantShifts = shifts.filter(shift => 
    shift.date >= periodStart && shift.date <= periodEnd
  );

  let totalHours = 0;
  let totalBasePay = 0;
  let totalOvertimePay = 0;
  let totalHolidayPay = 0;
  let holidayShifts = 0;
  let weekendShifts = 0;

  // Calculate costs week by week to handle overtime correctly
  const shiftsByWeek = groupShiftsByWeek(relevantShifts);

  for (const weekShifts of shiftsByWeek) {
    let weeklyHours = 0;
    
    for (const shift of weekShifts) {
      const shiftCost = calculateShiftCost(staff, shift.hours, shift.date, weeklyHours);
      
      totalHours += shift.hours;
      totalBasePay += shiftCost.basePay;
      totalOvertimePay += shiftCost.overtimePay;
      totalHolidayPay += shiftCost.holidayPay;
      
      if (shiftCost.isHoliday) holidayShifts++;
      if (shiftCost.isWeekend) weekendShifts++;
      
      weeklyHours += shift.hours;
    }
  }

  return {
    staffId: staff.id,
    staffName: staff.name,
    totalHours,
    totalBasePay,
    totalOvertimePay,
    totalHolidayPay,
    totalCost: totalBasePay + totalOvertimePay + totalHolidayPay,
    shiftsWorked: relevantShifts.length,
    holidayShifts,
    weekendShifts
  };
}

export function calculatePeriodCostSummary(
  staffList: StaffMember[],
  allShifts: Record<string, Array<{ date: Date; hours: number }>>,
  periodStart: Date,
  periodEnd: Date
): PeriodCostSummary {
  const totalStaffCosts: StaffCostSummary[] = [];
  
  for (const staff of staffList) {
    const staffShifts = allShifts[staff.id] || [];
    const staffCost = calculateStaffCostSummary(staff, staffShifts, periodStart, periodEnd);
    totalStaffCosts.push(staffCost);
  }

  const totalHours = totalStaffCosts.reduce((sum, staff) => sum + staff.totalHours, 0);
  const totalCost = totalStaffCosts.reduce((sum, staff) => sum + staff.totalCost, 0);
  const averageHourlyRate = totalHours > 0 ? totalCost / totalHours : 0;

  return {
    periodStart,
    periodEnd,
    totalStaffCosts,
    totalHours,
    totalCost,
    averageHourlyRate
  };
}

function groupShiftsByWeek(shifts: Array<{ date: Date; hours: number }>): Array<Array<{ date: Date; hours: number }>> {
  const shiftsByWeek = new Map<string, Array<{ date: Date; hours: number }>>();

  for (const shift of shifts) {
    // Get Monday of the week containing this shift
    const monday = new Date(shift.date);
    monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
    const weekKey = monday.toISOString().split('T')[0];

    if (!shiftsByWeek.has(weekKey)) {
      shiftsByWeek.set(weekKey, []);
    }
    shiftsByWeek.get(weekKey)!.push(shift);
  }

  return Array.from(shiftsByWeek.values());
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
}

export function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  return `${wholeHours}h ${minutes}m`;
}
