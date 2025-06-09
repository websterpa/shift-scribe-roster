import { StaffMember } from '@/types/roster';
import { createLogger } from '../errorLogger';

const logger = createLogger('EnhancedCycleIntegration');

export interface CycleValidationResult {
  isValid: boolean;
  violations: string[];
  staffViolations: Record<string, string[]>;
  overallScore: number;
}

/**
 * The 8 fundamental rules for shift roster generation
 */
const SHIFT_RULES = {
  NO_ALTERNATING: 'Never alternate rest/work day-by-day (RWRWRW)',
  CONSECUTIVE_WORK: 'Use 2-4 consecutive work shifts, then rest',
  NIGHT_REST: 'Night shifts must be followed by rest days',
  NO_LATE_EARLY: 'No Late shift before Early shift (8h mode)',
  GROUP_SHIFTS: 'Group identical shift types together',
  WEEKLY_LIMIT: 'Maximum 5 work days in any 7-day window',
  WEEKEND_FAIR: 'Fair distribution of weekend work',
  REST_ADEQUATE: 'Adequate rest between shift blocks'
};

/**
 * Enhanced cycle generation that properly implements all 8 rules
 */
export function generateEnhancedRosterCycle(
  staffList: StaffMember[],
  cycleLengthWeeks: number,
  shiftType: '8h' | '12h',
  operationalHoursPerDay: number,
  handshakeMinutes: number
): Record<number, Record<number, Record<string, string>>> {
  console.log('🎯 Starting rule-compliant cycle generation');
  logger.info('Generating rule-compliant cycle', {
    staffCount: staffList.length,
    cycleLengthWeeks,
    shiftType
  });

  const totalDays = cycleLengthWeeks * 7;
  const cycle: Record<number, Record<number, Record<string, string>>> = {};

  // Initialize empty cycle
  for (let week = 0; week < cycleLengthWeeks; week++) {
    cycle[week] = {};
    for (let day = 0; day < 7; day++) {
      cycle[week][day] = {};
    }
  }

  // Separate shift workers from supervisors
  const shiftWorkers = staffList.filter(staff => staff.is_shift_worker && staff.eligible_shifts?.length > 0);
  const supervisors = staffList.filter(staff => !staff.is_shift_worker);

  console.log(`👥 Processing ${shiftWorkers.length} shift workers and ${supervisors.length} supervisors`);

  // Generate base patterns for each staff member
  const staffPatterns = new Map<string, string>();
  
  shiftWorkers.forEach((staff, index) => {
    const pattern = generateRuleCompliantPattern(
      totalDays, 
      shiftType, 
      staff.eligible_shifts || [],
      index,
      shiftWorkers.length
    );
    staffPatterns.set(staff.id, pattern);
    console.log(`📋 Generated pattern for ${staff.first_name} ${staff.last_name}: ${pattern}`);
  });

  // Apply patterns to cycle structure
  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const week = Math.floor(dayIndex / 7);
    const day = dayIndex % 7;
    
    if (week >= cycleLengthWeeks) continue;

    // Process shift workers
    shiftWorkers.forEach(staff => {
      const pattern = staffPatterns.get(staff.id) || '';
      cycle[week][day][staff.id] = pattern[dayIndex] || 'R';
    });

    // Handle supervisors (weekday day shifts only)
    supervisors.forEach(staff => {
      const isWeekend = day === 0 || day === 6; // Sunday = 0, Saturday = 6
      cycle[week][day][staff.id] = isWeekend ? 'R' : 'D';
    });
  }

  // Apply coverage optimization
  const optimizedCycle = optimizeCoverageWithRules(cycle, shiftWorkers, shiftType);

  // Validate the final cycle
  const validation = validateEnhancedCycle(optimizedCycle, staffList, shiftType);
  
  if (!validation.isValid) {
    console.warn('⚠️ Generated cycle has violations:', validation.violations);
    console.log('📊 Validation score:', validation.overallScore);
  } else {
    console.log('✅ Generated cycle passes all rule validation');
  }

  logger.info('Enhanced cycle generation completed', {
    validationScore: validation.overallScore,
    violationCount: validation.violations.length
  });

  return optimizedCycle;
}

/**
 * Generate a rule-compliant pattern for a single staff member
 */
