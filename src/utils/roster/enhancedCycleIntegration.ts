
import { generateShiftCycle, generateCycleForRoster } from './shiftCycleGenerator';
import { StaffMember } from '@/types/roster';
import { createLogger } from '../errorLogger';

const logger = createLogger('EnhancedCycleIntegration');

/**
 * Enhanced cycle generation that replaces the basic pattern-based approach
 */
export function generateEnhancedRosterCycle(
  staffList: StaffMember[],
  cycleLengthWeeks: number,
  shiftType: '8h' | '12h',
  operationalHoursPerDay: number,
  handshakeMinutes: number
): Record<number, Record<number, Record<string, string>>> {
  console.log('🔄 Generating enhanced roster cycle with new algorithm');
  logger.info('Starting enhanced cycle generation', {
    staffCount: staffList.length,
    cycleLengthWeeks,
    shiftType
  });

  const totalDays = cycleLengthWeeks * 7;
  const cycle: Record<number, Record<number, Record<string, string>>> = {};

  // Initialize the cycle structure
  for (let week = 0; week < cycleLengthWeeks; week++) {
    cycle[week] = {};
    for (let day = 0; day < 7; day++) {
      cycle[week][day] = {};
    }
  }

  // Generate individual cycles for each staff member
  staffList.forEach((staff, staffIndex) => {
    if (!staff?.id) return;

    console.log(`👤 Generating cycle for ${staff.first_name} ${staff.last_name}`);
    
    // Generate a base cycle for this staff member
    const staffCycle = generateShiftCycle(totalDays, shiftType);
    
    // Apply rotation based on staff index to distribute weekend work
    const rotationOffset = Math.floor((staffIndex * totalDays) / staffList.length);
    const rotatedCycle = rotateCycleString(staffCycle, rotationOffset);
    
    // Filter shifts based on staff eligibility
    const eligibleShifts = staff.eligible_shifts || [];
    const filteredCycle = filterCycleByEligibility(rotatedCycle, eligibleShifts, shiftType);
    
    // Apply the cycle to the roster structure
    for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
      const week = Math.floor(dayIndex / 7);
      const day = dayIndex % 7;
      
      if (week < cycleLengthWeeks) {
        cycle[week][day][staff.id] = filteredCycle[dayIndex] || 'R';
      }
    }
  });

  // Apply coverage optimization
  const optimizedCycle = optimizeCoverage(cycle, staffList, shiftType, operationalHoursPerDay);
  
  console.log('✅ Enhanced roster cycle generated successfully');
  logger.info('Enhanced cycle generation completed', {
    weeksGenerated: cycleLengthWeeks,
    totalAssignments: Object.values(optimizedCycle).reduce((total, week) => 
      total + Object.values(week).reduce((weekTotal, day) => 
        weekTotal + Object.keys(day).length, 0), 0)
  });

  return optimizedCycle;
}

/**
 * Rotate a cycle string by the given offset
 */
function rotateCycleString(cycle: string, offset: number): string {
  if (offset === 0 || offset >= cycle.length) return cycle;
  const normalizedOffset = offset % cycle.length;
  return cycle.slice(normalizedOffset) + cycle.slice(0, normalizedOffset);
}

/**
 * Filter cycle based on staff shift eligibility
 */
function filterCycleByEligibility(
  cycle: string, 
  eligibleShifts: string[], 
  shiftType: '8h' | '12h'
): string {
  if (!eligibleShifts || eligibleShifts.length === 0) {
    // If no eligible shifts specified, convert all work shifts to rest
    return cycle.replace(/[DELN]/g, 'R');
  }

  return cycle.split('').map(shift => {
    if (shift === 'R') return 'R';
    
    // Check if this shift type is eligible for the staff member
    const isEligible = eligibleShifts.some(eligible => {
      // Handle different shift code formats
      if (eligible === shift) return true;
      
      // Handle full names
      if (shift === 'D' && (eligible === 'Day' || eligible === 'day')) return true;
      if (shift === 'N' && (eligible === 'Night' || eligible === 'night')) return true;
      if (shift === 'E' && (eligible === 'Early' || eligible === 'early')) return true;
      if (shift === 'L' && (eligible === 'Late' || eligible === 'late')) return true;
      
      return false;
    });
    
    return isEligible ? shift : 'R';
  }).join('');
}

/**
 * Optimize coverage to ensure minimum staffing requirements are met
 */
