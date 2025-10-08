/**
 * WTD-Compliant Roster Generator for E/L/N systems (8h shifts)
 * Uses constraint-based approach with fairness optimization
 */
import {
  validateStaffWTD,
  isValidTransition,
  DEFAULT_WTD_RULES,
  DEFAULT_SHIFT_TIMES,
  type WTDRules,
  type ShiftTimes,
} from '../constraints/wtdRules';

export interface WTDStaffMember {
  id: string;
  name: string;
  contract_hours_per_week: number;
  is_night_eligible: boolean;
  availability_by_date: Record<string, boolean>; // date → available
  preferences?: {
    preferred_shifts?: string[];
    avoid_shifts?: string[];
  };
  max_consec_days?: number;
  max_consec_nights?: number;
  wtd_opted_out?: boolean;
}

export interface CoverageRequirement {
  date: string;
  E: number;
  L: number;
  N: number;
}

export interface WTDGeneratorInput {
  staff: WTDStaffMember[];
  requirements: CoverageRequirement[];
  rules?: WTDRules;
  shiftTimes?: ShiftTimes;
  fairness_weights?: {
    overall: number;
    nights: number;
    weekends: number;
  };
}

export interface WTDGeneratorResult {
  assignments: Record<string, Record<string, string>>; // staffId → date → shift
  coverage: Record<string, { E: number; L: number; N: number }>;
  violations: Array<{ staffId: string; violations: string[] }>;
  fairness: {
    stdDev: number;
    nightStdDev: number;
    weekendStdDev: number;
  };
}

/**
 * Generate WTD-compliant roster using constraint-based approach
 */
export function generateWTDRoster(
  input: WTDGeneratorInput
): WTDGeneratorResult {
  console.log('[WTD Generator] Starting with', input.staff.length, 'staff');
  
  const rules = input.rules || DEFAULT_WTD_RULES;
  const shiftTimes = input.shiftTimes || DEFAULT_SHIFT_TIMES;
  
  // Initialize assignments
  const assignments: Record<string, Record<string, string>> = {};
  input.staff.forEach(s => {
    assignments[s.id] = {};
    input.requirements.forEach(r => {
      assignments[s.id][r.date] = 'R'; // Start with rest days
    });
  });
  
  // Step 1: Seed night blocks first (hardest to fill)
  console.log('[WTD Generator] Step 1: Seeding night blocks');
  const nightEligibleStaff = input.staff.filter(s => s.is_night_eligible);
  let nightStaffIndex = 0;
  
  for (let dayIdx = 0; dayIdx < input.requirements.length; dayIdx++) {
    const req = input.requirements[dayIdx];
    const date = req.date;
    
    for (let n = 0; n < req.N; n++) {
      let assigned = false;
      let attempts = 0;
      
      while (!assigned && attempts < nightEligibleStaff.length) {
        const staff = nightEligibleStaff[nightStaffIndex % nightEligibleStaff.length];
        nightStaffIndex++;
        attempts++;
        
        // Check availability
        if (staff.availability_by_date[date] === false) continue;
        
        // Check if assignment would violate constraints
        if (canAssign(staff.id, date, 'N', assignments, dayIdx, input.requirements, rules, shiftTimes)) {
          assignments[staff.id][date] = 'N';
          assigned = true;
          
          // Add required rest days after night block
          const consecNights = countConsecutiveNights(staff.id, dayIdx, assignments, input.requirements);
          if (consecNights >= (staff.max_consec_nights || rules.max_consec_nights)) {
            // Force rest days
            for (let r = 1; r <= rules.days_off_after_night_block && dayIdx + r < input.requirements.length; r++) {
              const restDate = input.requirements[dayIdx + r].date;
              assignments[staff.id][restDate] = 'R';
            }
          }
        }
      }
      
      if (!assigned) {
        console.warn(`[WTD Generator] Could not assign night shift for ${date}`);
      }
    }
  }
  
  // Step 2: Fill E and L using round-robin
  console.log('[WTD Generator] Step 2: Filling E and L shifts');
  let staffIndex = 0;
  
  for (let dayIdx = 0; dayIdx < input.requirements.length; dayIdx++) {
    const req = input.requirements[dayIdx];
    const date = req.date;
    
    // Fill E shifts
    for (let e = 0; e < req.E; e++) {
      let assigned = false;
      let attempts = 0;
      
      while (!assigned && attempts < input.staff.length) {
        const staff = input.staff[staffIndex % input.staff.length];
        staffIndex++;
        attempts++;
        
        if (staff.availability_by_date[date] === false) continue;
        if (assignments[staff.id][date] !== 'R') continue; // Already assigned
        
        if (canAssign(staff.id, date, 'E', assignments, dayIdx, input.requirements, rules, shiftTimes)) {
          assignments[staff.id][date] = 'E';
          assigned = true;
        }
      }
    }
    
    // Fill L shifts
    for (let l = 0; l < req.L; l++) {
      let assigned = false;
      let attempts = 0;
      
      while (!assigned && attempts < input.staff.length) {
        const staff = input.staff[staffIndex % input.staff.length];
        staffIndex++;
        attempts++;
        
        if (staff.availability_by_date[date] === false) continue;
        if (assignments[staff.id][date] !== 'R') continue; // Already assigned
        
        if (canAssign(staff.id, date, 'L', assignments, dayIdx, input.requirements, rules, shiftTimes)) {
          assignments[staff.id][date] = 'L';
          assigned = true;
        }
      }
    }
  }
  
  // Step 3: Calculate coverage
  const coverage: Record<string, { E: number; L: number; N: number }> = {};
  input.requirements.forEach(req => {
    coverage[req.date] = { E: 0, L: 0, N: 0 };
    input.staff.forEach(staff => {
      const shift = assignments[staff.id][req.date];
      if (shift === 'E') coverage[req.date].E++;
      else if (shift === 'L') coverage[req.date].L++;
      else if (shift === 'N') coverage[req.date].N++;
    });
  });
  
  // Step 4: Validate all staff
  const violations: Array<{ staffId: string; violations: string[] }> = [];
  input.staff.forEach(staff => {
    const staffAssignments = input.requirements.map(r => assignments[staff.id][r.date]);
    const result = validateStaffWTD(
      staffAssignments,
      rules,
      shiftTimes,
      staff.wtd_opted_out || false
    );
    
    if (!result.valid) {
      violations.push({
        staffId: staff.id,
        violations: result.violations,
      });
    }
  });
  
  // Step 5: Calculate fairness metrics
  const shiftCounts = input.staff.map(s => {
    return input.requirements.filter(r => assignments[s.id][r.date] !== 'R').length;
  });
  
  const nightCounts = input.staff.map(s => {
    return input.requirements.filter(r => assignments[s.id][r.date] === 'N').length;
  });
  
  const fairness = {
    stdDev: calculateStdDev(shiftCounts),
    nightStdDev: calculateStdDev(nightCounts),
    weekendStdDev: 0, // TODO: implement weekend tracking
  };
  
  console.log('[WTD Generator] Complete. Violations:', violations.length);
  
  return {
    assignments,
    coverage,
    violations,
    fairness,
  };
}

