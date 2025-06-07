
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface StaffOption {
  id: string;
  first_name: string;
  last_name: string;
  leave_allowance_days?: number;
  leave_taken_monthly: Record<string, number>;
}

export function useStaffData() {
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffList = async () => {
    try {
      console.log('Fetching staff list...');
      setError(null);
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("id, first_name, last_name, leave_allowance_days")
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
            ...s, 
            leave_taken_monthly: monthlyCounts,
            leave_allowance_days: s.leave_allowance_days || 25 // Use database value or default
          };
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
    loading, 
    error, 
    refreshStaff: fetchStaffList 
  };
}
