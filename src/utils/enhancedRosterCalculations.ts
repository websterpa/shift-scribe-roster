
import { supabase } from '@/integrations/supabase/client';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  is_shift_worker: boolean;
  eligible_shifts: string[];
  min_hours_per_week: number;
  max_hours_per_week: number;
  opted_out_wtd: boolean;
  days_off_per_week: number;
  hourly_rate: number;
  holiday_multiplier: number;
}

export interface RosterConfig {
  id: string;
  config_name: string;
  cycle_length_weeks: number;
  shift_type: string;
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
}

export interface Assignment {
  date: string;
  staff_id: string;
  shift_code: string;
  shift_start?: string;
  shift_end?: string;
  hours?: number;
  cost?: number;
}

export async function generateRosterAssignments(
  configId: string,
  staffMembers: StaffMember[],
  startDate: Date,
  endDate: Date
): Promise<Assignment[]> {
  console.log('Generating roster assignments...', { configId, startDate, endDate });
  
  const assignments: Assignment[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Simple assignment logic - assign first available staff to each shift
    const shiftCodes = ['E', 'L', 'N']; // Early, Late, Night
    
    shiftCodes.forEach((shiftCode, index) => {
      const availableStaff = staffMembers.filter(staff => 
        staff.is_shift_worker && 
        staff.eligible_shifts.includes(getShiftName(shiftCode))
      );

      if (availableStaff.length > 0) {
        const staffMember = availableStaff[index % availableStaff.length];
        
        assignments.push({
          date: currentDate.toISOString().split('T')[0],
          staff_id: staffMember.id,
          shift_code: shiftCode,
          hours: 8, // Default 8-hour shift
          cost: staffMember.hourly_rate * 8
        });
      }
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return assignments;
}

function getShiftName(shiftCode: string): string {
  switch (shiftCode) {
    case 'E': return 'Early';
    case 'L': return 'Late';
    case 'N': return 'Night';
    case 'D': return 'Day';
    default: return 'Unknown';
  }
}

export async function saveRosterVersion(
  configId: string,
  assignments: Assignment[]
): Promise<string | null> {
  try {
    console.log('Saving roster version...', { configId, assignmentCount: assignments.length });

    // Create new roster version
    const { data: versionData, error: versionError } = await supabase
      .from('roster_versions')
      .insert({
        config_id: configId,
        version_number: 1 // In a real implementation, this would increment
      })
      .select()
      .single();

    if (versionError) {
      console.error('Error creating roster version:', versionError);
      return null;
    }

    console.log('Created roster version:', versionData);

    // Save assignments
    const assignmentsWithVersion = assignments.map(assignment => ({
      ...assignment,
      version_id: versionData.id
    }));

    const { error: assignmentsError } = await supabase
      .from('roster_assignments')
      .insert(assignmentsWithVersion);

    if (assignmentsError) {
      console.error('Error saving assignments:', assignmentsError);
      return null;
    }

    console.log('Saved assignments successfully');
    return versionData.id;
  } catch (error) {
    console.error('Error in saveRosterVersion:', error);
    return null;
  }
}

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  try {
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching staff members:', error);
      return [];
    }

    return data?.map(staff => ({
      id: staff.id,
      name: staff.name || `${staff.first_name} ${staff.last_name}`,
      role: staff.role || 'CCTV Operator',
      is_shift_worker: staff.is_shift_worker ?? true,
      eligible_shifts: staff.eligible_shifts || ['Early', 'Late', 'Night'],
      min_hours_per_week: staff.min_hours_per_week || 32,
      max_hours_per_week: staff.max_hours_per_week || 48,
      opted_out_wtd: staff.opted_out_wtd || false,
      days_off_per_week: staff.days_off_per_week || 2,
      hourly_rate: staff.hourly_rate || 15.50,
      holiday_multiplier: staff.holiday_multiplier || 2
    })) || [];
  } catch (error) {
    console.error('Error in fetchStaffMembers:', error);
    return [];
  }
}
