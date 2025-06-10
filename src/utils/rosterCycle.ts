
type ShiftCode = "D" | "E" | "L" | "N" | "R" | "S";

interface CycleAssignment {
  [weekIndex: number]: { [dayIndex: number]: { [staffId: string]: ShiftCode } };
}

interface StaffingRequirements {
  day_shift_staff?: number;
  night_shift_staff?: number;
  early_shift_staff?: number;
  late_shift_staff?: number;
}

export function buildRosterCycle(
  staffList: Array<{ id: string; eligible_shifts: string[]; is_shift_worker: boolean }>,
  cycleWeeks: number,
  shiftType: "8h" | "12h",
  operationalHours: number,
  handshakeMinutes: number,
  staffingRequirements?: StaffingRequirements
): CycleAssignment {
  console.log('🔄 buildRosterCycle called with ENHANCED GROUPING ALGORITHM:', {
    staffCount: staffList.length,
    cycleWeeks,
    shiftType,
    operationalHours,
    handshakeMinutes,
    staffingRequirements
  });

  // Use the enhanced cycle integration for proper grouping
  const { generateEnhancedRosterCycle } = require('./roster/enhancedCycleIntegration');
  
  // Convert staff list to StaffMember format
  const staffMembers = staffList.map(staff => ({
    id: staff.id,
    first_name: staff.id,
    last_name: '',
    eligible_shifts: staff.eligible_shifts,
    is_shift_worker: staff.is_shift_worker
  }));

  console.log('🎯 Using enhanced cycle generation with STRICT shift grouping');
  const enhancedCycle = generateEnhancedRosterCycle(
    staffMembers,
    cycleWeeks,
    shiftType,
    operationalHours,
    handshakeMinutes
  );

  // Convert back to the expected format
  const assignment: CycleAssignment = {};
  
  Object.keys(enhancedCycle).forEach(weekStr => {
    const week = parseInt(weekStr);
    assignment[week] = {};
    
    Object.keys(enhancedCycle[week]).forEach(dayStr => {
      const day = parseInt(dayStr);
      assignment[week][day] = {};
      
      Object.keys(enhancedCycle[week][day]).forEach(staffId => {
        assignment[week][day][staffId] = enhancedCycle[week][day][staffId] as ShiftCode;
      });
    });
  });

  console.log('✅ Enhanced roster cycle generated with STRICT shift grouping enforcement');
  
  // Log patterns for verification
  staffList.forEach(staff => {
    if (staff.is_shift_worker) {
      const pattern: string[] = [];
      for (let w = 0; w < cycleWeeks; w++) {
        for (let d = 0; d < 7; d++) {
          pattern.push(assignment[w]?.[d]?.[staff.id] || 'R');
        }
      }
      console.log(`👤 ${staff.id} GROUPED pattern: ${pattern.join('')}`);
    }
  });
  
  return assignment;
}
