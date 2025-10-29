/* Migrated from utils/roster — canonical version */

/**
 * Enhanced Shift Cycle Generator with Validation
 * 
 * Generates shift patterns following roster working rules with built-in
 * validation for work streaks, rest periods, and weekly limits.
 * 
 * @module services/roster/helpers/shiftCycleGenerator
 */

export interface ShiftCycleValidation {
  isValid: boolean;
  rules: {
    [key: string]: boolean;
  };
  errors: string[];
  workDayRatio: number;
}

/**
 * Generates a shift cycle pattern following roster rules
 */
export function generateShiftCycle(length: number, mode: '8h' | '12h' = '12h'): string {
  console.log(`🔄 Generating ${mode} shift cycle for ${length} days`);
  
  if (length < 7) {
    throw new Error('Cycle length must be at least 7 days');
  }

  const shifts = mode === '12h' ? ['D', 'N'] : ['E', 'L', 'N'];
  const cycle: string[] = [];
  
  let workStreak = 0;
  let lastShift = '';
  let weekWorkDays = 0;
  let dayOfWeek = 0;
  
  for (let day = 0; day < length; day++) {
    let currentShift = 'R'; // Default to rest
    
    // Check if we can work based on weekly limit (max 5 work days per 7-day window)
    const canWork = weekWorkDays < 5;
    
    // Reset week counter
    if (dayOfWeek === 7) {
      dayOfWeek = 0;
      weekWorkDays = 0;
    }
    
    // Determine if we should work today
    const shouldWork = canWork && workStreak < 4 && (workStreak > 0 || Math.random() > 0.3);
    
    if (shouldWork) {
      // Select appropriate shift
      if (mode === '12h') {
        // Alternate between Day and Night, but group them
        if (lastShift === 'D' && workStreak < 3) {
          currentShift = 'D';
        } else if (lastShift === 'N' && workStreak < 2) {
          currentShift = 'N';
        } else {
          currentShift = workStreak % 2 === 0 ? 'D' : 'N';
        }
      } else {
        // 8h mode: E, L, N - avoid L before E
        if (lastShift === 'L') {
          currentShift = workStreak < 2 ? 'L' : 'N'; // Never E after L
        } else if (lastShift === 'E' && workStreak < 3) {
          currentShift = Math.random() > 0.5 ? 'E' : 'L';
        } else if (lastShift === 'N' && workStreak < 2) {
          currentShift = 'N';
        } else {
          // Start new work block
          const shiftOptions = lastShift === 'L' ? ['N'] : shifts;
          currentShift = shiftOptions[Math.floor(Math.random() * shiftOptions.length)];
        }
      }
      
      workStreak++;
      weekWorkDays++;
    } else {
      // Rest day
      currentShift = 'R';
      
      // Special rule: After Night shift, ensure adequate rest
      if (lastShift === 'N') {
        // Force at least 1-2 rest days after night shift
        const nextDay = day + 1;
        if (nextDay < length && workStreak >= 2) {
          cycle.push('R');
          day++;
          dayOfWeek++;
          workStreak = 0;
        }
      }
      
      workStreak = 0;
    }
    
    cycle.push(currentShift);
    lastShift = currentShift === 'R' ? lastShift : currentShift;
    dayOfWeek++;
  }
  
  // Post-process to ensure rules compliance
  const processedCycle = postProcessCycle(cycle, mode);
  
  console.log('✅ Generated cycle:', processedCycle.join(''));
  return processedCycle.join('');
}

/**
 * Post-processes the cycle to ensure rule compliance
 */
function postProcessCycle(cycle: string[], mode: '8h' | '12h'): string[] {
  const result = [...cycle];
  
  // Fix L->E violations (rule 4)
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i] === 'L' && result[i + 1] === 'E') {
      result[i + 1] = 'R'; // Convert E to R to avoid L->E
    }
  }
  
  // Ensure night shifts are followed by adequate rest
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i] === 'N' && ['E', 'L', 'D'].includes(result[i + 1])) {
      result[i + 1] = 'R';
    }
  }
  
  // Prevent day-by-day alternation (rule 1)
  for (let i = 0; i < result.length - 2; i++) {
    if (result[i] !== 'R' && result[i + 1] === 'R' && result[i + 2] !== 'R' && result[i + 2] !== result[i]) {
      // This creates alternation, extend the rest period
      result[i + 2] = 'R';
    }
  }
  
  return result;
}

/**
 * Validates a shift cycle against all rules
 */
