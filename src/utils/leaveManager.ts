import { supabase } from "@/integrations/supabase/client";

export type LeaveCode = "A/L" | "S" | "SP" | "CL";
export type LeaveMap = Record<string /* staffId */, Record<string /* yyyy-mm-dd */, LeaveCode>>;

/**
 * Fetches approved leave requests from Supabase and converts them to LeaveMap format
 */
export async function getLeaveMap(): Promise<LeaveMap> {
  try {
    const { data: leaveRequests, error } = await supabase
      .from('leave_requests')
      .select('staff_id, start_date, end_date, leave_type')
      .eq('status', 'approved');

    if (error) {
      console.error('Error fetching leave requests:', error);
      return {};
    }

    const leaveMap: LeaveMap = {};

    leaveRequests?.forEach((request) => {
      const staffId = request.staff_id;
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      const leaveCode = mapLeaveTypeToCode(request.leave_type);

      if (!leaveMap[staffId]) {
        leaveMap[staffId] = {};
      }

      // Add all dates in the leave period
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateISO = currentDate.toISOString().split('T')[0]; // yyyy-mm-dd format
        leaveMap[staffId][dateISO] = leaveCode;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return leaveMap;
  } catch (error) {
    console.error('Error in getLeaveMap:', error);
    return {};
  }
}

/**
 * Maps database leave types to standard leave codes
 */
function mapLeaveTypeToCode(leaveType: string): LeaveCode {
  switch (leaveType.toLowerCase()) {
    case 'annual leave':
    case 'annual_leave':
    case 'holiday':
      return 'A/L';
    case 'sick':
    case 'sick_leave':
      return 'S';
    case 'special':
    case 'special_leave':
      return 'SP';
    case 'compassionate':
    case 'compassionate_leave':
      return 'CL';
    default:
      return 'A/L'; // Default to annual leave
  }
}