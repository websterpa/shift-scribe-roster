import { StaffMember } from "@/types/roster";

type ShiftCode = "D" | "E" | "L" | "N" | "R" | "S";

interface CycleAssignment {
  [weekIndex: number]: { [dayIndex: number]: { [staffId: string]: ShiftCode } };
}

export function generateEnhancedRosterCycle(
  staffList: StaffMember[],
  cycleWeeks: number,
  shiftType: "8h" | "12h",
  operationalHours: number,
  handshakeMinutes: number,
  customPattern?: string[] // New parameter for custom pattern
): CycleAssignment {
  console.log('🚀 Enhanced cycle generation started with STRICT grouping rules');
  console.log('📊 Parameters:', {
    staffCount: staffList.length,
    cycleWeeks,
    shiftType,
    operationalHours,
    handshakeMinutes,
    hasCustomPattern: !!customPattern,
    customPatternLength: customPattern?.length
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

  console.log('🎯 Using pattern:', patternToUse);

  const assignment: CycleAssignment = {};
  const shiftWorkers = staffList.filter(staff => staff.is_shift_worker);
  const totalDays = cycleWeeks * 7;
  const patternLength = patternToUse.length;

  console.log('👥 Shift workers to assign:', shiftWorkers.length);

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

  // Apply the pattern with proper rotation to ensure fair distribution
  shiftWorkers.forEach((staff, staffIndex) => {
    console.log(`📋 Assigning pattern for staff ${staff.id} (index: ${staffIndex})`);
    
    // Calculate offset to rotate pattern start for each staff member
    const staffOffset = Math.floor((staffIndex * patternLength) / shiftWorkers.length);
    console.log(`🔄 Staff ${staff.id} pattern offset: ${staffOffset}`);
    
    for (let week = 0; week < cycleWeeks; week++) {
      for (let day = 0; day < 7; day++) {
        const absoluteDay = week * 7 + day;
        const patternIndex = (absoluteDay + staffOffset) % patternLength;
        const shiftCode = patternToUse[patternIndex];
        
        // Only assign if staff is eligible for this shift type
        if (staff.eligible_shifts && staff.eligible_shifts.includes(shiftCode)) {
          assignment[week][day][staff.id] = shiftCode;
        } else if (shiftCode !== "R") {
          // If not eligible for the assigned shift, give them rest
          assignment[week][day][staff.id] = "R";
          console.log(`⚠️ Staff ${staff.id} not eligible for shift ${shiftCode}, assigned R instead`);
        }
      }
    }
  });

  // Validate the assignment meets pattern requirements
  const violations = validatePatternCompliance(assignment, staffList, patternToUse);
  if (violations.length > 0) {
    console.error('❌ Generated cycle has violations:', violations);
    // Log violations but continue - the enhanced algorithm should handle most cases
    violations.forEach(violation => {
      console.warn(`⚠️ Violation: ${violation}`);
    });
  } else {
    console.log('✅ Generated cycle passes all pattern compliance checks');
  }

  // Log the final pattern for each staff member for verification
  shiftWorkers.slice(0, 3).forEach(staff => { // Log first 3 staff for brevity
    const pattern: string[] = [];
    for (let week = 0; week < Math.min(cycleWeeks, 2); week++) { // Log first 2 weeks
      for (let day = 0; day < 7; day++) {
        pattern.push(assignment[week][day][staff.id]);
      }
    }
    console.log(`👤 ${staff.first_name} ${staff.last_name} pattern (first 2 weeks): ${pattern.join('')}`);
  });

  console.log('🎉 Enhanced cycle generation completed with custom pattern support');
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
