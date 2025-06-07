
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

  for (let w = 0; w < cycleWeeks; w++) {
    assignment[w] = {};
    for (let d = 0; d < 7; d++) {
      assignment[w][d] = {};
      
      if (shiftType === "12h") {
        // 12-hour shifts: Day (6am-6pm) and Night (6pm-6am)
        const dayStaffNeeded = staffing.day_shift_staff || 2;
        const nightStaffNeeded = staffing.night_shift_staff || 2;
        
        console.log(`📅 Week ${w + 1}, Day ${d + 1}: Need ${dayStaffNeeded} day staff, ${nightStaffNeeded} night staff`);
        
        // Assign day shifts
        let assignedStaff = 0;
        for (let i = 0; i < dayStaffNeeded && assignedStaff < shiftWorkers.length; i++) {
          const staffIndex = (w * 7 + d + assignedStaff) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          if (staff.eligible_shifts.includes('Day') || staff.eligible_shifts.includes('D')) {
            assignment[w][d][staff.id] = "D";
          } else {
            assignment[w][d][staff.id] = "R";
          }
          assignedStaff++;
        }
        
        // Assign night shifts to different staff
        for (let i = 0; i < nightStaffNeeded && assignedStaff < shiftWorkers.length; i++) {
          const staffIndex = (w * 7 + d + assignedStaff) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          if (staff.eligible_shifts.includes('Night') || staff.eligible_shifts.includes('N')) {
            assignment[w][d][staff.id] = "N";
          } else {
            assignment[w][d][staff.id] = "R";
          }
          assignedStaff++;
        }
        
        // Rest of shift workers get rest days
        while (assignedStaff < shiftWorkers.length) {
          const staffIndex = (w * 7 + d + assignedStaff) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          assignment[w][d][staff.id] = "R";
          assignedStaff++;
        }
      } else {
        // 8-hour shifts: Early, Late, Night
        const earlyStaffNeeded = staffing.early_shift_staff || 1;
        const lateStaffNeeded = staffing.late_shift_staff || 1;
        const nightStaffNeeded = staffing.night_shift_staff || 1;
        
        console.log(`📅 Week ${w + 1}, Day ${d + 1}: Need ${earlyStaffNeeded} early, ${lateStaffNeeded} late, ${nightStaffNeeded} night staff`);
        
        let assignedStaff = 0;
        
        // Early shift (6am-2pm)
        for (let i = 0; i < earlyStaffNeeded && assignedStaff < shiftWorkers.length; i++) {
          const staffIndex = (w * 7 + d + assignedStaff) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          if (staff.eligible_shifts.includes('Early') || staff.eligible_shifts.includes('E')) {
            assignment[w][d][staff.id] = "E";
          } else {
            assignment[w][d][staff.id] = "R";
          }
          assignedStaff++;
        }
        
        // Late shift (2pm-10pm)
        for (let i = 0; i < lateStaffNeeded && assignedStaff < shiftWorkers.length; i++) {
          const staffIndex = (w * 7 + d + assignedStaff) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          if (staff.eligible_shifts.includes('Late') || staff.eligible_shifts.includes('L')) {
            assignment[w][d][staff.id] = "L";
          } else {
            assignment[w][d][staff.id] = "R";
          }
          assignedStaff++;
        }
        
        // Night shift (10pm-6am)
        for (let i = 0; i < nightStaffNeeded && assignedStaff < shiftWorkers.length; i++) {
          const staffIndex = (w * 7 + d + assignedStaff) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          if (staff.eligible_shifts.includes('Night') || staff.eligible_shifts.includes('N')) {
            assignment[w][d][staff.id] = "N";
          } else {
            assignment[w][d][staff.id] = "R";
          }
          assignedStaff++;
        }
        
        // Rest of shift workers get rest days
        while (assignedStaff < shiftWorkers.length) {
          const staffIndex = (w * 7 + d + assignedStaff) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          assignment[w][d][staff.id] = "R";
          assignedStaff++;
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
    }
  }

  console.log('✅ Roster cycle generated successfully with staffing requirements');
  return assignment;
}