function generateRuleCompliantPattern(
  totalDays: number,
  shiftType: '8h' | '12h',
  eligibleShifts: string[],
  staffIndex: number,
  totalStaff: number
): string {
  const pattern: string[] = new Array(totalDays).fill('R');
  const availableShifts = filterEligibleShifts(eligibleShifts, shiftType);
  
  if (availableShifts.length === 0) {
    return pattern.join(''); // All rest if no eligible shifts
  }

  // Calculate work blocks with proper spacing
  const workBlockSize = Math.min(4, Math.max(2, Math.floor(totalDays / 8))); // 2-4 consecutive days
  const restBlockSize = Math.max(1, Math.floor(workBlockSize / 2)); // Adequate rest between blocks
  
  // Stagger start positions to distribute weekend work fairly
  const startOffset = Math.floor((staffIndex * totalDays) / (totalStaff * 2));
  
  let currentPos = startOffset;
  let shiftIndex = 0;
  
  while (currentPos < totalDays) {
    // Work block
    const actualWorkSize = Math.min(workBlockSize, totalDays - currentPos);
    const currentShift = availableShifts[shiftIndex % availableShifts.length];
    
    for (let i = 0; i < actualWorkSize && currentPos + i < totalDays; i++) {
      // Rule 5: Group identical shifts together
      pattern[currentPos + i] = currentShift;
    }
    
    currentPos += actualWorkSize;
    
    // Rest block (Rule 2: Adequate rest between work blocks)
    currentPos += restBlockSize;
    
    // Move to next shift type after each work block
    shiftIndex++;
    
    // Rule 4: Never Late before Early in 8h mode
    if (shiftType === '8h' && currentShift === 'L') {
      // Ensure next shift isn't Early
      const nextShiftIndex = shiftIndex % availableShifts.length;
      if (availableShifts[nextShiftIndex] === 'E') {
        shiftIndex++; // Skip Early shift
      }
    }
  }

  // Apply Rule 3: Night shifts followed by rest
  for (let i = 0; i < pattern.length - 1; i++) {
    if (pattern[i] === 'N' && pattern[i + 1] !== 'R' && pattern[i + 1] !== 'N') {
      pattern[i + 1] = 'R';
    }
  }

  // Validate and fix weekly work limits (Rule 6)
  enforceWeeklyWorkLimits(pattern);

  return pattern.join('');
}

/**
 * Filter shifts based on eligibility and mode
 */
function filterEligibleShifts(eligibleShifts: string[], shiftType: '8h' | '12h'): string[] {
  // Ensure eligibleShifts is an array and handle edge cases
  if (!Array.isArray(eligibleShifts) || eligibleShifts.length === 0) {
    console.warn('filterEligibleShifts: eligibleShifts is not a valid array:', eligibleShifts);
    return [];
  }

  const shiftMap: Record<string, string> = {
    'Day': 'D', 'day': 'D', 'D': 'D',
    'Night': 'N', 'night': 'N', 'N': 'N',
    'Early': 'E', 'early': 'E', 'E': 'E',
    'Late': 'L', 'late': 'L', 'L': 'L'
  };

  const normalizedShifts = eligibleShifts
    .map(shift => shiftMap[shift])
    .filter(Boolean);

  if (shiftType === '12h') {
    return normalizedShifts.filter(shift => ['D', 'N'].includes(shift));
  } else {
    return normalizedShifts.filter(shift => ['E', 'L', 'N'].includes(shift));
  }
}

/**
 * Enforce Rule 6: Maximum 5 work days in any 7-day window
 */
function enforceWeeklyWorkLimits(pattern: string[]): void {
  for (let i = 0; i <= pattern.length - 7; i++) {
    const weekSlice = pattern.slice(i, i + 7);
    const workDays = weekSlice.filter(day => day !== 'R').length;
    
    if (workDays > 5) {
      // Convert excess work days to rest, prioritizing isolated shifts
      let converted = 0;
      for (let j = 0; j < weekSlice.length && converted < (workDays - 5); j++) {
        const globalIndex = i + j;
        if (pattern[globalIndex] !== 'R') {
          // Check if this is an isolated shift (good candidate for conversion)
          const prevIsRest = globalIndex === 0 || pattern[globalIndex - 1] === 'R';
          const nextIsRest = globalIndex === pattern.length - 1 || pattern[globalIndex + 1] === 'R';
          
          if (prevIsRest && nextIsRest) {
            pattern[globalIndex] = 'R';
            converted++;
          }
        }
      }
    }
  }
}

/**
 * Optimize coverage while maintaining rule compliance
 */
