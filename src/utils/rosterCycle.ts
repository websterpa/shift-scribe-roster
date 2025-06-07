
type ShiftCode = "D" | "E" | "L" | "N" | "R" | "S";

interface CycleAssignment {
  [weekIndex: number]: { [dayIndex: number]: { [staffId: string]: ShiftCode } };
}

export function buildRosterCycle(
  staffList: Array<{ id: string; eligible_shifts: string[]; is_shift_worker: boolean }>,
  cycleWeeks: number,
  shiftType: "8h" | "12h",
  operationalHours: number,
  handshakeMinutes: number
): CycleAssignment {
  console.log('🔄 buildRosterCycle called with:', {
    staffCount: staffList.length,
    cycleWeeks,
    shiftType,
    operationalHours,
    handshakeMinutes
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

  for (let w = 0; w < cycleWeeks; w++) {
    assignment[w] = {};
    for (let d = 0; d < 7; d++) {
      assignment[w][d] = {};
      
      if (shiftType === "12h") {
        // 12-hour shifts: Day (6am-6pm) and Night (6pm-6am)
        const dayStaffNeeded = Math.ceil(operationalHours / 24 * 1); // At least 1 person per 12-hour period
        const nightStaffNeeded = Math.ceil(operationalHours / 24 * 1);
        
        // Assign day shifts
        for (let i = 0; i < Math.min(dayStaffNeeded, shiftWorkers.length); i++) {
          const staffIndex = (w * 7 + d + i) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          if (staff.eligible_shifts.includes('Day') || staff.eligible_shifts.includes('D')) {
            assignment[w][d][staff.id] = "D";
          } else {
            assignment[w][d][staff.id] = "R";
          }
        }
        
        // Assign night shifts to different staff
        for (let i = dayStaffNeeded; i < Math.min(dayStaffNeeded + nightStaffNeeded, shiftWorkers.length); i++) {
          const staffIndex = (w * 7 + d + i) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          if (staff.eligible_shifts.includes('Night') || staff.eligible_shifts.includes('N')) {
            assignment[w][d][staff.id] = "N";
          } else {
            assignment[w][d][staff.id] = "R";
          }
        }
        
        // Rest of shift workers get rest days
        for (let i = dayStaffNeeded + nightStaffNeeded; i < shiftWorkers.length; i++) {
          const staffIndex = (w * 7 + d + i) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          assignment[w][d][staff.id] = "R";
        }
      } else {
        // 8-hour shifts: Early, Late, Night
        const shiftsPerDay = Math.ceil(operationalHours / 8);
        const staffPerShift = Math.ceil(shiftWorkers.length / shiftsPerDay);
        
        let staffAssigned = 0;
        
        // Early shift (6am-2pm)
        if (shiftsPerDay >= 1) {
          for (let i = 0; i < Math.min(staffPerShift, shiftWorkers.length - staffAssigned); i++) {
            const staffIndex = (w * 7 + d + staffAssigned + i) % shiftWorkers.length;
            const staff = shiftWorkers[staffIndex];
            if (staff.eligible_shifts.includes('Early') || staff.eligible_shifts.includes('E')) {
              assignment[w][d][staff.id] = "E";
            } else {
              assignment[w][d][staff.id] = "R";
            }
          }
          staffAssigned += Math.min(staffPerShift, shiftWorkers.length - staffAssigned);
        }
        
        // Late shift (2pm-10pm)
        if (shiftsPerDay >= 2) {
          for (let i = 0; i < Math.min(staffPerShift, shiftWorkers.length - staffAssigned); i++) {
            const staffIndex = (w * 7 + d + staffAssigned + i) % shiftWorkers.length;
            const staff = shiftWorkers[staffIndex];
            if (staff.eligible_shifts.includes('Late') || staff.eligible_shifts.includes('L')) {
              assignment[w][d][staff.id] = "L";
            } else {
              assignment[w][d][staff.id] = "R";
            }
          }
          staffAssigned += Math.min(staffPerShift, shiftWorkers.length - staffAssigned);
        }
        
        // Night shift (10pm-6am)
        if (shiftsPerDay >= 3) {
          for (let i = 0; i < Math.min(staffPerShift, shiftWorkers.length - staffAssigned); i++) {
            const staffIndex = (w * 7 + d + staffAssigned + i) % shiftWorkers.length;
            const staff = shiftWorkers[staffIndex];
            if (staff.eligible_shifts.includes('Night') || staff.eligible_shifts.includes('N')) {
              assignment[w][d][staff.id] = "N";
            } else {
              assignment[w][d][staff.id] = "R";
            }
          }
          staffAssigned += Math.min(staffPerShift, shiftWorkers.length - staffAssigned);
        }
        
        // Rest of shift workers get rest days
        for (let i = staffAssigned; i < shiftWorkers.length; i++) {
          const staffIndex = (w * 7 + d + i) % shiftWorkers.length;
          const staff = shiftWorkers[staffIndex];
          assignment[w][d][staff.id] = "R";
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

  console.log('✅ Roster cycle generated successfully');
  return assignment;
}
