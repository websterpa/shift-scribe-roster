
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { StaffMember } from "@/types/roster";

export function useStaffData() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffList = async () => {
    try {
      console.log('Fetching staff list...');
      setError(null);
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("is_active", true);

      if (error) {
        console.error('Error fetching staff:', error);
        setError(error.message);
        toast({ title: "Error fetching staff", description: error.message, variant: "destructive" });
        return;
      }

      console.log('Staff data:', data);

      const enriched = await Promise.all(
        data?.map(async (s) => {
          // Count monthly leave requests for this staff member
          const { data: leaveData } = await supabase
            .from("leave_requests")
            .select("start_date, leave_type")
            .eq("staff_id", s.id)
            .eq("status", "approved");

          const monthlyCounts: Record<string, number> = {};
          leaveData?.forEach((lr: any) => {
            const monthKey = lr.start_date.slice(0, 7); // "YYYY-MM"
            monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
          });

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

      setStaffList(enriched);
    } catch (error) {
      console.error('Error in fetchStaffList:', error);
      const errorMessage = "Failed to load staff data";
      setError(errorMessage);
      toast({ title: "Error loading staff", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
