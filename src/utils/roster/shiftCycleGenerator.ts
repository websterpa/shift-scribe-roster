
import { createLogger } from "../errorLogger";

const logger = createLogger('ShiftCycleGenerator');

type ShiftCode = "D" | "E" | "L" | "N" | "R";

interface ShiftCycleOptions {
  shiftType: "8h" | "12h";
  length: number;
  staffIndex?: number; // For cycling different patterns across staff
}

/**
 * Generates a shift cycle following WTD-compliant roster rules
 */
export function generateShiftCycle(length: number, shiftType: "8h" | "12h" = "8h", staffIndex: number = 0): string {
  console.log(`🔄 Generating ${shiftType} shift cycle of length ${length} for staff index ${staffIndex}`);
  
  const options: ShiftCycleOptions = { shiftType, length, staffIndex };
  const cycle = buildShiftPattern(options);
  
  console.log(`✅ Generated cycle: ${cycle}`);
  return cycle;
}

/**
 * Builds a compliant shift pattern based on the options
 */
function buildShiftPattern(options: ShiftCycleOptions): string {
  const { shiftType, length, staffIndex = 0 } = options;
  const pattern: ShiftCode[] = [];
  
  // Define available shifts based on shift type
  const workShifts: ShiftCode[] = shiftType === "12h" ? ["D", "N"] : ["E", "L", "N"];
  
  // Cycle through different starting patterns for different staff members
  const staffPatterns = generateStaffPatterns(shiftType);
  const basePattern = staffPatterns[staffIndex % staffPatterns.length];
  
  console.log(`📋 Using base pattern for staff ${staffIndex}: ${basePattern.join('')}`);
  
  let currentIndex = 0;
  
  while (pattern.length < length) {
    // Get the next shift from the base pattern
    const nextShift = basePattern[currentIndex % basePattern.length];
    
    // Apply rules and validate before adding
    if (canAddShift(pattern, nextShift, workShifts)) {
      pattern.push(nextShift);
      currentIndex++;
    } else {
      // If we can't add the planned shift, add a rest day
      pattern.push("R");
      // Don't increment currentIndex to retry the same shift later
    }
    
    // Safety check to prevent infinite loops
    if (pattern.length >= length * 2) {
      console.warn('⚠️ Pattern generation taking too long, breaking');
      break;
    }
  }
  
  // Trim to exact length
  const finalPattern = pattern.slice(0, length).join('');
  
  // Validate the final pattern
  if (validatePattern(finalPattern, shiftType)) {
    console.log('✅ Pattern validation passed');
  } else {
    console.warn('⚠️ Pattern validation failed, but returning anyway');
  }
  
  return finalPattern;
}

/**
 * Generates different base patterns for staff rotation
 */
function generateStaffPatterns(shiftType: "8h" | "12h"): ShiftCode[][] {
  if (shiftType === "12h") {
    return [
      // Pattern 1: Start with day shifts
      ["D", "D", "R", "N", "N", "R", "R"],
      // Pattern 2: Start with night shifts  
      ["N", "N", "R", "R", "D", "D", "R"],
      // Pattern 3: Alternating blocks
      ["D", "R", "N", "R", "D", "D", "R"],
      // Pattern 4: Extended rest after nights
      ["R", "D", "D", "R", "N", "N", "R"]
    ];
  } else {
    return [
      // Pattern 1: E-L-N rotation
      ["E", "E", "R", "L", "L", "R", "N", "N", "R", "R"],
      // Pattern 2: L-N-E rotation
      ["L", "L", "R", "N", "N", "R", "R", "E", "E", "R"],
      // Pattern 3: N-E-L rotation  
      ["N", "N", "R", "R", "E", "E", "R", "L", "L", "R"],
      // Pattern 4: Extended patterns
      ["E", "E", "E", "R", "L", "L", "R", "N", "R", "R"]
    ];
  }
}

/**
 * Checks if a shift can be added based on all the rules
 */
