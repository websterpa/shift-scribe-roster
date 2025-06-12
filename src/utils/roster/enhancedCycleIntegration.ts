import { StaffMember } from "@/types/roster";
import { isStaffEligibleForShift, shiftCodeToName } from "./shiftCodeMapping";

export type ShiftCode = "D" | "E" | "L" | "N" | "R" | "S";

interface CycleAssignment {
  [weekIndex: number]: { [dayIndex: number]: { [staffId: string]: ShiftCode } };
}

export interface CycleValidationResult {
  isValid: boolean;
  overallScore: number;
  violations: string[];
  staffViolations: Record<string, string[]>;
}

// Helper function to validate shift codes
function isValidShiftCode(code: string): code is ShiftCode {
  return ["D", "E", "L", "N", "R", "S"].includes(code);
}

export function generateEnhancedRosterCycle(
  staffList: StaffMember[],
  cycleWeeks: number,
  shiftType: "8h" | "12h",
  operationalHours: number,
  handshakeMinutes: number,
  customPattern?: string[] // New parameter for custom pattern
): CycleAssignment {
  console.log('🚀 AUDIT: Enhanced cycle generation started with STRICT grouping rules');
  console.log('📊 AUDIT: Parameters:', {
    staffCount: staffList.length,
    cycleWeeks,
    shiftType,
    operationalHours,
    handshakeMinutes,
    hasCustomPattern: !!customPattern,
    customPatternLength: customPattern?.length
  });

  // Log detailed staff information for audit
  console.log('👥 AUDIT: Staff analysis in enhanced cycle generation:');
  const shiftWorkers = staffList.filter(staff => staff.is_shift_worker);
  console.log(`  Total staff: ${staffList.length}`);
  console.log(`  Shift workers: ${shiftWorkers.length}`);
  
  shiftWorkers.forEach((staff, index) => {
    console.log(`  Staff ${index + 1}:`, {
      id: staff.id,
      name: `${staff.first_name} ${staff.last_name}`,
      eligible_shifts: staff.eligible_shifts,
      is_shift_worker: staff.is_shift_worker
    });
  });

  // Use custom pattern if provided, otherwise use default patterns
  let patternToUse = customPattern;
  if (!patternToUse) {
    // Use existing default pattern logic
    if (shiftType === "12h") {
      patternToUse = ["D", "D", "R", "R", "N", "N", "R"];
    } else {
      patternToUse = ["E", "E", "L", "L", "R", "R", "R"];
    }
  }

  console.log('🎯 AUDIT: Using pattern:', patternToUse);

  const assignment: CycleAssignment = {};
  const totalDays = cycleWeeks * 7;
  const patternLength = patternToUse.length;

  console.log('👥 AUDIT: Shift workers to assign:', shiftWorkers.length);

  if (shiftWorkers.length === 0) {
    console.error('❌ AUDIT: No shift workers found to assign!');
    return assignment;
  }

  // Initialize all days with rest for all staff
  for (let week = 0; week < cycleWeeks; week++) {
    assignment[week] = {};
    for (let day = 0; day < 7; day++) {
      assignment[week][day] = {};
      staffList.forEach(staff => {
        assignment[week][day][staff.id] = "R";
      });
    }
  }

  console.log('🔄 AUDIT: Starting pattern assignment for shift workers...');

  // Apply the pattern with proper rotation to ensure fair distribution
  shiftWorkers.forEach((staff, staffIndex) => {
    console.log(`📋 AUDIT: Assigning pattern for staff ${staff.id} (index: ${staffIndex})`);
    
    // Calculate offset to rotate pattern start for each staff member
    const staffOffset = Math.floor((staffIndex * patternLength) / shiftWorkers.length);
    console.log(`🔄 AUDIT: Staff ${staff.id} pattern offset: ${staffOffset}`);
    
    let assignedShifts = 0;
    
    for (let week = 0; week < cycleWeeks; week++) {
      for (let day = 0; day < 7; day++) {
        const absoluteDay = week * 7 + day;
        const patternIndex = (absoluteDay + staffOffset) % patternLength;
        const shiftCodeFromPattern = patternToUse[patternIndex];
        
        // Validate that the shift code is a valid ShiftCode type
        const shiftCode: ShiftCode = isValidShiftCode(shiftCodeFromPattern) ? shiftCodeFromPattern : "R";
        
        // FIXED: Use the new mapping function to check eligibility
        if (shiftCode === "R" || isStaffEligibleForShift(staff.eligible_shifts, shiftCode)) {
          assignment[week][day][staff.id] = shiftCode;
          if (shiftCode !== "R") {
            assignedShifts++;
            console.log(`✅ AUDIT: Assigned ${shiftCode} (${shiftCodeToName(shiftCode)}) to ${staff.id} on week ${week}, day ${day}`);
          }
        } else {
          // If not eligible for the assigned shift, give them rest
          assignment[week][day][staff.id] = "R";
          console.log(`⚠️ AUDIT: Staff ${staff.id} not eligible for shift ${shiftCode} (${shiftCodeToName(shiftCode)}), assigned R instead`);
        }
      }
    }
    
    console.log(`📊 AUDIT: Staff ${staff.id} total assigned shifts: ${assignedShifts}`);
  });

  // Audit the final assignment
  console.log('🔍 AUDIT: Final assignment analysis:');
  let totalNonRestAssignments = 0;
  const assignmentShiftCounts: Record<string, number> = {};
  
  for (let week = 0; week < cycleWeeks; week++) {
    for (let day = 0; day < 7; day++) {
      Object.values(assignment[week][day]).forEach(shiftCode => {
        assignmentShiftCounts[shiftCode] = (assignmentShiftCounts[shiftCode] || 0) + 1;
        if (shiftCode !== 'R') {
          totalNonRestAssignments++;
        }
      });
    }
  }
  
  console.log('📊 AUDIT: Assignment distribution:', assignmentShiftCounts);
  console.log(`📊 AUDIT: Total non-rest assignments: ${totalNonRestAssignments}`);

  // Validate the assignment meets pattern requirements
  const violations = validatePatternCompliance(assignment, staffList, patternToUse);
  if (violations.length > 0) {
    console.error('❌ AUDIT: Generated cycle has violations:', violations);
    // Log violations but continue - the enhanced algorithm should handle most cases
    violations.forEach(violation => {
      console.warn(`⚠️ AUDIT: Violation: ${violation}`);
    });
  } else {
    console.log('✅ AUDIT: Generated cycle passes all pattern compliance checks');
  }

  // Log the final pattern for each staff member for verification
  shiftWorkers.slice(0, 3).forEach(staff => { // Log first 3 staff for brevity
    const pattern: string[] = [];
    for (let week = 0; week < Math.min(cycleWeeks, 2); week++) { // Log first 2 weeks
      for (let day = 0; day < 7; day++) {
        pattern.push(assignment[week][day][staff.id]);
      }
    }
    console.log(`👤 AUDIT: ${staff.first_name} ${staff.last_name} pattern (first 2 weeks): ${pattern.join('')}`);
  });

  console.log('🎉 AUDIT: Enhanced cycle generation completed with custom pattern support');
  return assignment;
}

