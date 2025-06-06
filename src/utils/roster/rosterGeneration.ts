
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

    // Enhanced validation
    if (!staffList || staffList.length === 0) {
      throw new Error('No staff members provided for roster generation');
    }

    if (!config || !config.id) {
      throw new Error('Invalid configuration provided for roster generation');
    }

    // Validate minimum staff requirements
    const minStaffRequired = calculateMinimumStaffRequired(config);
    if (staffList.length < minStaffRequired) {
      throw new Error(`Insufficient staff: need at least ${minStaffRequired} staff members, but only ${staffList.length} available`);
    }

    // Validate shift eligibility
    const eligibleStaff = staffList.filter(staff => 
      staff.eligible_shifts && staff.eligible_shifts.length > 0
    );
    if (eligibleStaff.length === 0) {
      throw new Error('No staff members have eligible shifts configured');
    }

    logger.info('Validation passed', { eligibleStaff: eligibleStaff.length, minRequired: minStaffRequired });

    // 1. Build cycle assignments with enhanced logic
    const cycle = buildRosterCycle(
      staffList,
      config.cycle_length_weeks,
      config.shift_type,
      config.operational_hours_per_day,
      config.handshake_minutes
    );

    logger.info('Cycle assignments built successfully');

    // 2. Fetch approved leave requests with better error handling
    const leaveMap = await fetchLeaveRequests();
    logger.info('Leave requests processed', { staffWithLeave: Object.keys(leaveMap).length });

    // 3. Fetch past weeks for rolling average
    const pastWeeksMap = await fetchPastWeeks(staffList, config.cycle_length_weeks);
    logger.info('Past weeks data prepared');

    // 4. Create roster version with proper parameter passing
    const versionId = await createRosterVersion(
      config.id, 
      versionName || `Generated ${new Date().toLocaleDateString()}`, 
      config.start_date, 
      config.cycle_length_weeks
    );
    logger.info('Created roster version:', versionId);

    // 5. Generate assignments with improved logic
    const assignments = generateAssignments(staffList, cycle, config, leaveMap, pastWeeksMap);
    
    if (!assignments || assignments.length === 0) {
      throw new Error('Failed to generate any assignments');
    }
    
    logger.info('Generated assignments', { count: assignments.length });

    // 6. Save assignments to database with validation
    await saveAssignments(assignments, versionId);
    logger.info('Successfully saved roster assignments', { count: assignments.length, versionId });

    return versionId;
  } catch (error: any) {
    logger.error(new Error('Failed to generate and save roster'), { error });
    throw new Error(`Roster generation failed: ${error.message}`);
  }
}

/**
 * Calculate minimum staff required based on configuration
 */
function calculateMinimumStaffRequired(config: {
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  cycle_length_weeks: number;
}): number {
  if (config.shift_type === "12h") {
    // For 12h shifts, need at least 2 staff per day (day/night) + coverage
    return Math.max(4, Math.ceil(config.operational_hours_per_day / 12) + 2);
  } else {
    // For 8h shifts, need at least 3 staff per day + coverage
    return Math.max(6, Math.ceil(config.operational_hours_per_day / 8) + 3);
  }
}

/**
 * Fetch approved leave requests with improved error handling
 */
async function fetchLeaveRequests(): Promise<Record<string, { date: string; type: string }[]>> {
  try {
    const { data: leaves, error } = await supabase
      .from("leave_requests")
      .select("staff_id, start_date, end_date, leave_type")
      .eq("status", "approved");
      
    if (error) {
      logger.error(new Error('Failed to fetch leave requests'), { error });
      logger.warn('Continuing roster generation without leave data');
      return {};
    }

    if (!leaves || leaves.length === 0) {
      logger.info('No approved leave requests found');
      return {};
    }

    const leaveMap: Record<string, { date: string; type: string }[]> = {};
    
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
            type: lr.leave_type === 'sick' ? 'S' : 'R'
          });
        }
      } catch (dateError) {
        logger.error(new Error('Error processing leave request'), { 
          error: dateError, 
          leaveRequest: lr 
        });
      }
    });

    logger.info('Successfully processed leave requests', { 
      totalRequests: leaves.length, 
      staffAffected: Object.keys(leaveMap).length 
    });
    return leaveMap;
  } catch (error: any) {
    logger.error(new Error('Error fetching leave requests'), { error });
    return {};
  }
}

/**
 * Fetch historical hours data for staff members
 */
async function fetchPastWeeks(staffList: StaffMember[], cycleLengthWeeks: number): Promise<Record<string, number[]>> {
  try {
    const pastWeeksMap: Record<string, number[]> = {};
    
    // Initialize with empty arrays for each staff member
    staffList.forEach(staff => {
      if (staff && staff.id) {
        // For now, initialize with zeros. In production, this would fetch actual historical data
        pastWeeksMap[staff.id] = Array(Math.max(0, cycleLengthWeeks - 1)).fill(0);
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
 * Save generated assignments to the database with enhanced validation
 */
async function saveAssignments(assignments: Assignment[], versionId: string): Promise<void> {
  try {
    if (!assignments || assignments.length === 0) {
      throw new Error('No assignments to save');
    }

    if (!versionId) {
      throw new Error('Version ID is required to save assignments');
    }

    logger.info('Preparing to save assignments', { count: assignments.length, versionId });

    // Validate and prepare assignments
    const validAssignments = assignments
      .filter(assignment => {
        if (!assignment) {
          logger.warn('Null assignment found, skipping');
          return false;
        }
        if (!assignment.staff_id || !assignment.date || !assignment.shift_code) {
          logger.warn('Invalid assignment data, skipping:', assignment);
          return false;
        }
        return true;
      })
      .map(assignment => ({
        ...assignment,
        version_id: versionId,
        hours: assignment.hours || 0,
        cost: assignment.cost || 0
      }));

    if (validAssignments.length === 0) {
      throw new Error('No valid assignments to save after filtering');
    }

    logger.info('Saving valid assignments', { validCount: validAssignments.length });

    // Save in batches to avoid potential query size limits
    const batchSize = 100;
    for (let i = 0; i < validAssignments.length; i += batchSize) {
      const batch = validAssignments.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from("roster_assignments")
        .insert(batch);
        
      if (error) {
        logger.error(new Error(`Error inserting assignment batch ${i / batchSize + 1}`), { error });
        throw error;
      }
      
      logger.info(`Saved batch ${i / batchSize + 1}/${Math.ceil(validAssignments.length / batchSize)}`);
    }

    logger.info('Successfully saved all assignments to database');
  } catch (error: any) {
    logger.error(new Error('Error in saveAssignments'), { error });
    throw new Error(`Failed to save assignments: ${error.message}`);
  }
}

// Export from original file for backward compatibility
export { generateAssignments as generateRosterAssignments } from "./assignmentGenerator";
export { fetchStaffMembers } from "./staffHelpers";