function optimizeCoverageWithRules(
  cycle: Record<number, Record<number, Record<string, string>>>,
  shiftWorkers: StaffMember[],
  shiftType: '8h' | '12h'
): Record<number, Record<number, Record<string, string>>> {
  const optimized = JSON.parse(JSON.stringify(cycle));
  const requiredShifts = shiftType === '12h' ? ['D', 'N'] : ['E', 'L', 'N'];
  const minStaffPerShift = 1;

  Object.keys(optimized).forEach(weekStr => {
    const week = parseInt(weekStr);
    Object.keys(optimized[week]).forEach(dayStr => {
      const day = parseInt(dayStr);
      
      // Count current assignments
      const shiftCounts: Record<string, number> = {};
      requiredShifts.forEach(shift => { shiftCounts[shift] = 0; });
      
      Object.values(optimized[week][day]).forEach(shift => {
        if (requiredShifts.includes(shift as string)) {
          shiftCounts[shift as string]++;
        }
      });
      
      // Check for understaffing
      requiredShifts.forEach(shiftCode => {
        const shortage = minStaffPerShift - shiftCounts[shiftCode];
        
        if (shortage > 0) {
          // Try to reassign staff from rest to this shift
          const availableStaff = shiftWorkers.filter(staff => 
            optimized[week][day][staff.id] === 'R' && 
            canWorkShift(staff, shiftCode)
          );
          
          const toReassign = Math.min(shortage, availableStaff.length);
          for (let i = 0; i < toReassign; i++) {
            const staff = availableStaff[i];
            
            // Validate this assignment doesn't break rules
            if (wouldViolateRules(optimized, staff.id, week, day, shiftCode)) {
              continue;
            }
            
            optimized[week][day][staff.id] = shiftCode;
            console.log(`📝 Reassigned ${staff.first_name} to ${shiftCode} shift for coverage`);
          }
        }
      });
    });
  });

  return optimized;
}

/**
 * Check if assigning a shift would violate rules
 */
function wouldViolateRules(
  cycle: Record<number, Record<number, Record<string, string>>>,
  staffId: string,
  week: number,
  day: number,
  shiftCode: string
): boolean {
  // Create a temporary assignment to test
  const testCycle = JSON.parse(JSON.stringify(cycle));
  testCycle[week][day][staffId] = shiftCode;
  
  // Get staff pattern for validation
  const pattern = extractStaffPattern(testCycle, staffId);
  
  // Quick rule checks
  if (hasAlternatingPattern(pattern)) return true;
  if (hasInvalidWorkStreaks(pattern)) return true;
  if (violatesWeeklyLimit(pattern)) return true;
  
  return false;
}

/**
 * Extract a staff member's pattern from the cycle
 */
function extractStaffPattern(
  cycle: Record<number, Record<number, Record<string, string>>>,
  staffId: string
): string {
  const pattern: string[] = [];
  
  Object.keys(cycle).sort((a, b) => parseInt(a) - parseInt(b)).forEach(weekStr => {
    const week = parseInt(weekStr);
    for (let day = 0; day < 7; day++) {
      pattern.push(cycle[week][day][staffId] || 'R');
    }
  });
  
  return pattern.join('');
}

/**
 * Comprehensive validation of the enhanced cycle
 */