// Validation function to check pattern compliance
function validatePatternCompliance(
  assignment: CycleAssignment,
  staffList: StaffMember[],
  pattern: string[]
): string[] {
  const violations: string[] = [];
  const shiftWorkers = staffList.filter(staff => staff.is_shift_worker);

  shiftWorkers.forEach(staff => {
    // Check weekly work limits (max 4 shifts for 12h, max 5 for 8h)
    Object.keys(assignment).forEach(weekStr => {
      const week = parseInt(weekStr);
      const weekPattern = [];
      let workShifts = 0;
      
      for (let day = 0; day < 7; day++) {
        const shiftCode = assignment[week][day][staff.id];
        weekPattern.push(shiftCode);
        if (shiftCode !== "R" && shiftCode !== "S") {
          workShifts++;
        }
      }
      
      // 12h shifts: max 4 shifts per week
      // 8h shifts: max 5 shifts per week  
      const maxShifts = pattern.some(code => code === "D" || code === "N") ? 4 : 5;
      if (workShifts > maxShifts) {
        violations.push(`Staff ${staff.first_name} ${staff.last_name} has ${workShifts} shifts in week ${week + 1} (max: ${maxShifts})`);
      }
    });
  });

  return violations;
}

// Enhanced validation function for the test interface
export function validateEnhancedCycle(
  assignment: CycleAssignment,
  staffList: StaffMember[],
  shiftType: "8h" | "12h"
): CycleValidationResult {
  const violations: string[] = [];
  const staffViolations: Record<string, string[]> = {};
  const shiftWorkers = staffList.filter(staff => staff.is_shift_worker);

  shiftWorkers.forEach(staff => {
    const staffId = staff.id;
    staffViolations[staffId] = [];

    // Check weekly work limits
    Object.keys(assignment).forEach(weekStr => {
      const week = parseInt(weekStr);
      let workShifts = 0;
      let consecutiveDays = 0;
      let maxConsecutive = 0;
      
      for (let day = 0; day < 7; day++) {
        const shiftCode = assignment[week][day][staffId];
        
        if (shiftCode !== "R" && shiftCode !== "S") {
          workShifts++;
          consecutiveDays++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveDays);
        } else {
          consecutiveDays = 0;
        }
      }
      
      // Check maximum shifts per week
      const maxShifts = shiftType === "12h" ? 4 : 5;
      if (workShifts > maxShifts) {
        const violation = `Week ${week + 1}: ${workShifts} shifts (max: ${maxShifts})`;
        violations.push(`${staff.first_name} ${staff.last_name} - ${violation}`);
        staffViolations[staffId].push(violation);
      }
      
      // Check maximum consecutive days
      const maxConsecutiveDays = shiftType === "12h" ? 3 : 4;
      if (maxConsecutive > maxConsecutiveDays) {
        const violation = `Week ${week + 1}: ${maxConsecutive} consecutive days (max: ${maxConsecutiveDays})`;
        violations.push(`${staff.first_name} ${staff.last_name} - ${violation}`);
        staffViolations[staffId].push(violation);
      }
    });
  });

  // Calculate overall score
  const totalChecks = shiftWorkers.length * Object.keys(assignment).length * 2; // 2 checks per staff per week
  const failedChecks = violations.length;
  const overallScore = totalChecks > 0 ? Math.max(0, ((totalChecks - failedChecks) / totalChecks) * 100) : 100;

  return {
    isValid: violations.length === 0,
    overallScore,
    violations,
    staffViolations
  };
}
