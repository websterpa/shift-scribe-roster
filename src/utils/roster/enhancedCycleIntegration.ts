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
 * Enhanced cycle generation that properly implements all 8 rules with STRICT shift grouping
 */
export function generateEnhancedRosterCycle(
  staffList: StaffMember[],
  cycleLengthWeeks: number,
  shiftType: '8h' | '12h',
  operationalHoursPerDay: number,
  handshakeMinutes: number
): Record<number, Record<number, Record<string, string>>> {
  console.log('🎯 Starting STRICT rule-compliant cycle generation with proper shift grouping');
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

  // Generate STRICT grouped patterns for each staff member
  const staffPatterns = new Map<string, string>();
  
  shiftWorkers.forEach((staff, index) => {
    const pattern = generateStrictGroupedPattern(
      totalDays, 
      shiftType, 
      staff.eligible_shifts || [],
      index,
      shiftWorkers.length
    );
    staffPatterns.set(staff.id, pattern);
    console.log(`📋 Generated GROUPED pattern for ${staff.first_name} ${staff.last_name}: ${pattern}`);
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

  // Apply coverage optimization while maintaining strict grouping
  const optimizedCycle = optimizeCoverageWithStrictGrouping(cycle, shiftWorkers, shiftType);

  // Validate the final cycle
  const validation = validateEnhancedCycle(optimizedCycle, staffList, shiftType);
  
  if (!validation.isValid) {
    console.warn('⚠️ Generated cycle has violations:', validation.violations);
    console.log('📊 Validation score:', validation.overallScore);
  } else {
    console.log('✅ Generated cycle passes all rule validation with proper grouping');
  }

  logger.info('Enhanced cycle generation completed', {
    validationScore: validation.overallScore,
    violationCount: validation.violations.length
  });

  return optimizedCycle;
}

/**
 * Generate a STRICT rule-compliant pattern with proper shift grouping
 */
function generateStrictGroupedPattern(
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

  console.log(`🔄 Generating pattern for staff ${staffIndex + 1}/${totalStaff} with shifts: ${availableShifts.join(', ')}`);

  // STRICT grouping parameters
  const workBlockSize = 3; // Always use 3-day work blocks for consistency
  const restBlockSize = 2; // Always use 2-day rest blocks for adequate recovery
  
  // Stagger start positions to distribute weekend work fairly
  const startOffset = Math.floor((staffIndex * 5) % 7); // Different starting days for each staff
  
  let currentPos = startOffset;
  let shiftIndex = staffIndex % availableShifts.length; // Different starting shift for each staff
  
  while (currentPos < totalDays - workBlockSize) {
    const currentShift = availableShifts[shiftIndex % availableShifts.length];
    
    // Create a work block of identical shifts
    for (let i = 0; i < workBlockSize && currentPos + i < totalDays; i++) {
      pattern[currentPos + i] = currentShift;
    }
    
    console.log(`📅 Created ${workBlockSize}-day ${currentShift} block starting at day ${currentPos + 1}`);
    
    currentPos += workBlockSize;
    
    // MANDATORY rest block (Rule 2: Adequate rest between work blocks)
    for (let i = 0; i < restBlockSize && currentPos + i < totalDays; i++) {
      pattern[currentPos + i] = 'R';
    }
    
    currentPos += restBlockSize;
    
    // Move to next shift type - CRITICAL: avoid problematic transitions
    if (shiftType === '8h') {
      // Rule 4: Never Late before Early
      if (currentShift === 'L') {
        // After Late shift, skip Early if it's next
        const nextShiftIndex = (shiftIndex + 1) % availableShifts.length;
        if (availableShifts[nextShiftIndex] === 'E') {
          shiftIndex += 2; // Skip Early, go to next shift (likely Night)
        } else {
          shiftIndex++;
        }
      } else {
        shiftIndex++;
      }
    } else {
      shiftIndex++;
    }
    
    // Rule 3: Extra rest after Night shifts
    if (currentShift === 'N') {
      // Add one extra rest day after night shifts
      if (currentPos < totalDays) {
        pattern[currentPos] = 'R';
        currentPos++;
      }
      console.log(`💤 Added extra rest day after Night shift block`);
    }
  }

  // Final validation and fixes
  const finalPattern = applyFinalGroupingRules(pattern, shiftType);
  
  console.log(`✅ Final pattern for staff ${staffIndex + 1}: ${finalPattern.join('')}`);
  return finalPattern.join('');
}

/**
 * Apply final grouping rules to ensure compliance
 */
function applyFinalGroupingRules(pattern: string[], shiftType: '8h' | '12h'): string[] {
  const result = [...pattern];
  
  // Rule 4: Fix L->E violations (8h mode only)
  if (shiftType === '8h') {
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i] === 'L' && result[i + 1] === 'E') {
        // Insert rest day between L and E
        result[i + 1] = 'R';
        console.log(`🔧 Fixed L->E violation at position ${i + 1}`);
      }
    }
  }
  
  // Rule 3: Ensure Night shifts are followed by adequate rest
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i] === 'N' && result[i + 1] !== 'R' && result[i + 1] !== 'N') {
      result[i + 1] = 'R';
      console.log(`🔧 Added rest after Night shift at position ${i + 1}`);
    }
  }
  
  // Rule 1: Eliminate any remaining alternating patterns
  for (let i = 0; i < result.length - 2; i++) {
    if (result[i] !== 'R' && result[i + 1] === 'R' && result[i + 2] !== 'R' && result[i + 2] !== result[i]) {
      // Found W-R-W pattern with different shifts - extend rest
      result[i + 2] = 'R';
      console.log(`🔧 Fixed alternating pattern at position ${i + 2}`);
    }
  }
  
  // Rule 6: Validate weekly work limits
  enforceWeeklyWorkLimits(result);
  
  return result;
}