export function validateShiftCycle(cycle: string, mode: '8h' | '12h'): ShiftCycleValidation {
  const shifts = cycle.split('');
  const rules: { [key: string]: boolean } = {};
  const errors: string[] = [];
  
  // Rule 1: Never alternate R/W day-by-day
  rules['No day-by-day alternation'] = !hasAlternatingPattern(shifts);
  if (!rules['No day-by-day alternation']) {
    errors.push('Found day-by-day work/rest alternation (RLRLR pattern)');
  }
  
  // Rule 2: Use 2-4 consecutive work shifts
  rules['2-4 consecutive work shifts'] = hasValidWorkStreaks(shifts);
  if (!rules['2-4 consecutive work shifts']) {
    errors.push('Work streaks must be 2-4 consecutive shifts');
  }
  
  // Rule 3: Night shifts followed by rest
  rules['Night shifts followed by rest'] = nightShiftsFollowedByRest(shifts);
  if (!rules['Night shifts followed by rest']) {
    errors.push('Night shifts must be followed by rest days');
  }
  
  // Rule 4: No Late before Early (8h mode only)
  if (mode === '8h') {
    rules['No Late before Early'] = !hasLateBeforeEarly(shifts);
    if (!rules['No Late before Early']) {
      errors.push('Late shifts cannot be immediately followed by Early shifts');
    }
  }
  
  // Rule 5: Group identical shift types
  rules['Grouped identical shifts'] = hasGroupedShifts(shifts);
  if (!rules['Grouped identical shifts']) {
    errors.push('Identical shift types should be grouped together');
  }
  
  // Rule 6: No more than 5 work days in 7-day window
  rules['Max 5 work days per week'] = respectsWeeklyWorkLimit(shifts);
  if (!rules['Max 5 work days per week']) {
    errors.push('More than 5 work days found in 7-day window');
  }
  
  // Calculate work day ratio
  const workDays = shifts.filter(s => s !== 'R').length;
  const workDayRatio = workDays / shifts.length;
  
  const isValid = Object.values(rules).every(passed => passed);
  
  return {
    isValid,
    rules,
    errors,
    workDayRatio
  };
}

// Validation helper functions
function hasAlternatingPattern(shifts: string[]): boolean {
  let alternationCount = 0;
  for (let i = 0; i < shifts.length - 2; i++) {
    const isWork1 = shifts[i] !== 'R';
    const isRest = shifts[i + 1] === 'R';
    const isWork2 = shifts[i + 2] !== 'R';
    
    if (isWork1 && isRest && isWork2) {
      alternationCount++;
      if (alternationCount >= 2) return true;
    } else {
      alternationCount = 0;
    }
  }
  return false;
}

function hasValidWorkStreaks(shifts: string[]): boolean {
  let currentStreak = 0;
  
  for (const shift of shifts) {
    if (shift !== 'R') {
      currentStreak++;
    } else {
      if (currentStreak > 0 && (currentStreak < 2 || currentStreak > 4)) {
        return false;
      }
      currentStreak = 0;
    }
  }
  
  // Check final streak
  if (currentStreak > 0 && (currentStreak < 2 || currentStreak > 4)) {
    return false;
  }
  
  return true;
}

function nightShiftsFollowedByRest(shifts: string[]): boolean {
  for (let i = 0; i < shifts.length - 1; i++) {
    if (shifts[i] === 'N' && shifts[i + 1] !== 'R' && shifts[i + 1] !== 'N') {
      return false;
    }
  }
  return true;
}

function hasLateBeforeEarly(shifts: string[]): boolean {
  for (let i = 0; i < shifts.length - 1; i++) {
    if (shifts[i] === 'L' && shifts[i + 1] === 'E') {
      return true;
    }
  }
  return false;
}

function hasGroupedShifts(shifts: string[]): boolean {
  // This is a simplified check - in practice, identical shifts should be grouped
  // We'll check that we don't have scattered single shifts of the same type
  const shiftCounts = new Map<string, number>();
  let prevShift = '';
  
  for (const shift of shifts) {
    if (shift !== 'R') {
      if (shift !== prevShift) {
        shiftCounts.set(shift, (shiftCounts.get(shift) || 0) + 1);
      }
      prevShift = shift;
    } else {
      prevShift = '';
    }
  }
  
  // If a shift type appears more than twice as separate groups, it's not well grouped
  return Array.from(shiftCounts.values()).every(count => count <= 2);
}

function respectsWeeklyWorkLimit(shifts: string[]): boolean {
  for (let i = 0; i <= shifts.length - 7; i++) {
    const weekShifts = shifts.slice(i, i + 7);
    const workDays = weekShifts.filter(s => s !== 'R').length;
    if (workDays > 5) {
      return false;
    }
  }
  return true;
}

/**
 * Integration function for existing roster generation
 */
export function generateCycleForRoster(
  staffCount: number,
  cycleLengthWeeks: number,
  shiftType: '8h' | '12h',
  balanceWeekends: boolean = true
): Record<string, string> {
  const totalDays = cycleLengthWeeks * 7;
  const baseCycle = generateShiftCycle(totalDays, shiftType);
  
  // For multiple staff, we can rotate the base cycle
  const staffCycles: Record<string, string> = {};
  
  for (let staffIndex = 0; staffIndex < staffCount; staffIndex++) {
    // Rotate the cycle for each staff member to distribute weekend work
    const rotationOffset = balanceWeekends ? Math.floor((staffIndex * totalDays) / staffCount) : 0;
    const rotatedCycle = rotateCycle(baseCycle, rotationOffset);
    staffCycles[`staff_${staffIndex}`] = rotatedCycle;
  }
  
  return staffCycles;
}

function rotateCycle(cycle: string, offset: number): string {
  if (offset === 0) return cycle;
  const shifts = cycle.split('');
  const rotated = [...shifts.slice(offset), ...shifts.slice(0, offset)];
  return rotated.join('');
}
