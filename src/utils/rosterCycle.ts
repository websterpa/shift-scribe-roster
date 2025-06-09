
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

interface WorkBlock {
  staffId: string;
  shiftType: ShiftCode;
  startDay: number;
  duration: number;
}

export function buildRosterCycle(
  staffList: Array<{ id: string; eligible_shifts: string[]; is_shift_worker: boolean }>,
  cycleWeeks: number,
  shiftType: "8h" | "12h",
  operationalHours: number,
  handshakeMinutes: number,
  staffingRequirements?: StaffingRequirements
): CycleAssignment {
  console.log('🔄 buildRosterCycle called with grouped shift logic:', {
    staffCount: staffList.length,
    cycleWeeks,
    shiftType,
    operationalHours,
    handshakeMinutes,
    staffingRequirements
  });

  const assignment: CycleAssignment = {};
  const totalDays = cycleWeeks * 7;
  
  // Filter out staff who can work shifts
  const shiftWorkers = staffList.filter(staff => staff.is_shift_worker && staff.eligible_shifts?.length > 0);
  const supervisors = staffList.filter(staff => !staff.is_shift_worker);
  
  console.log('📊 Staff breakdown:', {
    totalStaff: staffList.length,
    shiftWorkers: shiftWorkers.length,
    supervisors: supervisors.length
  });

  if (shiftWorkers.length === 0) {
    console.warn('⚠️ No shift workers available for roster generation');
  }

  // Default staffing requirements if not provided
  const defaultStaffing: StaffingRequirements = {
    day_shift_staff: 2,
    night_shift_staff: 2,
    early_shift_staff: 1,
    late_shift_staff: 1
  };
  
  const staffing = { ...defaultStaffing, ...staffingRequirements };
  console.log('📋 Using staffing requirements:', staffing);

  // Initialize all assignments to rest first
  for (let w = 0; w < cycleWeeks; w++) {
    assignment[w] = {};
    for (let d = 0; d < 7; d++) {
      assignment[w][d] = {};
      [...shiftWorkers, ...supervisors].forEach(staff => {
        assignment[w][d][staff.id] = "R";
      });
    }
  }

  // Generate work blocks for shift workers with proper grouping
  const workBlocks = generateGroupedWorkBlocks(shiftWorkers, totalDays, shiftType, staffing);
  
  console.log('🏗️ Generated work blocks:', workBlocks.length);
  
  // Apply work blocks to the assignment
  workBlocks.forEach(block => {
    const staff = shiftWorkers.find(s => s.id === block.staffId);
    if (!staff) return;

    for (let i = 0; i < block.duration; i++) {
      const dayIndex = block.startDay + i;
      if (dayIndex >= totalDays) break;

      const week = Math.floor(dayIndex / 7);
      const day = dayIndex % 7;

      if (week < cycleWeeks) {
        assignment[week][day][block.staffId] = block.shiftType;
        console.log(`✅ Assigned ${staff.id} to ${block.shiftType} shift on Week ${week + 1}, Day ${day + 1} (Block: ${block.duration} days)`);
      }
    }
  });

  // Handle supervisors - only work weekdays during day hours
  supervisors.forEach(staff => {
    for (let w = 0; w < cycleWeeks; w++) {
      for (let d = 0; d < 7; d++) {
        const isWeekend = d === 0 || d === 6; // Sunday = 0, Saturday = 6
        assignment[w][d][staff.id] = isWeekend ? "R" : "D";
      }
    }
  });

  // Optimize coverage to ensure minimum staffing requirements
  optimizeCoverageWithGrouping(assignment, shiftWorkers, shiftType, staffing, cycleWeeks);

  // Validate and log the grouping results
  validateShiftGrouping(assignment, shiftWorkers, cycleWeeks);

  console.log('✅ Roster cycle generated with grouped shifts and rest periods');
  
  return assignment;
}

function generateGroupedWorkBlocks(
  shiftWorkers: Array<{ id: string; eligible_shifts: string[]; is_shift_worker: boolean }>,
  totalDays: number,
  shiftType: "8h" | "12h",
  staffing: StaffingRequirements
): WorkBlock[] {
  const workBlocks: WorkBlock[] = [];
  const availableShifts = shiftType === "12h" ? ["D", "N"] : ["E", "L", "N"];
  
  // Calculate how many blocks we need for each shift type
  const shiftsNeeded = shiftType === "12h" 
    ? { D: staffing.day_shift_staff || 2, N: staffing.night_shift_staff || 2 }
    : { E: staffing.early_shift_staff || 1, L: staffing.late_shift_staff || 1, N: staffing.night_shift_staff || 1 };

  // Track staff workload
  const staffWorkDays = new Map<string, number>();
  shiftWorkers.forEach(staff => staffWorkDays.set(staff.id, 0));

  let currentDay = 0;

  while (currentDay < totalDays - 3) { // Leave buffer for complete blocks
    availableShifts.forEach(shiftCode => {
      const shiftKey = shiftCode as keyof typeof shiftsNeeded;
      const staffNeeded = shiftsNeeded[shiftKey] || 1;

      // Find eligible staff for this shift who have worked the least
      const eligibleStaff = shiftWorkers
        .filter(staff => canWorkShift(staff, shiftCode))
        .sort((a, b) => (staffWorkDays.get(a.id) || 0) - (staffWorkDays.get(b.id) || 0));

      // Assign work blocks to the least worked staff
      for (let i = 0; i < Math.min(staffNeeded, eligibleStaff.length); i++) {
        const staff = eligibleStaff[i];
        
        // Determine block duration (2-4 consecutive days)
        const blockDuration = getOptimalBlockDuration(currentDay, totalDays, staffWorkDays.get(staff.id) || 0);
        
        workBlocks.push({
          staffId: staff.id,
          shiftType: shiftCode as ShiftCode,
          startDay: currentDay,
          duration: blockDuration
        });

        // Update staff work count
        staffWorkDays.set(staff.id, (staffWorkDays.get(staff.id) || 0) + blockDuration);
        
        console.log(`📅 Created ${blockDuration}-day ${shiftCode} work block for ${staff.id} starting day ${currentDay + 1}`);
      }
    });

    // Move to next block start (current block + rest period)
    currentDay += 4; // 3-4 work days + 1-2 rest days
  }

  return workBlocks;
}

