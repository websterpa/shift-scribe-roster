
import { StaffMember } from "@/types/roster";

interface StaffingRequirement {
  shiftCode: string;
  requiredCount: number;
}

interface DayAssignment {
  [staffId: string]: string;
}

export function enforceStaffingRequirements(
  assignments: { [day: number]: DayAssignment },
  staffList: StaffMember[],
  shiftType: "8h" | "12h",
  requirements: {
    day_shift_staff?: number;
    night_shift_staff?: number;
    early_shift_staff?: number;
    late_shift_staff?: number;
  }
): { [day: number]: DayAssignment } {
  console.log('🎯 Enforcing staffing requirements:', requirements);
  
  const adjustedAssignments = { ...assignments };
  
  // Define shift codes based on shift type
  const shiftCodes = shiftType === "12h" 
    ? ['D', 'N'] 
    : ['E', 'L', 'N'];

  // Map requirements to shift codes
  const staffingRequirements: StaffingRequirement[] = [];
  
  if (shiftType === "12h") {
    if (requirements.day_shift_staff) {
      staffingRequirements.push({ shiftCode: 'D', requiredCount: requirements.day_shift_staff });
    }
    if (requirements.night_shift_staff) {
      staffingRequirements.push({ shiftCode: 'N', requiredCount: requirements.night_shift_staff });
    }
  } else {
    if (requirements.early_shift_staff) {
      staffingRequirements.push({ shiftCode: 'E', requiredCount: requirements.early_shift_staff });
    }
    if (requirements.late_shift_staff) {
      staffingRequirements.push({ shiftCode: 'L', requiredCount: requirements.late_shift_staff });
    }
    if (requirements.night_shift_staff) {
      staffingRequirements.push({ shiftCode: 'N', requiredCount: requirements.night_shift_staff });
    }
  }

  Object.keys(adjustedAssignments).forEach(dayStr => {
    const day = parseInt(dayStr);
    const dayAssignments = adjustedAssignments[day];
    
    // Count current assignments by shift
    const shiftCounts: { [shift: string]: number } = {};
    Object.values(dayAssignments).forEach(shift => {
      shiftCounts[shift] = (shiftCounts[shift] || 0) + 1;
    });

    console.log(`📊 Day ${day} current counts:`, shiftCounts);

    // Check each staffing requirement
    staffingRequirements.forEach(requirement => {
      const currentCount = shiftCounts[requirement.shiftCode] || 0;
      const needed = requirement.requiredCount - currentCount;
      
      if (needed > 0) {
        console.log(`⚠️ Day ${day}: Need ${needed} more ${requirement.shiftCode} shifts`);
        
        // Find staff currently on rest that can work this shift
        const availableStaff = staffList.filter(staff => {
          const currentShift = dayAssignments[staff.id];
          return currentShift === 'R' && staff.eligible_shifts.includes(requirement.shiftCode);
        });

        // Assign needed staff
        for (let i = 0; i < Math.min(needed, availableStaff.length); i++) {
          const staffToAssign = availableStaff[i];
          console.log(`✅ Assigning ${staffToAssign.id} to ${requirement.shiftCode} shift on day ${day}`);
          adjustedAssignments[day][staffToAssign.id] = requirement.shiftCode;
        }
      }
    });
  });

  return adjustedAssignments;
}
