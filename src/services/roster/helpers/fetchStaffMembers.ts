/**
 * Staff Data Fetching
 * 
 * Canonical implementation for fetching staff members from the database.
 * Migrated from utils/roster/staffHelpers.ts
 * 
 * @module services/roster/helpers/fetchStaffMembers
 */

import { createLogger } from "@/utils/errorLogger";
import { supabase } from "@/integrations/supabase/client";
import type { StaffMember } from "@/types/roster";
import { cachedFetch } from "@/lib/cache";

const logger = createLogger('FetchStaffMembers');

/**
 * Fetches staff members from the database
 * 
 * FILTERS APPLIED:
 * - Only 'active' availability_status (not temporarily_unavailable or inactive)
 * - This is intentionally permissive to maximize eligible pool
 * 
 * PERMISSIVE DEFAULTS:
 * - Empty/null eligible_shifts → treated as eligible for all shift types
 * - Missing role → defaults to 'CCTV Operator'
 * 
 * @param tenantId - Optional tenant filter for multi-tenancy support
 * @returns Promise<StaffMember[]> - Array of eligible staff members
 */
export async function fetchStaffMembers(tenantId?: string): Promise<StaffMember[]> {
  logger.info('Fetching staff members for roster generation', { tenantId });
  
  // Use cache with 60-second TTL to reduce redundant queries
  const cacheKey = `staff_${tenantId || 'default'}`;
  
  return cachedFetch(cacheKey, async () => {
    try {
      // Query all staff with 'active' availability_status
      // Do NOT filter by is_active, role, site_id, or skills - keep it permissive
      // Note: Using explicit type to avoid Supabase PostgREST deep type instantiation issues
      let query: any = supabase
        .from('staff_profiles')
        .select('*')
        .eq('availability_status', 'active');

      // Apply tenant filter if provided
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

    if (error) {
      logger.error(new Error('Failed to fetch staff members'), { error });
      console.error("[STAFF-FETCH] Database error:", error);
      return [];
    }

    // Diagnostic logging
    console.info("[STAFF-FETCH] ✅ Eligible staff after filters:", data?.length || 0);
    console.info("[STAFF-FETCH] Staff names:", data?.map(s => `${s.first_name} ${s.last_name}`).join(', '));
    
    logger.info(`Fetched ${data?.length || 0} eligible staff members`, {
      count: data?.length || 0,
      names: data?.map(s => `${s.first_name} ${s.last_name}`)
    });

    // Map to StaffMember format with permissive defaults
    const staffMembers = data?.map(staff => {
      // PERMISSIVE DEFAULT: If eligible_shifts is empty/null, assume eligible for all shifts
      const eligibleShifts = staff.eligible_shifts && staff.eligible_shifts.length > 0
        ? staff.eligible_shifts
        : ['Early', 'Late', 'Night', 'Day']; // All shift types
      
      return {
        id: staff.id,
        employee_id: staff.employee_id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        phone: staff.phone,
        hire_date: staff.hire_date,
        is_active: staff.is_active,
        availability_status: (staff.availability_status || 'active') as 'active' | 'temporarily_unavailable' | 'inactive',
        unavailability_reason: staff.unavailability_reason,
        unavailable_from: staff.unavailable_from,
        expected_return_date: staff.expected_return_date,
        unavailability_notes: staff.unavailability_notes,
        // Compute name field for backwards compatibility
        name: `${staff.first_name} ${staff.last_name}`,
        role: staff.role || 'CCTV Operator',
        is_shift_worker: staff.is_shift_worker ?? true,
        eligible_shifts: eligibleShifts, // Use permissive default
        min_hours_per_week: staff.min_hours_per_week || 32,
        max_hours_per_week: staff.max_hours_per_week || 48,
        opted_out_wtd: staff.opted_out_wtd || false,
        days_off_per_week: staff.days_off_per_week || 2,
        hourly_rate: staff.hourly_rate || 15.50,
        holiday_multiplier: staff.holiday_multiplier || 2,
        leave_allowance_days: staff.leave_allowance_days || 28
      };
    }) || [];
    
    // Log any staff with permissive defaults applied
    const staffWithDefaultShifts = staffMembers.filter(s => 
      !data?.find(d => d.id === s.id)?.eligible_shifts || 
      data?.find(d => d.id === s.id)?.eligible_shifts?.length === 0
    );
    
    if (staffWithDefaultShifts.length > 0) {
      console.info("[STAFF-FETCH] Applied permissive shift defaults for:", 
        staffWithDefaultShifts.map(s => s.name).join(', '));
      logger.info('Applied permissive shift eligibility defaults', {
        count: staffWithDefaultShifts.length,
        names: staffWithDefaultShifts.map(s => s.name)
      });
    }
    
      return staffMembers;
    } catch (error) {
      logger.error(new Error('Exception in fetchStaffMembers'), { originalError: error });
      return [];
    }
  }, 60_000); // 60-second TTL
}