function optimizeCoverage(
  cycle: Record<number, Record<number, Record<string, string>>>,
  staffList: StaffMember[],
  shiftType: '8h' | '12h',
  operationalHoursPerDay: number
): Record<number, Record<number, Record<string, string>>> {
  const optimized = JSON.parse(JSON.stringify(cycle)); // Deep clone
  
  // Calculate minimum staff required per shift
  const minStaffPerShift = calculateMinStaffPerShift(shiftType, operationalHoursPerDay);
  
  // Check each day for coverage gaps
  Object.keys(optimized).forEach(weekStr => {
    const week = parseInt(weekStr);
    Object.keys(optimized[week]).forEach(dayStr => {
      const day = parseInt(dayStr);
      
      // Count staff assigned to each shift type
      const shiftCounts = countShiftAssignments(optimized[week][day]);
      const requiredShifts = shiftType === '12h' ? ['D', 'N'] : ['E', 'L', 'N'];
      
      // Check if any shift is understaffed
      requiredShifts.forEach(shiftCode => {
        const currentCount = shiftCounts[shiftCode] || 0;
        const shortage = minStaffPerShift - currentCount;
        
        if (shortage > 0) {
          console.log(`⚠️ Coverage gap detected: Week ${week}, Day ${day}, Shift ${shiftCode} needs ${shortage} more staff`);
          
          // Try to reassign staff from rest to this shift
          reassignStaffForCoverage(optimized[week][day], shiftCode, shortage, staffList);
        }
      });
    });
  });
  
  return optimized;
}

/**
 * Calculate minimum staff required per shift
 */
function calculateMinStaffPerShift(shiftType: '8h' | '12h', operationalHours: number): number {
  if (shiftType === '12h') {
    return Math.max(1, Math.ceil(operationalHours / 12));
  } else {
    return Math.max(1, Math.ceil(operationalHours / 8));
  }
}

/**
 * Count staff assignments by shift type for a given day
 */
function countShiftAssignments(dayAssignments: Record<string, string>): Record<string, number> {
  const counts: Record<string, number> = {};
  
  Object.values(dayAssignments).forEach(shift => {
    counts[shift] = (counts[shift] || 0) + 1;
  });
  
  return counts;
}

/**
 * Reassign staff from rest to fill coverage gaps
 */
function reassignStaffForCoverage(
  dayAssignments: Record<string, string>,
  neededShift: string,
  shortage: number,
  staffList: StaffMember[]
): void {
  let assigned = 0;
  
  // Find staff on rest who can work this shift
  Object.entries(dayAssignments).forEach(([staffId, currentShift]) => {
    if (assigned >= shortage) return;
    
    if (currentShift === 'R') {
      const staff = staffList.find(s => s.id === staffId);
      if (staff && canWorkShift(staff, neededShift)) {
        dayAssignments[staffId] = neededShift;
        assigned++;
        console.log(`✅ Reassigned ${staff.first_name} ${staff.last_name} from Rest to ${neededShift} shift`);
      }
    }
  });
  
  if (assigned < shortage) {
    console.log(`⚠️ Could only reassign ${assigned}/${shortage} staff for ${neededShift} shift coverage`);
  }
}

/**
 * Check if staff member can work a specific shift
 */
function canWorkShift(staff: StaffMember, shiftCode: string): boolean {
  if (!staff.eligible_shifts || staff.eligible_shifts.length === 0) {
    return false;
  }
  
  return staff.eligible_shifts.some(eligible => {
    if (eligible === shiftCode) return true;
    
    // Handle full names
    if (shiftCode === 'D' && (eligible === 'Day' || eligible === 'day')) return true;
    if (shiftCode === 'N' && (eligible === 'Night' || eligible === 'night')) return true;
    if (shiftCode === 'E' && (eligible === 'Early' || eligible === 'early')) return true;
    if (shiftCode === 'L' && (eligible === 'Late' || eligible === 'late')) return true;
    
    return false;
  });
}

/**
 * Integration wrapper for backward compatibility
 */
export function buildEnhancedRosterCycle(
  staffList: StaffMember[],
  cycleLengthWeeks: number,
  shiftType: '8h' | '12h',
  operationalHoursPerDay: number,
  handshakeMinutes: number
): Record<number, Record<number, Record<string, string>>> {
  console.log('🔄 Using enhanced roster cycle generation');
  
  return generateEnhancedRosterCycle(
    staffList,
    cycleLengthWeeks,
    shiftType,
    operationalHoursPerDay,
    handshakeMinutes
  );
}