function getOptimalBlockDuration(currentDay: number, totalDays: number, staffWorkDays: number): number {
  const remainingDays = totalDays - currentDay;
  
  // Prefer 3-day blocks, but adjust based on remaining days and workload
  if (remainingDays < 4) return Math.min(remainingDays, 2);
  if (staffWorkDays > 15) return 2; // Shorter blocks for heavily worked staff
  if (remainingDays >= 7) return 3; // Standard 3-day blocks
  return Math.min(remainingDays - 1, 3); // Leave buffer for rest
}

function canWorkShift(staff: { eligible_shifts: string[] }, shiftCode: string): boolean {
  if (!staff.eligible_shifts || !Array.isArray(staff.eligible_shifts)) {
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

function optimizeCoverageWithGrouping(
  assignment: CycleAssignment,
  shiftWorkers: Array<{ id: string; eligible_shifts: string[]; is_shift_worker: boolean }>,
  shiftType: "8h" | "12h",
  staffing: StaffingRequirements,
  cycleWeeks: number
): void {
  const requiredShifts = shiftType === "12h" ? ["D", "N"] : ["E", "L", "N"];
  
  // Check each day for understaffing
  for (let w = 0; w < cycleWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      // Count current assignments
      const shiftCounts: Record<string, number> = {};
      requiredShifts.forEach(shift => { shiftCounts[shift] = 0; });
      
      Object.values(assignment[w][d]).forEach(shift => {
        if (requiredShifts.includes(shift as string)) {
          shiftCounts[shift as string]++;
        }
      });
      
      // Check for understaffing and try to fill gaps without breaking grouping
      requiredShifts.forEach(shiftCode => {
        const required = getRequiredStaffForShift(shiftCode, staffing);
        const shortage = required - shiftCounts[shiftCode];
        
        if (shortage > 0) {
          // Try to find staff on rest who can work this shift
          const availableStaff = shiftWorkers.filter(staff => 
            assignment[w][d][staff.id] === "R" && 
            canWorkShift(staff, shiftCode)
          );
          
          // Only reassign if it doesn't break existing work blocks significantly
          const toReassign = Math.min(shortage, availableStaff.length, 1); // Limit to 1 to maintain grouping
          for (let i = 0; i < toReassign; i++) {
            assignment[w][d][availableStaff[i].id] = shiftCode as ShiftCode;
            console.log(`📝 Coverage optimization: Assigned ${availableStaff[i].id} to ${shiftCode} shift for Week ${w + 1}, Day ${d + 1}`);
          }
        }
      });
    }
  }
}

function getRequiredStaffForShift(shiftCode: string, staffing: StaffingRequirements): number {
  switch (shiftCode) {
    case 'D': return staffing.day_shift_staff || 2;
    case 'E': return staffing.early_shift_staff || 1;
    case 'L': return staffing.late_shift_staff || 1;
    case 'N': return staffing.night_shift_staff || 2;
    default: return 1;
  }
}

function validateShiftGrouping(
  assignment: CycleAssignment,
  shiftWorkers: Array<{ id: string; eligible_shifts: string[]; is_shift_worker: boolean }>,
  cycleWeeks: number
): void {
  console.log('🔍 Validating shift grouping patterns...');
  
  shiftWorkers.forEach(staff => {
    const pattern: string[] = [];
    
    // Extract pattern for this staff member
    for (let w = 0; w < cycleWeeks; w++) {
      for (let d = 0; d < 7; d++) {
        pattern.push(assignment[w][d][staff.id]);
      }
    }
    
    // Analyze work blocks
    const workBlocks: { type: string; length: number }[] = [];
    let currentBlock: { type: string; length: number } | null = null;
    
    pattern.forEach(shift => {
      if (shift !== 'R') {
        if (!currentBlock || currentBlock.type === 'R') {
          if (currentBlock) workBlocks.push(currentBlock);
          currentBlock = { type: shift, length: 1 };
        } else if (currentBlock.type === shift) {
          currentBlock.length++;
        } else {
          workBlocks.push(currentBlock);
          currentBlock = { type: shift, length: 1 };
        }
      } else {
        if (!currentBlock || currentBlock.type !== 'R') {
          if (currentBlock) workBlocks.push(currentBlock);
          currentBlock = { type: 'R', length: 1 };
        } else {
          currentBlock.length++;
        }
      }
    });
    
    if (currentBlock) workBlocks.push(currentBlock);
    
    const workOnlyBlocks = workBlocks.filter(block => block.type !== 'R');
    const avgBlockLength = workOnlyBlocks.length > 0 
      ? workOnlyBlocks.reduce((sum, block) => sum + block.length, 0) / workOnlyBlocks.length 
      : 0;
    
    console.log(`👤 ${staff.id} grouping analysis:`, {
      pattern: pattern.join(''),
      workBlocks: workOnlyBlocks.length,
      avgBlockLength: avgBlockLength.toFixed(1),
      blocks: workOnlyBlocks.map(b => `${b.type}×${b.length}`).join(' ')
    });
  });
}
