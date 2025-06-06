
import { supabase } from "@/integrations/supabase/client";
import { Assignment, StaffMember } from "@/types/roster";
import { createLogger } from "../errorLogger";

const logger = createLogger('RosterHelpers');

/**
 * Generates roster assignments for a specific time period
 */
export async function generateRosterAssignments(
  configId: string,
  staffMembers: StaffMember[],
  startDate: Date,
  endDate: Date
): Promise<Assignment[]> {
  logger.info('Generating roster assignments...', { configId, startDate, endDate });
  
  const assignments: Assignment[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Simple assignment logic - assign first available staff to each shift
    const shiftCodes = ['E', 'L', 'N']; // Early, Late, Night
    
    shiftCodes.forEach((shiftCode, index) => {
      const availableStaff = staffMembers.filter(staff => 
        staff.is_shift_worker && 
        staff.eligible_shifts.includes(getShiftName(shiftCode))
      );

      if (availableStaff.length > 0) {
        const staffMember = availableStaff[index % availableStaff.length];
        
        assignments.push({
          date: currentDate.toISOString().split('T')[0],
          staff_id: staffMember.id,
          shift_code: shiftCode,
          hours: 8, // Default 8-hour shift
          cost: staffMember.hourly_rate * 8
        });
      }
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  logger.info('Generated assignments', { count: assignments.length });
  return assignments;
}

/**
 * Returns human-readable shift name from shift code
 */
export function getShiftName(shiftCode: string): string {
  switch (shiftCode) {
    case 'E': return 'Early';
    case 'L': return 'Late';
    case 'N': return 'Night';
    case 'D': return 'Day';
    default: return 'Unknown';
  }
}

/**
 * Saves roster assignments as a new version
 */
export async function saveRosterVersion(
  configId: string,
  assignments: Assignment[]
): Promise<string | null> {
  try {
    logger.info('Saving roster version...', { configId, assignmentCount: assignments.length });

    // Create new roster version
    const { data: versionData, error: versionError } = await supabase
      .from('roster_versions')
      .insert({
        config_id: configId,
        version_number: 1 // In a real implementation, this would increment
      })
      .select()
      .single();

    if (versionError) {
      logger.error(new Error('Error creating roster version'), { error: versionError });
      return null;
    }

    logger.info('Created roster version:', { id: versionData.id });

    // Save assignments
    const assignmentsWithVersion = assignments.map(assignment => ({
      ...assignment,
      version_id: versionData.id
    }));

    const { error: assignmentsError } = await supabase
      .from('roster_assignments')
      .insert(assignmentsWithVersion);

    if (assignmentsError) {
      logger.error(new Error('Error saving assignments'), { error: assignmentsError });
      return null;
    }

    logger.info('Saved assignments successfully');
    return versionData.id;
  } catch (error) {
    logger.error(new Error('Error in saveRosterVersion'), { originalError: error });
    return null;
  }
}
