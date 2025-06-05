
import { supabase } from "@/integrations/supabase/client";

interface LeaveEntry {
  date: string;
  type: string;
}

export async function fetchLeaveRequests(): Promise<Record<string, LeaveEntry[]>> {
  console.log('Fetching approved leave requests...');
  
  const { data: leaves } = await supabase
    .from("leave_requests")
    .select("staff_id, start_date, end_date, leave_type")
    .eq("status", "approved");
    
  console.log('Fetched leave requests:', leaves?.length || 0);
  
  const leaveMap: Record<string, LeaveEntry[]> = {};
  leaves?.forEach((lr: any) => {
    const staffId = lr.staff_id;
    for (let d = new Date(lr.start_date); d <= new Date(lr.end_date); d.setDate(d.getDate() + 1)) {
      leaveMap[staffId] = leaveMap[staffId] || [];
      leaveMap[staffId].push({ date: d.toDateString(), type: lr.leave_type });
    }
  });

  return leaveMap;
}