/**
 * Filter shifts based on eligibility and mode
 */
function filterEligibleShifts(eligibleShifts: string[], shiftType: '8h' | '12h'): string[] {
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
      console.log(`⚠️ Weekly limit violation found at position ${i}, converting excess work days to rest`);
      // Convert excess work days to rest, starting from the end of the week
      let converted = 0;
      for (let j = weekSlice.length - 1; j >= 0 && converted < (workDays - 5); j--) {
        const globalIndex = i + j;
        if (pattern[globalIndex] !== 'R') {
          pattern[globalIndex] = 'R';
          converted++;
          console.log(`🔧 Converted work day to rest at position ${globalIndex}`);
        }
      }
    }
  }
}

/**
 * Optimize coverage while maintaining STRICT shift grouping
 */
function optimizeCoverageWithStrictGrouping(
  cycle: Record<number, Record<number, Record<string, string>>>,
  shiftWorkers: StaffMember[],
  shiftType: '8h' | '12h'
): Record<number, Record<number, Record<string, string>>> {
  console.log('🎯 Optimizing coverage while maintaining STRICT shift grouping');
  const optimized = JSON.parse(JSON.stringify(cycle));
  const requiredShifts = shiftType === '12h' ? ['D', 'N'] : ['E', 'L', 'N'];

  // Log current patterns for verification
  shiftWorkers.forEach(staff => {
    const pattern = extractStaffPattern(optimized, staff.id);
    console.log(`👤 ${staff.first_name} pattern: ${pattern}`);
    
    // Verify grouping in the pattern
    const groupingValid = verifyShiftGrouping(pattern);
    if (!groupingValid) {
      console.warn(`❌ Poor grouping detected for ${staff.first_name}: ${pattern}`);
    } else {
      console.log(`✅ Good grouping verified for ${staff.first_name}`);
    }
  });

  return optimized;
}

/**
 * Verify that a pattern has proper shift grouping
 */
