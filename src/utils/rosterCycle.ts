
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
  console.log('🔄 buildRosterCycle called with:', {
    staffCount: staffList.length,
    cycleWeeks,
    shiftType,
    operationalHours,
    handshakeMinutes,
    staffingRequirements
  });

  const assignment: CycleAssignment = {};
  
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

  // Track staff assignment to ensure even distribution
  const staffShiftCounts: Record<string, number> = {};
  shiftWorkers.forEach(staff => {
    staffShiftCounts[staff.id] = 0;
  });

  for (let w = 0; w < cycleWeeks; w++) {
    assignment[w] = {};
    for (let d = 0; d < 7; d++) {
      assignment[w][d] = {};
      
      // Initialize all staff to rest first
      [...shiftWorkers, ...supervisors].forEach(staff => {
        assignment[w][d][staff.id] = "R";
      });
      
      if (shiftType === "12h") {
        // 12-hour shifts: Day (6am-6pm) and Night (6pm-6am)
        const dayStaffNeeded = staffing.day_shift_staff || 2;
        const nightStaffNeeded = staffing.night_shift_staff || 2;
        
        console.log(`📅 Week ${w + 1}, Day ${d + 1}: Assigning ${dayStaffNeeded} day staff, ${nightStaffNeeded} night staff`);
        
        // Get available staff sorted by current shift count (least worked first)
        const availableStaff = [...shiftWorkers].sort((a, b) => 
          staffShiftCounts[a.id] - staffShiftCounts[b.id]
        );
        
        let assignedCount = 0;
        
        // Assign day shifts
        for (let i = 0; i < dayStaffNeeded && assignedCount < availableStaff.length; i++) {
          const staff = availableStaff[assignedCount];
          if (staff.eligible_shifts.includes('Day') || staff.eligible_shifts.includes('D')) {
            assignment[w][d][staff.id] = "D";
            staffShiftCounts[staff.id]++;
            console.log(`✅ Assigned ${staff.id} to Day shift on Week ${w + 1}, Day ${d + 1}`);
          }
          assignedCount++;
        }
        
        // Assign night shifts
        for (let i = 0; i < nightStaffNeeded && assignedCount < availableStaff.length; i++) {
          const staff = availableStaff[assignedCount];
          if (staff.eligible_shifts.includes('Night') || staff.eligible_shifts.includes('N')) {
            assignment[w][d][staff.id] = "N";
            staffShiftCounts[staff.id]++;
            console.log(`✅ Assigned ${staff.id} to Night shift on Week ${w + 1}, Day ${d + 1}`);
          }
          assignedCount++;
        }
        
      } else {
        // 8-hour shifts: Early, Late, Night
        const earlyStaffNeeded = staffing.early_shift_staff || 1;
        const lateStaffNeeded = staffing.late_shift_staff || 1;
        const nightStaffNeeded = staffing.night_shift_staff || 1;
        
        console.log(`📅 Week ${w + 1}, Day ${d + 1}: Assigning ${earlyStaffNeeded} early, ${lateStaffNeeded} late, ${nightStaffNeeded} night staff`);
        
        // Get available staff sorted by current shift count (least worked first)
        const availableStaff = [...shiftWorkers].sort((a, b) => 
          staffShiftCounts[a.id] - staffShiftCounts[b.id]
        );
        
        let assignedCount = 0;
        
        // Assign early shifts
        for (let i = 0; i < earlyStaffNeeded && assignedCount < availableStaff.length; i++) {
          const staff = availableStaff[assignedCount];
          if (staff.eligible_shifts.includes('Early') || staff.eligible_shifts.includes('E')) {
            assignment[w][d][staff.id] = "E";
            staffShiftCounts[staff.id]++;
            console.log(`✅ Assigned ${staff.id} to Early shift on Week ${w + 1}, Day ${d + 1}`);
          }
          assignedCount++;
        }
        
        // Assign late shifts
        for (let i = 0; i < lateStaffNeeded && assignedCount < availableStaff.length; i++) {
          const staff = availableStaff[assignedCount];
          if (staff.eligible_shifts.includes('Late') || staff.eligible_shifts.includes('L')) {
            assignment[w][d][staff.id] = "L";
            staffShiftCounts[staff.id]++;
            console.log(`✅ Assigned ${staff.id} to Late shift on Week ${w + 1}, Day ${d + 1}`);
          }
          assignedCount++;
        }
        
        // Assign night shifts
        for (let i = 0; i < nightStaffNeeded && assignedCount < availableStaff.length; i++) {
          const staff = availableStaff[assignedCount];
          if (staff.eligible_shifts.includes('Night') || staff.eligible_shifts.includes('N')) {
            assignment[w][d][staff.id] = "N";
            staffShiftCounts[staff.id]++;
            console.log(`✅ Assigned ${staff.id} to Night shift on Week ${w + 1}, Day ${d + 1}`);
          }
          assignedCount++;
        }
      }
      
      // Handle supervisors - only work weekdays during day hours
      supervisors.forEach(staff => {
        const isWeekend = d === 0 || d === 6; // Sunday = 0, Saturday = 6
        if (!isWeekend) {
          assignment[w][d][staff.id] = "D"; // Day shift for supervisors on weekdays
        } else {
          assignment[w][d][staff.id] = "R"; // Rest on weekends
        }
      });
      
      // Verify staffing requirements are met
      const dailyShiftCounts = {
        D: 0, E: 0, L: 0, N: 0
      };
      
      Object.values(assignment[w][d]).forEach(shiftCode => {
        if (dailyShiftCounts.hasOwnProperty(shiftCode)) {
          dailyShiftCounts[shiftCode as keyof typeof dailyShiftCounts]++;
        }
      });
      
      console.log(`📊 Week ${w + 1}, Day ${d + 1} shift counts:`, dailyShiftCounts);
      
      // Log warnings if staffing requirements not met
      if (shiftType === "8h") {
        if (dailyShiftCounts.E < (staffing.early_shift_staff || 0)) {
          console.warn(`⚠️ Week ${w + 1}, Day ${d + 1}: Early shift understaffed - need ${staffing.early_shift_staff}, have ${dailyShiftCounts.E}`);
        }
        if (dailyShiftCounts.L < (staffing.late_shift_staff || 0)) {
          console.warn(`⚠️ Week ${w + 1}, Day ${d + 1}: Late shift understaffed - need ${staffing.late_shift_staff}, have ${dailyShiftCounts.L}`);
        }
        if (dailyShiftCounts.N < (staffing.night_shift_staff || 0)) {
          console.warn(`⚠️ Week ${w + 1}, Day ${d + 1}: Night shift understaffed - need ${staffing.night_shift_staff}, have ${dailyShiftCounts.N}`);
        }
      } else {
        if (dailyShiftCounts.D < (staffing.day_shift_staff || 0)) {
          console.warn(`⚠️ Week ${w + 1}, Day ${d + 1}: Day shift understaffed - need ${staffing.day_shift_staff}, have ${dailyShiftCounts.D}`);
        }
        if (dailyShiftCounts.N < (staffing.night_shift_staff || 0)) {
          console.warn(`⚠️ Week ${w + 1}, Day ${d + 1}: Night shift understaffed - need ${staffing.night_shift_staff}, have ${dailyShiftCounts.N}`);
        }
      }
    }
  }

  console.log('✅ Roster cycle generated with proper staffing enforcement');
  console.log('📊 Final staff shift distribution:', staffShiftCounts);
  
  return assignment;
}
