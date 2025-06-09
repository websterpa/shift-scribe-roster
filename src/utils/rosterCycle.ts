
import { generateEnhancedRosterCycle } from './roster/enhancedCycleIntegration';
import { StaffMember } from '@/types/roster';

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
  console.log('🔄 buildRosterCycle called with enhanced cycle generation:', {
    staffCount: staffList.length,
    cycleWeeks,
    shiftType,
    operationalHours,
    handshakeMinutes,
    staffingRequirements
  });

  // Convert the staff list to the format expected by enhanced cycle generation
  const enhancedStaffList: StaffMember[] = staffList.map(staff => ({
    id: staff.id,
    employee_id: `EMP-${staff.id.slice(0, 6)}`,
    first_name: 'Staff',
    last_name: staff.id.slice(0, 8),
    name: `Staff ${staff.id.slice(0, 8)}`,
    email: `${staff.id}@example.com`,
    phone: '',
    hire_date: '2023-01-01',
    is_active: true,
    role: 'Staff Member',
    eligible_shifts: staff.eligible_shifts,
    is_shift_worker: staff.is_shift_worker,
    min_hours_per_week: 35,
    max_hours_per_week: 48,
    opted_out_wtd: false,
    days_off_per_week: 2,
    hourly_rate: 15,
    holiday_multiplier: 2,
    leave_allowance_days: 28
  }));

  console.log('✨ Using enhanced cycle generation with rule compliance');
  
  // Use the enhanced cycle generation that follows the 8 fundamental rules
  const enhancedCycle = generateEnhancedRosterCycle(
    enhancedStaffList,
    cycleWeeks,
    shiftType,
    operationalHours,
    handshakeMinutes
  );

  console.log('✅ Enhanced cycle generated with proper shift grouping and rest periods');
  
  // Log a sample of the enhanced pattern for verification
  const sampleStaffId = enhancedStaffList[0]?.id;
  if (sampleStaffId && enhancedCycle[0]) {
    const week1Pattern = [];
    for (let day = 0; day < 7; day++) {
      week1Pattern.push(enhancedCycle[0][day][sampleStaffId] || 'R');
    }
    console.log(`📋 Sample week 1 pattern for ${sampleStaffId}:`, week1Pattern.join(''));
  }

  return enhancedCycle;
}