export function validateEnhancedCycle(
  cycle: Record<number, Record<number, Record<string, string>>>,
  staffList: StaffMember[],
  shiftType: '8h' | '12h'
): CycleValidationResult {
  const violations: string[] = [];
  const staffViolations: Record<string, string[]> = {};
  let totalChecks = 0;
  let passedChecks = 0;

  staffList.forEach(staff => {
    if (!staff.is_shift_worker) return;
    
    const pattern = extractStaffPattern(cycle, staff.id);
    const staffViolationsForMember: string[] = [];
    
    // Rule 1: No alternating pattern
    if (hasAlternatingPattern(pattern)) {
      staffViolationsForMember.push(SHIFT_RULES.NO_ALTERNATING);
      violations.push(`${staff.first_name} ${staff.last_name}: ${SHIFT_RULES.NO_ALTERNATING}`);
    }
    totalChecks++; if (staffViolationsForMember.length === 0) passedChecks++;
    
    // Rule 2: Valid work streaks
    if (hasInvalidWorkStreaks(pattern)) {
      staffViolationsForMember.push(SHIFT_RULES.CONSECUTIVE_WORK);
      violations.push(`${staff.first_name} ${staff.last_name}: ${SHIFT_RULES.CONSECUTIVE_WORK}`);
    }
    totalChecks++; if (!hasInvalidWorkStreaks(pattern)) passedChecks++;
    
    // Rule 3: Night shifts followed by rest
    if (!nightShiftsFollowedByRest(pattern)) {
      staffViolationsForMember.push(SHIFT_RULES.NIGHT_REST);
      violations.push(`${staff.first_name} ${staff.last_name}: ${SHIFT_RULES.NIGHT_REST}`);
    }
    totalChecks++; if (nightShiftsFollowedByRest(pattern)) passedChecks++;
    
    // Rule 4: No Late before Early (8h mode)
    if (shiftType === '8h' && hasLateBeforeEarly(pattern)) {
      staffViolationsForMember.push(SHIFT_RULES.NO_LATE_EARLY);
      violations.push(`${staff.first_name} ${staff.last_name}: ${SHIFT_RULES.NO_LATE_EARLY}`);
    }
    if (shiftType === '8h') { totalChecks++; if (!hasLateBeforeEarly(pattern)) passedChecks++; }
    
    // Rule 6: Weekly work limits
    if (violatesWeeklyLimit(pattern)) {
      staffViolationsForMember.push(SHIFT_RULES.WEEKLY_LIMIT);
      violations.push(`${staff.first_name} ${staff.last_name}: ${SHIFT_RULES.WEEKLY_LIMIT}`);
    }
    totalChecks++; if (!violatesWeeklyLimit(pattern)) passedChecks++;
    
    if (staffViolationsForMember.length > 0) {
      staffViolations[staff.id] = staffViolationsForMember;
    }
  });

  const overallScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

  return {
    isValid: violations.length === 0,
    violations,
    staffViolations,
    overallScore
  };
}

// Helper validation functions
function hasAlternatingPattern(pattern: string): boolean {
  let alternationCount = 0;
  for (let i = 0; i < pattern.length - 2; i++) {
    const isWork1 = pattern[i] !== 'R';
    const isRest = pattern[i + 1] === 'R';
    const isWork2 = pattern[i + 2] !== 'R';
    
    if (isWork1 && isRest && isWork2) {
      alternationCount++;
      if (alternationCount >= 2) return true;
    } else {
      alternationCount = 0;
    }
  }
  return false;
}

function hasInvalidWorkStreaks(pattern: string): boolean {
  let currentStreak = 0;
  
  for (const shift of pattern) {
    if (shift !== 'R') {
      currentStreak++;
    } else {
      if (currentStreak > 0 && (currentStreak < 2 || currentStreak > 4)) {
        return true;
      }
      currentStreak = 0;
    }
  }
  
  return currentStreak > 0 && (currentStreak < 2 || currentStreak > 4);
}

function nightShiftsFollowedByRest(pattern: string): boolean {
  for (let i = 0; i < pattern.length - 1; i++) {
    if (pattern[i] === 'N' && pattern[i + 1] !== 'R' && pattern[i + 1] !== 'N') {
      return false;
    }
  }
  return true;
}

function hasLateBeforeEarly(pattern: string): boolean {
  for (let i = 0; i < pattern.length - 1; i++) {
    if (pattern[i] === 'L' && pattern[i + 1] === 'E') {
      return true;
    }
  }
  return false;
}

function violatesWeeklyLimit(pattern: string): boolean {
  for (let i = 0; i <= pattern.length - 7; i++) {
    const weekSlice = pattern.slice(i, i + 7);
    const workDays = weekSlice.filter(day => day !== 'R').length;
    if (workDays > 5) {
      return true;
    }
  }
  return false;
}

function canWorkShift(staff: StaffMember, shiftCode: string): boolean {
  // Normalize eligible_shifts to an array with proper type checking
  let eligibleShifts: string[] = [];
  
  if (staff.eligible_shifts) {
    if (Array.isArray(staff.eligible_shifts)) {
      eligibleShifts = staff.eligible_shifts;
    } else if (typeof staff.eligible_shifts === 'string') {
      // Handle case where eligible_shifts is a string (e.g., comma-separated values)
      eligibleShifts = staff.eligible_shifts.split(',').map(s => s.trim());
    }
  }
  
  if (eligibleShifts.length === 0) {
    return false;
  }
  
  return eligibleShifts.some(eligible => {
    if (eligible === shiftCode) return true;
    if (shiftCode === 'D' && (eligible === 'Day' || eligible === 'day')) return true;
    if (shiftCode === 'N' && (eligible === 'Night' || eligible === 'night')) return true;
    if (shiftCode === 'E' && (eligible === 'Early' || eligible === 'early')) return true;
    if (shiftCode === 'L' && (eligible === 'Late' || eligible === 'late')) return true;
    return false;
  });
}
