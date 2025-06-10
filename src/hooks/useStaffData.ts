
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { StaffMember } from "@/types/roster";

export function useStaffData() {
  console.log('🔄 useStaffData hook initialized');
  
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffList = async () => {
    try {
      console.log('📥 useStaffData: Fetching staff list...');
      setError(null);
      // Remove the is_active filter to fetch ALL staff members
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .order("is_active", { ascending: false }) // Show active staff first
        .order("last_name", { ascending: true }); // Then order by last name

      if (error) {
        console.error('❌ useStaffData: Error fetching staff:', error);
        setError(error.message);
        toast({ title: "Error fetching staff", description: error.message, variant: "destructive" });
        return;
      }

      console.log('📊 useStaffData: Raw staff data from database:', data?.length || 0, 'records');

      const enriched = await Promise.all(
        data?.map(async (s) => {
          console.log('👤 Processing staff member:', s.first_name, s.last_name, 'Active:', s.is_active);
          
          // Count monthly leave requests for this staff member
          const { data: leaveData, error: leaveError } = await supabase
            .from("leave_requests")
            .select("start_date, leave_type")
            .eq("staff_id", s.id)
            .eq("status", "approved");

          if (leaveError) {
            console.warn('⚠️ Error fetching leave data for staff:', s.id, leaveError);
          }

          const monthlyCounts: Record<string, number> = {};
          leaveData?.forEach((lr: any) => {
            const monthKey = lr.start_date.slice(0, 7); // "YYYY-MM"
            monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
          });

          console.log('📊 Leave counts for', s.first_name, ':', monthlyCounts);

          return { 
            id: s.id,
            employee_id: s.employee_id,
            first_name: s.first_name,
            last_name: s.last_name,
            email: s.email,
            phone: s.phone,
            hire_date: s.hire_date,
            is_active: s.is_active,
            role: s.role || 'CCTV Operator',
            eligible_shifts: s.eligible_shifts || ['Early', 'Late', 'Night'],
            is_shift_worker: s.is_shift_worker ?? true,
            min_hours_per_week: s.min_hours_per_week || 37,
            max_hours_per_week: s.max_hours_per_week || 48,
            opted_out_wtd: s.opted_out_wtd || false,
            days_off_per_week: s.days_off_per_week || 2,
            hourly_rate: s.hourly_rate || 15.50,
            holiday_multiplier: s.holiday_multiplier || 2,
            leave_allowance_days: s.leave_allowance_days || 28,
            leave_taken_monthly: monthlyCounts,
            name: `${s.first_name} ${s.last_name}` // Computed field for backwards compatibility
          } as StaffMember;
        }) || []
      );

      console.log('✅ useStaffData: Processed staff list:', enriched.length, 'members');
      console.log('📊 Active staff:', enriched.filter(s => s.is_active).length);
      console.log('📊 Inactive staff:', enriched.filter(s => !s.is_active).length);
      setStaffList(enriched);
    } catch (error) {
      console.error('❌ useStaffData: Exception in fetchStaffList:', error);
      const errorMessage = "Failed to load staff data";
      setError(errorMessage);
      toast({ title: "Error loading staff", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useStaffData: useEffect triggered');
    fetchStaffList();
  }, []);

  return { 
    staffMembers: staffList, 
    staffList, // Keep for backwards compatibility with ManageLeave
    loading, 
    error, 
    refreshStaff: fetchStaffList,
    refetchStaffList: fetchStaffList // Keep for backwards compatibility with ManageLeave
  };
}
