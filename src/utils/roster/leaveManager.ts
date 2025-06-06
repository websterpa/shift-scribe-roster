
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "../errorLogger";

const logger = createLogger('LeaveManager');

interface LeaveEntry {
  date: string;
  type: string;
}

export async function fetchLeaveRequests(): Promise<Record<string, LeaveEntry[]>> {
  try {
    logger.info('Fetching approved leave requests...');
    
    const { data: leaves, error } = await supabase
      .from("leave_requests")
      .select("staff_id, start_date, end_date, leave_type")
      .eq("status", "approved");
    
    if (error) {
      logger.error(new Error('Failed to fetch leave requests'), { error });
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!leaves) {
      logger.warn('No leave data returned from database');
      return {};
    }
    
    logger.info('Fetched leave requests:', { count: leaves.length });
    
    const leaveMap: Record<string, LeaveEntry[]> = {};
    
    leaves.forEach((lr: any) => {
      try {
        if (!lr.staff_id || !lr.start_date || !lr.end_date) {
          logger.warn('Invalid leave request data, skipping:', lr);
          return;
        }
        
        const staffId = lr.staff_id;
        const startDate = new Date(lr.start_date);
        const endDate = new Date(lr.end_date);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          logger.warn('Invalid date in leave request, skipping:', lr);
          return;
        }
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          leaveMap[staffId] = leaveMap[staffId] || [];
          leaveMap[staffId].push({ 
            date: d.toDateString(), 
            type: lr.leave_type || 'Unknown'
          });
        }
      } catch (dateError) {
        logger.error(new Error('Error processing leave request'), { 
          error: dateError, 
          leaveRequest: lr 
        });
      }
    });

    return leaveMap;
  } catch (error: any) {
    logger.error(new Error('Failed to fetch leave requests'), { error });
    throw new Error(`Failed to fetch leave requests: ${error.message}`);
  }
}
