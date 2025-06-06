
import { supabase } from "@/integrations/supabase/client";
import { StaffMember } from "@/types/roster";
import { createLogger } from "../errorLogger";

const logger = createLogger('StaffHelpers');

/**
 * Fetches staff members from the database
 */
export async function fetchStaffMembers(): Promise<StaffMember[]> {
  logger.info('Fetching staff members');
  
  try {
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('is_active', true);

    if (error) {
      logger.error(new Error('Failed to fetch staff members'), { error });
      return [];
    }

    logger.info(`Fetched ${data?.length || 0} staff members`);

    return data?.map(staff => ({
      id: staff.id,
      employee_id: staff.employee_id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email,
      phone: staff.phone,
      hire_date: staff.hire_date,
      is_active: staff.is_active,
      // Compute name field for backwards compatibility
      name: `${staff.first_name} ${staff.last_name}`,
      role: staff.role || 'CCTV Operator',
      is_shift_worker: staff.is_shift_worker ?? true,
      eligible_shifts: staff.eligible_shifts || ['Early', 'Late', 'Night'],
      min_hours_per_week: staff.min_hours_per_week || 32,
      max_hours_per_week: staff.max_hours_per_week || 48,
      opted_out_wtd: staff.opted_out_wtd || false,
      days_off_per_week: staff.days_off_per_week || 2,
      hourly_rate: staff.hourly_rate || 15.50,
      holiday_multiplier: staff.holiday_multiplier || 2,
      leave_allowance_days: staff.leave_allowance_days || 28
    })) || [];
  } catch (error) {
    logger.error(new Error('Exception in fetchStaffMembers'), { originalError: error });
    return [];
  }
}