/**
 * Check if a shift can be assigned without violating constraints
 */
function canAssign(
  staffId: string,
  date: string,
  shift: string,
  assignments: Record<string, Record<string, string>>,
  dayIdx: number,
  requirements: CoverageRequirement[],
  rules: WTDRules,
  shiftTimes: ShiftTimes
): boolean {
  // Check previous day transition
  if (dayIdx > 0) {
    const prevDate = requirements[dayIdx - 1].date;
    const prevShift = assignments[staffId][prevDate];
    if (prevShift !== 'R' && !isValidTransition(prevShift, shift, shiftTimes, rules.min_daily_rest_hours)) {
      return false;
    }
  }
  
  // Check consecutive days
  const consecDays = countConsecutiveDays(staffId, dayIdx, assignments, requirements);
  if (consecDays >= (rules.max_consec_days || 6)) {
    return false;
  }
  
  // Check consecutive nights
  if (shift === 'N') {
    const consecNights = countConsecutiveNights(staffId, dayIdx, assignments, requirements);
    if (consecNights >= (rules.max_consec_nights || 3)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Count consecutive working days up to current index
 */
function countConsecutiveDays(
  staffId: string,
  currentIdx: number,
  assignments: Record<string, Record<string, string>>,
  requirements: CoverageRequirement[]
): number {
  let count = 0;
  for (let i = currentIdx - 1; i >= 0; i--) {
    const date = requirements[i].date;
    if (assignments[staffId][date] !== 'R') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Count consecutive night shifts up to current index
 */
function countConsecutiveNights(
  staffId: string,
  currentIdx: number,
  assignments: Record<string, Record<string, string>>,
  requirements: CoverageRequirement[]
): number {
  let count = 0;
  for (let i = currentIdx - 1; i >= 0; i--) {
    const date = requirements[i].date;
    if (assignments[staffId][date] === 'N') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}
