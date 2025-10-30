/**
 * Working Time Directive (WTD) Validator
 * Enforces UK WTD 1998 rules for roster validation
 */

export interface ShiftRecord {
  staffId: string;
  start: Date;
  end: Date;
}

export interface RestViolation {
  day: string;
  gap: number;
  message: string;
}

/**
 * Checks minimum 11 hours rest between consecutive shifts
 * @param records - Array of shift records for a staff member
 * @returns Array of violation objects (empty if compliant)
 */
export function checkRestPeriods(records: ShiftRecord[]): RestViolation[] {
  console.log('[WTD] Checking rest periods for', records.length, 'shifts');
  
  const violations: RestViolation[] = [];
  const sorted = [...records].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].end;
    const currentStart = sorted[i].start;
    const gapMs = currentStart.getTime() - prevEnd.getTime();
    const gapHours = gapMs / (1000 * 60 * 60);
    
    if (gapHours < 11) {
      const day = currentStart.toISOString().split('T')[0];
      const message = `Only ${gapHours.toFixed(1)}h rest between shifts (11h required)`;
      violations.push({
        day,
        gap: gapHours,
        message
      });
      console.warn('[WTD] Rest violation:', message, 'on', day);
    }
  }
  
  console.log('[WTD] Rest period check complete:', violations.length, 'violations');
  return violations;
}

/**
 * Checks average working hours ≤ 48 hours/week over 17-week reference period
 * @param records - Array of shift records for a staff member
 * @param referencePeriodWeeks - Reference period in weeks (default: 17)
 * @returns true if compliant, false if exceeds limit
 */
export function checkWeeklyAverage(
  records: ShiftRecord[],
  referencePeriodWeeks: number = 17
): boolean {
  console.log('[WTD] Checking weekly average for', records.length, 'shifts over', referencePeriodWeeks, 'weeks');
  
  if (records.length === 0) {
    console.log('[WTD] No shifts to validate');
    return true;
  }
  
  // Calculate total hours worked
  const totalMs = records.reduce((acc, r) => {
    return acc + (r.end.getTime() - r.start.getTime());
  }, 0);
  const totalHours = totalMs / (1000 * 60 * 60);
  
  // Calculate time span covered by records
  const sorted = [...records].sort((a, b) => a.start.getTime() - b.start.getTime());
  const firstShift = sorted[0].start;
  const lastShift = sorted[sorted.length - 1].end;
  const spanMs = lastShift.getTime() - firstShift.getTime();
  const spanWeeks = spanMs / (1000 * 60 * 60 * 24 * 7);
  
  // Use the actual span or reference period, whichever is appropriate
  const periodWeeks = Math.max(spanWeeks, referencePeriodWeeks);
  const avgHoursPerWeek = totalHours / periodWeeks;
  
  const compliant = avgHoursPerWeek <= 48;
  
  console.log('[WTD] Weekly average check:', {
    totalHours: totalHours.toFixed(1),
    periodWeeks: periodWeeks.toFixed(1),
    avgHoursPerWeek: avgHoursPerWeek.toFixed(1),
    limit: 48,
    compliant
  });
  
  return compliant;
}

/**
 * Validate WTD compliance for a staff member
 * @param records - Array of shift records for a staff member
 * @returns Object with compliance status and violations
 */
export function validateWTDCompliance(
  records: ShiftRecord[]
): {
  compliant: boolean;
  restViolations: RestViolation[];
  weeklyAverageCompliant: boolean;
  avgHoursPerWeek: number;
} {
  const restViolations = checkRestPeriods(records);
  const weeklyAverageCompliant = checkWeeklyAverage(records);
  
  // Calculate average for reporting
  const totalMs = records.reduce((acc, r) => acc + (r.end.getTime() - r.start.getTime()), 0);
  const totalHours = totalMs / (1000 * 60 * 60);
  const sorted = [...records].sort((a, b) => a.start.getTime() - b.start.getTime());
  const spanMs = sorted.length > 0 
    ? sorted[sorted.length - 1].end.getTime() - sorted[0].start.getTime()
    : 0;
  const spanWeeks = Math.max(spanMs / (1000 * 60 * 60 * 24 * 7), 17);
  const avgHoursPerWeek = totalHours / spanWeeks;
  
  return {
    compliant: restViolations.length === 0 && weeklyAverageCompliant,
    restViolations,
    weeklyAverageCompliant,
    avgHoursPerWeek: parseFloat(avgHoursPerWeek.toFixed(1))
  };
}

/**
 * Convert roster assignments to ShiftRecord format
 * @param assignments - Roster assignments from database
 * @returns Array of ShiftRecords
 */
export function assignmentsToShiftRecords(
  assignments: Array<{
    staff_id: string;
    date: string;
    shift_code: string;
    shift_start?: string | Date;
    shift_end?: string | Date;
  }>
): ShiftRecord[] {
  const records: ShiftRecord[] = [];
  
  for (const assignment of assignments) {
    // Skip rest days
    if (assignment.shift_code === 'R') continue;
    
    // Parse shift times
    let start: Date;
    let end: Date;
    
    if (assignment.shift_start && assignment.shift_end) {
      start = typeof assignment.shift_start === 'string' 
        ? new Date(assignment.shift_start) 
        : assignment.shift_start;
      end = typeof assignment.shift_end === 'string'
        ? new Date(assignment.shift_end)
        : assignment.shift_end;
    } else {
      // Fallback: infer from shift_code and date
      const date = new Date(assignment.date);
      const shiftTimes = getDefaultShiftTimes(assignment.shift_code);
      start = new Date(`${assignment.date}T${shiftTimes.start}`);
      end = new Date(`${assignment.date}T${shiftTimes.end}`);
      
      // Handle overnight shifts (N crosses midnight)
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
    }
    
    records.push({
      staffId: assignment.staff_id,
      start,
      end
    });
  }
  
  return records;
}

/**
 * Get default shift times based on shift code
 */
function getDefaultShiftTimes(shiftCode: string): { start: string; end: string } {
  const times: Record<string, { start: string; end: string }> = {
    'E': { start: '06:00:00', end: '14:00:00' },
    'L': { start: '14:00:00', end: '22:00:00' },
    'N': { start: '22:00:00', end: '06:00:00' },
    'D': { start: '08:00:00', end: '20:00:00' }, // 12-hour day
  };
  
  return times[shiftCode] || { start: '08:00:00', end: '16:00:00' };
}