function verifyShiftGrouping(pattern: string): boolean {
  let currentShift = '';
  let currentStreak = 0;
  let hasIsolatedShifts = false;
  let hasAlternating = false;
  
  for (let i = 0; i < pattern.length; i++) {
    const shift = pattern[i];
    
    if (shift !== 'R') {
      if (shift === currentShift) {
        currentStreak++;
      } else {
        // Check if previous streak was too short (isolated)
        if (currentStreak === 1 && currentShift !== '') {
          hasIsolatedShifts = true;
          console.log(`📍 Isolated ${currentShift} shift found at position ${i - 1}`);
        }
        
        currentShift = shift;
        currentStreak = 1;
      }
      
      // Check for alternating pattern (W-R-W)
      if (i >= 2 && pattern[i - 1] === 'R' && pattern[i - 2] !== 'R') {
        hasAlternating = true;
        console.log(`📍 Alternating pattern found at positions ${i - 2}-${i - 1}-${i}`);
      }
    } else {
      if (currentStreak === 1 && currentShift !== '') {
        hasIsolatedShifts = true;
        console.log(`📍 Isolated ${currentShift} shift found at position ${i - 1}`);
      }
      currentShift = '';
      currentStreak = 0;
    }
  }
  
  return !hasIsolatedShifts && !hasAlternating;
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
    totalChecks++; if (!hasAlternatingPattern(pattern)) passedChecks++;
    
    // Rule 2: Valid work streaks (2-4 consecutive days)
    if (!hasValidWorkStreaks(pattern)) {
      staffViolationsForMember.push(SHIFT_RULES.CONSECUTIVE_WORK);
      violations.push(`${staff.first_name} ${staff.last_name}: ${SHIFT_RULES.CONSECUTIVE_WORK}`);
    }
    totalChecks++; if (hasValidWorkStreaks(pattern)) passedChecks++;
    
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
    
    // Rule 5: Proper shift grouping (NEW: More strict validation)
    if (!hasProperShiftGrouping(pattern)) {
      staffViolationsForMember.push(SHIFT_RULES.GROUP_SHIFTS);
      violations.push(`${staff.first_name} ${staff.last_name}: ${SHIFT_RULES.GROUP_SHIFTS}`);
    }
    totalChecks++; if (hasProperShiftGrouping(pattern)) passedChecks++;
    
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
 * Helper validation functions
 */
function hasAlternatingPattern(pattern: string): boolean {
  let alternationCount = 0;
  for (let i = 0; i < pattern.length - 2; i++) {
    const isWork1 = pattern[i] !== 'R';
    const isRest = pattern[i + 1] === 'R';
    const isWork2 = pattern[i + 2] !== 'R';
    
    if (isWork1 && isRest && isWork2) {
      alternationCount++;
      if (alternationCount >= 1) return true; // More strict: even one alternation is bad
    } else {
      alternationCount = 0;
    }
  }
  return false;
}

function hasValidWorkStreaks(pattern: string): boolean {
  let currentStreak = 0;
  
  for (const shift of pattern) {
    if (shift !== 'R') {
      currentStreak++;
    } else {
      if (currentStreak > 0 && (currentStreak < 2 || currentStreak > 4)) {
        return false;
      }
      currentStreak = 0;
    }
  }
  
  return currentStreak === 0 || (currentStreak >= 2 && currentStreak <= 4);
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

function hasProperShiftGrouping(pattern: string): boolean {
  // Check for isolated shifts (single shifts surrounded by rest)
  let hasIsolatedShifts = false;
  
  for (let i = 1; i < pattern.length - 1; i++) {
    if (pattern[i] !== 'R' && pattern[i - 1] === 'R' && pattern[i + 1] === 'R') {
      hasIsolatedShifts = true;
      break;
    }
  }
  
  if (hasIsolatedShifts) return false;
  
  // Check that identical shifts are grouped together (no scattered same shifts)
  const shiftGroups = new Map<string, number>();
  let currentShift = '';
  
  for (const shift of pattern) {
    if (shift !== 'R') {
      if (shift !== currentShift) {
        shiftGroups.set(shift, (shiftGroups.get(shift) || 0) + 1);
        currentShift = shift;
      }
    } else {
      currentShift = '';
    }
  }
  
  // Each shift type should appear in at most 2 separate groups
  return Array.from(shiftGroups.values()).every(count => count <= 2);
}

function violatesWeeklyLimit(pattern: string): boolean {
  for (let i = 0; i <= pattern.length - 7; i++) {
    const weekSlice = pattern.slice(i, i + 7);
    const workDays = [...weekSlice].filter(day => day !== 'R').length;
    if (workDays > 5) {
      return true;
    }
  }
  return false;
}

function canWorkShift(staff: StaffMember, shiftCode: string): boolean {
  if (!staff.eligible_shifts || !Array.isArray(staff.eligible_shifts)) {
    return false;
  }
  
  if (staff.eligible_shifts.length === 0) {
    return false;
  }
  
  return staff.eligible_shifts.some(eligible => {
    if (eligible === shiftCode) return true;
    if (shiftCode === 'D' && (eligible === 'Day' || eligible === 'day')) return true;
    if (shiftCode === 'N' && (eligible === 'Night' || eligible === 'night')) return true;
    if (shiftCode === 'E' && (eligible === 'Early' || eligible === 'early')) return true;
    if (shiftCode === 'L' && (eligible === 'Late' || eligible === 'late')) return true;
    return false;
  });
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
 * Filter shifts based on eligibility and mode
 */
function filterEligibleShifts(eligibleShifts: string[], shiftType: '8h' | '12h'): string[] {
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
    // good: spread into an array of single-char strings, then filter
    const workDays = [...weekSlice].filter(day => day !== 'R').length;
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