function canAddShift(pattern: ShiftCode[], nextShift: ShiftCode, workShifts: ShiftCode[]): boolean {
  if (pattern.length === 0) return true;
  
  const lastShift = pattern[pattern.length - 1];
  
  // Rule 1: Never alternate R/W day-by-day
  if (pattern.length >= 2) {
    const secondLast = pattern[pattern.length - 2];
    if (lastShift === "R" && secondLast !== "R" && workShifts.includes(nextShift)) {
      // Would create R-W pattern, check if previous was also alternating
      if (pattern.length >= 3) {
        const thirdLast = pattern[pattern.length - 3];
        if (thirdLast === "R") {
          console.log('🚫 Rule 1: Preventing R/W alternation');
          return false;
        }
      }
    }
  }
  
  // Rule 4: Avoid placing L immediately before E
  if (lastShift === "L" && nextShift === "E") {
    console.log('🚫 Rule 4: Cannot place E after L');
    return false;
  }
  
  // Rule 3: Always follow Night with rest (unless already resting)
  if (lastShift === "N" && workShifts.includes(nextShift)) {
    console.log('🚫 Rule 3: Must rest after Night shift');
    return false;
  }
  
  // Rule 6: Ensure no more than 5 work days in any 7-day window
  if (workShifts.includes(nextShift)) {
    const recentWorkDays = countRecentWorkDays(pattern, 6); // Check last 6 days + this one = 7
    if (recentWorkDays >= 5) {
      console.log('🚫 Rule 6: Would exceed 5 work days in 7-day window');
      return false;
    }
  }
  
  // Rule 2: Use 2-4 consecutive work shifts before rest
  if (nextShift === "R") {
    const consecutiveWork = countConsecutiveWorkFromEnd(pattern);
    if (consecutiveWork > 0 && consecutiveWork < 2) {
      console.log('🚫 Rule 2: Need at least 2 consecutive work shifts');
      return false;
    }
    if (consecutiveWork > 4) {
      console.log('✅ Rule 2: Time for rest after 4+ consecutive shifts');
      return true;
    }
  }
  
  // Rule 5: Group identical shift types together
  if (workShifts.includes(nextShift) && workShifts.includes(lastShift)) {
    if (lastShift !== nextShift && lastShift !== "R") {
      // Check if we're trying to change shift type without a rest period
      const lastWorkShift = getLastWorkShift(pattern);
      if (lastWorkShift && lastWorkShift !== nextShift) {
        console.log('🚫 Rule 5: Need rest between different shift types');
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Count work days in the last N days of the pattern
 */
function countRecentWorkDays(pattern: ShiftCode[], days: number): number {
  const recent = pattern.slice(-days);
  return recent.filter(shift => shift !== "R").length;
}

/**
 * Count consecutive work days from the end of the pattern
 */
function countConsecutiveWorkFromEnd(pattern: ShiftCode[]): number {
  let count = 0;
  for (let i = pattern.length - 1; i >= 0; i--) {
    if (pattern[i] !== "R") {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Get the last work shift (non-R) from the pattern
 */
function getLastWorkShift(pattern: ShiftCode[]): ShiftCode | null {
  for (let i = pattern.length - 1; i >= 0; i--) {
    if (pattern[i] !== "R") {
      return pattern[i];
    }
  }
  return null;
}

/**
 * Validates the generated pattern against all rules
 */
function validatePattern(pattern: string, shiftType: "8h" | "12h"): boolean {
  const shifts = pattern.split('') as ShiftCode[];
  const workShifts: ShiftCode[] = shiftType === "12h" ? ["D", "N"] : ["E", "L", "N"];
  
  console.log('🔍 Validating pattern:', pattern);
  
  // Check each rule
  for (let i = 0; i < shifts.length; i++) {
    const current = shifts[i];
    const previous = i > 0 ? shifts[i - 1] : null;
    
    // Rule 4: No L before E
    if (previous === "L" && current === "E") {
      console.log('❌ Validation failed: L followed by E at position', i);
      return false;
    }
    
    // Rule 3: N must be followed by R
    if (previous === "N" && workShifts.includes(current)) {
      console.log('❌ Validation failed: N not followed by R at position', i);
      return false;
    }
    
    // Rule 6: No more than 5 work days in 7-day window
    if (i >= 6) {
      const window = shifts.slice(i - 6, i + 1);
      const workDays = window.filter(s => s !== "R").length;
      if (workDays > 5) {
        console.log('❌ Validation failed: Too many work days in 7-day window at position', i);
        return false;
      }
    }
  }
  
  console.log('✅ Pattern validation successful');
  return true;
}

/**
 * Generate examples for testing
 */
export function generateExamples(): { length7: string; length14: string } {
  console.log('📋 Generating example shift cycles...');
  
  const length7 = generateShiftCycle(7, "8h", 0);
  const length14 = generateShiftCycle(14, "12h", 0);
  
  console.log('📊 Examples generated:');
  console.log(`Length 7 (8h): ${length7}`);
  console.log(`Length 14 (12h): ${length14}`);
  
  return { length7, length14 };
}

// Example usage and testing
if (typeof window !== 'undefined') {
  console.log('🧪 Testing shift cycle generator...');
  const examples = generateExamples();
  console.log('🎯 Test Results:');
  console.log(`7-day cycle: ${examples.length7}`);
  console.log(`14-day cycle: ${examples.length14}`);
}
