import { supabase } from "@/integrations/supabase/client";
import { buildRosterCycle } from "../rosterCycle";
import { createLogger } from "../errorLogger";
import { StaffMember, Assignment } from "@/types/roster";
import { generateAssignments } from "./assignmentGenerator";
import { createRosterVersion } from "./rosterVersion";

const logger = createLogger('RosterGeneration');

/**
 * Generates and saves a roster to the database based on staff and configuration data
 */
export async function generateAndSaveRoster(
  staffList: StaffMember[],
  config: {
    id: string;
    cycle_length_weeks: number;
    shift_type: "8h" | "12h";
    operational_hours_per_day: number;
    handshake_minutes: number;
    start_date: string;
  },
  versionName?: string
) {
  try {
    logger.info('Starting roster generation...', { staffCount: staffList.length, config, versionName });

    if (!staffList || staffList.length === 0) {
      throw new Error('No staff members provided for roster generation');
    }

    if (!config || !config.id) {
      throw new Error('Invalid configuration provided for roster generation');
    }

    // 1. Build cycle assignments
    const cycle = buildRosterCycle(
      staffList,
      config.cycle_length_weeks,
      config.shift_type,
      config.operational_hours_per_day,
      config.handshake_minutes
    );

    logger.info('Cycle assignments built');

    // 2. Fetch approved leave requests
    let leaveMap: Record<string, { date: string; type: string }[]> = {};
    try {
      const { data: leaves, error: leaveError } = await supabase
        .from("leave_requests")
        .select("staff_id, start_date, end_date, leave_type")
        .eq("status", "approved");
        
      if (leaveError) {
        logger.error(new Error('Failed to fetch leave requests'), { error: leaveError });
        // Continue without leave data rather than failing
        logger.warn('Continuing roster generation without leave data');
      } else if (leaves) {
        leaves.forEach((lr: any) => {
          try {
            if (!lr.staff_id || !lr.start_date || !lr.end_date) {
              logger.warn('Invalid leave request data, skipping:', lr);
              return;
            }
            
            const startDate = new Date(lr.start_date);
            const endDate = new Date(lr.end_date);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              logger.warn('Invalid date in leave request, skipping:', lr);
              return;
            }
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              leaveMap[lr.staff_id] = leaveMap[lr.staff_id] || [];
              leaveMap[lr.staff_id].push({ 
                date: new Date(d).toDateString(), 
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
        logger.info('Fetched leave requests:', { count: leaves.length });
      }
    } catch (leaveError: any) {
      logger.error(new Error('Error fetching leave requests, continuing without leave data'), { error: leaveError });
    }

    // 3. Fetch past weeks for rolling average
    const pastWeeksMap = await fetchPastWeeks(staffList, config.cycle_length_weeks);
    logger.info('Past weeks data prepared');

    // 4. Get next version number for this config
    const versionId = await createRosterVersion(
      config.id, 
      versionName, 
      config.start_date, 
      config.cycle_length_weeks
    );
    logger.info('Created roster version:', versionId);

    // 5. Generate assignments
    const assignments = generateAssignments(staffList, cycle, config, leaveMap, pastWeeksMap);
    logger.info('Generated assignments', { count: assignments.length });

    // 6. Save assignments to database
    await saveAssignments(assignments, versionId);
    logger.info('Successfully saved roster assignments', { count: assignments.length });

    return versionId;
  } catch (error: any) {
    logger.error(new Error('Failed to generate and save roster'), { error });
    throw new Error(`Failed to generate roster: ${error.message}`);
  }
}

/**
 * Fetch historical hours data for staff members
 */
async function fetchPastWeeks(staffList: StaffMember[], cycleLengthWeeks: number): Promise<Record<string, number[]>> {
  try {
    const pastWeeksMap: Record<string, number[]> = {};
    
    // In a real implementation, this would fetch actual historical data
    // from a staff_hours_history table or similar
    staffList.forEach(staff => {
      if (staff && staff.id) {
        pastWeeksMap[staff.id] = Array(cycleLengthWeeks - 1).fill(0);
      }
    });

    return pastWeeksMap;
  } catch (error: any) {
    logger.error(new Error('Error fetching past weeks data'), { error });
    // Return empty data rather than failing
    return {};
  }
}

/**
 * Save generated assignments to the database
 */
async function saveAssignments(assignments: Assignment[], versionId: string): Promise<void> {
  try {
    if (!assignments || assignments.length === 0) {
      logger.warn('No assignments to save');
      return;
    }

    if (!versionId) {
      throw new Error('Version ID is required to save assignments');
    }

    logger.info('Saving assignments to database', { count: assignments.length, versionId });

    // Add version_id to each assignment
    const assignmentsWithVersionId = assignments.map(assignment => {
      if (!assignment) {
        logger.warn('Null assignment found, skipping');
        return null;
      }
      return {
        ...assignment,
        version_id: versionId
      };
    }).filter(Boolean); // Remove any null assignments

    if (assignmentsWithVersionId.length === 0) {
      throw new Error('No valid assignments to save after filtering');
    }

    const { error: assignmentError } = await supabase
      .from("roster_assignments")
      .insert(assignmentsWithVersionId);
      
    if (assignmentError) {
      logger.error(new Error('Error inserting assignments'), { error: assignmentError });
      throw assignmentError;
    }

    logger.info('Successfully saved assignments to database');
  } catch (error: any) {
    logger.error(new Error('Error in saveAssignments'), { error });
    throw new Error(`Failed to save assignments: ${error.message}`);
  }
}

// Export from original file for backward compatibility
export { generateAssignments as generateRosterAssignments } from "./assignmentGenerator";
export { fetchStaffMembers } from "./staffHelpers";
