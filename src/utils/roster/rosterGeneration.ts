
import { supabase } from "@/integrations/supabase/client";
import { buildRosterCycle } from "../rosterCycle";
import { createLogger } from "../errorLogger";
import { StaffMember, Assignment } from "@/types/roster";
import { generateRosterAssignments } from "./assignmentGenerator";

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
  logger.info('Starting roster generation...', { staffCount: staffList.length, config, versionName });

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
  const { data: leaves, error: leaveError } = await supabase
    .from("leave_requests")
    .select("staff_id, start_date, end_date, leave_type")
    .eq("status", "approved");
    
  if (leaveError) {
    logger.error(new Error('Failed to fetch leave requests'), { error: leaveError });
    throw leaveError;
  }
    
  logger.info('Fetched leave requests:', { count: leaves?.length || 0 });
  
  const leaveMap: Record<string, { date: string; type: string }[]> = {};
  leaves?.forEach((lr: any) => {
    for (let d = new Date(lr.start_date); d <= new Date(lr.end_date); d.setDate(d.getDate() + 1)) {
      leaveMap[lr.staff_id] = leaveMap[lr.staff_id] || [];
      leaveMap[lr.staff_id].push({ date: new Date(d).toDateString(), type: lr.leave_type });
    }
  });

  // 3. Fetch past weeks for rolling average
  const pastWeeksMap = await fetchPastWeeks(staffList, config.cycle_length_weeks);
  logger.info('Past weeks data prepared');

  // 4. Get next version number for this config
  const versionId = await createRosterVersion(config.id, versionName);
  logger.info('Created roster version:', versionId);

  // 5. Generate assignments
  const assignments = generateRosterAssignments(staffList, cycle, config, leaveMap, pastWeeksMap);
  logger.info('Generated assignments', { count: assignments.length });

  // 6. Save assignments to database
  await saveAssignments(assignments, versionId);
  logger.info('Successfully saved roster assignments', { count: assignments.length });

  return versionId;
}

/**
 * Fetch historical hours data for staff members
 */
async function fetchPastWeeks(staffList: StaffMember[], cycleLengthWeeks: number): Promise<Record<string, number[]>> {
  const pastWeeksMap: Record<string, number[]> = {};
  
  // In a real implementation, this would fetch actual historical data
  // from a staff_hours_history table or similar
  staffList.forEach(staff => {
    pastWeeksMap[staff.id] = Array(cycleLengthWeeks - 1).fill(0);
  });

  return pastWeeksMap;
}

/**
 * Create a new roster version in the database
 */
async function createRosterVersion(configId: string, versionName?: string): Promise<string> {
  // Get next version number
  const { data: existingVersions, error: versionQueryError } = await supabase
    .from("roster_versions")
    .select("version_number")
    .eq("config_id", configId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (versionQueryError) {
    logger.error(new Error('Error querying existing versions'), { error: versionQueryError });
    throw versionQueryError;
  }
    
  const nextVersionNumber = existingVersions && existingVersions.length > 0 
    ? existingVersions[0].version_number + 1 
    : 1;

  // Create version with version_name
  const versionData: any = {
    config_id: configId,
    version_number: nextVersionNumber
  };
  
  if (versionName && versionName.trim()) {
    versionData.version_name = versionName.trim();
    logger.info('Including version name in roster version:', versionName.trim());
  }
  
  const { data: rv, error: versionError } = await supabase
    .from("roster_versions")
    .insert(versionData)
    .select("id")
    .single();
    
  if (versionError) {
    logger.error(new Error('Failed to create roster version'), { error: versionError });
    throw versionError;
  }
  
  logger.info('Successfully created roster version with ID:', rv.id);
  return rv.id;
}

/**
 * Save generated assignments to the database
 */
async function saveAssignments(assignments: Assignment[], versionId: string): Promise<void> {
  // Add version_id to each assignment
  const assignmentsWithVersionId = assignments.map(assignment => ({
    ...assignment,
    version_id: versionId
  }));

  const { error: assignmentError } = await supabase
    .from("roster_assignments")
    .insert(assignmentsWithVersionId);
    
  if (assignmentError) {
    logger.error(new Error('Error inserting assignments'), { error: assignmentError });
    throw assignmentError;
  }
}

// Export from original file for backward compatibility
export { generateRosterAssignments, saveRosterVersion } from "./rosterHelpers";
export { fetchStaffMembers } from "./staffHelpers";
