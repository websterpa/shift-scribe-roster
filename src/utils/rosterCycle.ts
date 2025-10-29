
import { generateEnhancedRosterCycle } from '@/services/roster/helpers/enhancedCycleIntegration';

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

  // Convert staff list to StaffMember format with all required properties
  const staffMembers = staffList.map(staff => ({
    id: staff.id,
    employee_id: staff.id, // Use id as employee_id fallback
    first_name: staff.id,
    last_name: '',
    email: `${staff.id}@company.com`, // Default email
    phone: '',
    hire_date: new Date().toISOString().split('T')[0], // Today's date
    is_active: true,
    availability_status: 'active' as const,
    role: 'CCTV Operator',
    eligible_shifts: staff.eligible_shifts,
    is_shift_worker: staff.is_shift_worker,
    min_hours_per_week: 32,
    max_hours_per_week: 48,
    opted_out_wtd: false,
    days_off_per_week: 2,
    hourly_rate: 15.50,
    holiday_multiplier: 2,
    leave_allowance_days: 28
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
