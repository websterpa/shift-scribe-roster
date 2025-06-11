import { supabase } from "@/integrations/supabase/client";
import { buildRosterCycle } from "../rosterCycle";
import { createLogger } from "../errorLogger";
import { StaffMember, Assignment } from "@/types/roster";
import { generateAssignments } from "./assignmentGenerator";
import { createRosterVersion } from "./rosterVersion";

const logger = createLogger('RosterGeneration');

export async function generateAndSaveRoster(
  staffList: StaffMember[],
  config: {
    id: string;
    cycle_length_weeks: number;
    shift_type: "8h" | "12h";
    operational_hours_per_day: number;
    handshake_minutes: number;
    start_date: string;
    pattern?: string[]; // New optional pattern parameter
  },
  versionName?: string
) {
  try {
    console.log('🚀 generateAndSaveRoster started');
    console.log('📊 Input parameters:', { 
      staffCount: staffList.length, 
      config, 
      versionName,
      hasPattern: !!config.pattern,
      patternLength: config.pattern?.length
    });
    
    logger.info('Starting roster generation...', { 
      staffCount: staffList.length, 
      config, 
      versionName,
      hasPattern: !!config.pattern 
    });

    // Enhanced validation
    if (!staffList || staffList.length === 0) {
      const error = 'No staff members provided for roster generation';
      console.error('❌ Validation failed:', error);
      throw new Error(error);
    }

    if (!config || !config.id) {
      const error = 'Invalid configuration provided for roster generation';
      console.error('❌ Validation failed:', error);
      throw new Error(error);
    }

    // Validate pattern if provided
    if (config.pattern && config.pattern.length === 0) {
      const error = 'Empty pattern provided - pattern must contain at least one shift code';
      console.error('❌ Validation failed:', error);
      throw new Error(error);
    }

    // Validate minimum staff requirements
    const minStaffRequired = calculateMinimumStaffRequired(config);
    if (staffList.length < minStaffRequired) {
      const error = `Insufficient staff: need at least ${minStaffRequired} staff members, but only ${staffList.length} available`;
      console.error('❌ Validation failed:', error);
      throw new Error(error);
    }

    // Validate shift eligibility
    const eligibleStaff = staffList.filter(staff => 
      staff.eligible_shifts && staff.eligible_shifts.length > 0
    );
    if (eligibleStaff.length === 0) {
      const error = 'No staff members have eligible shifts configured';
      console.error('❌ Validation failed:', error);
      throw new Error(error);
    }

    console.log('✅ Validation passed', { 
      eligibleStaff: eligibleStaff.length, 
      minRequired: minStaffRequired,
      usingCustomPattern: !!config.pattern 
    });
    logger.info('Validation passed', { 
      eligibleStaff: eligibleStaff.length, 
      minRequired: minStaffRequired,
      usingCustomPattern: !!config.pattern 
    });

    // 1. Build cycle assignments - use custom pattern if provided
    console.log('📋 Building roster cycle...');
    let cycle;
    
    if (config.pattern && config.pattern.length > 0) {
      console.log('🎨 Using custom pattern for cycle generation', config.pattern);
      logger.info('Using custom pattern for cycle generation', { pattern: config.pattern });
      
      // Use the provided pattern directly instead of buildRosterCycle
      cycle = createCycleFromPattern(
        staffList,
        config.pattern,
        config.cycle_length_weeks,
        config.shift_type,
        config.operational_hours_per_day,
        config.handshake_minutes
      );
    } else {
      console.log('🔄 Using default cycle generation algorithm');
      logger.info('Using default cycle generation algorithm');
      
      cycle = buildRosterCycle(
        staffList,
        config.cycle_length_weeks,
        config.shift_type,
        config.operational_hours_per_day,
        config.handshake_minutes
      );
    }

    console.log('✅ Cycle assignments built successfully');
    logger.info('Cycle assignments built successfully');

    // 2. Fetch approved leave requests
    console.log('📅 Fetching leave requests...');
    const leaveMap = await fetchLeaveRequests();
    console.log('✅ Leave requests processed', { staffWithLeave: Object.keys(leaveMap).length });
    logger.info('Leave requests processed', { staffWithLeave: Object.keys(leaveMap).length });

    // 3. Fetch past weeks for rolling average
    console.log('📈 Preparing past weeks data...');
    const pastWeeksMap = await fetchPastWeeks(staffList, config.cycle_length_weeks);
    console.log('✅ Past weeks data prepared');
    logger.info('Past weeks data prepared');

    // 4. Create roster version
    console.log('📄 Creating roster version...');
    console.log('Calling supabase for roster version creation...');
    const versionId = await createRosterVersion(
      config.id, 
      versionName || `Generated ${new Date().toLocaleDateString()}`, 
      config.start_date, 
      config.cycle_length_weeks
    );
    console.log('✅ Created roster version:', versionId);
    logger.info('Created roster version:', versionId);

    // 5. Generate assignments
    console.log('⚙️ Generating assignments...');
    const assignments = generateAssignments(staffList, cycle, config, leaveMap, pastWeeksMap);
    
    if (!assignments || assignments.length === 0) {
      const error = 'Failed to generate any assignments';
      console.error('❌ Assignment generation failed:', error);
      throw new Error(error);
    }
    
    console.log('✅ Generated assignments', { count: assignments.length });
    logger.info('Generated assignments', { count: assignments.length });

    // 6. Save assignments to database
    console.log('💾 Saving assignments to database...');
    console.log('Calling supabase.from("roster_assignments").insert...');
    await saveAssignments(assignments, versionId);
    console.log('✅ Successfully saved roster assignments', { count: assignments.length, versionId });
    logger.info('Successfully saved roster assignments', { count: assignments.length, versionId });

    console.log('🎉 generateAndSaveRoster completed successfully, returning version ID:', versionId);
    return versionId;
  } catch (error: any) {
    console.error('❌ generateAndSaveRoster error:', error);
    logger.error(new Error('Failed to generate and save roster'), { error });
    throw new Error(`Roster generation failed: ${error.message}`);
  }
}

// New function to create cycle from custom pattern
function createCycleFromPattern(
  staffList: StaffMember[],
  pattern: string[],
  cycleLengthWeeks: number,
  shiftType: "8h" | "12h",
  operationalHoursPerDay: number,
  handshakeMinutes: number
) {
  console.log('🎨 Creating cycle from custom pattern', { 
    pattern, 
    staffCount: staffList.length,
    cycleLengthWeeks 
  });

  // Create a simple cycle structure based on the pattern
  const totalDays = cycleLengthWeeks * 7;
  const cycle = [];

  for (let day = 0; day < totalDays; day++) {
    const patternIndex = day % pattern.length;
    const shiftCode = pattern[patternIndex];
    
    // Create assignments for each staff member for this day
    staffList.forEach((staff, staffIndex) => {
      // Rotate the pattern start for each staff member to distribute shifts
      const staffPatternIndex = (day + staffIndex) % pattern.length;
      const staffShiftCode = pattern[staffPatternIndex];
      
      cycle.push({
        day,
        staffId: staff.id,
        shiftCode: staffShiftCode,
        date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    });
  }

  console.log('✅ Custom pattern cycle created', { 
    totalAssignments: cycle.length,
    daysPerCycle: pattern.length 
  });

  return cycle;
}

function calculateMinimumStaffRequired(config: {
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  cycle_length_weeks: number;
}): number {
  if (config.shift_type === "12h") {
    return Math.max(4, Math.ceil(config.operational_hours_per_day / 12) + 2);
  } else {
    return Math.max(6, Math.ceil(config.operational_hours_per_day / 8) + 3);
  }
}

async function fetchLeaveRequests(): Promise<Record<string, { date: string; type: string }[]>> {
  try {
    console.log('Calling supabase.from("leave_requests").select...');
    const { data: leaves, error } = await supabase
      .from("leave_requests")
      .select("staff_id, start_date, end_date, leave_type")
      .eq("status", "approved");
      
    if (error) {
      console.error('❌ Error fetching leave requests:', error);
      logger.error(new Error('Failed to fetch leave requests'), { error });
      logger.warn('Continuing roster generation without leave data');
      return {};
    }

    if (!leaves || leaves.length === 0) {
      console.log('ℹ️ No approved leave requests found');
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

    console.log('✅ Successfully processed leave requests', { 
      totalRequests: leaves.length, 
      staffAffected: Object.keys(leaveMap).length 
    });
    return leaveMap;
  } catch (error: any) {
    console.error('❌ Error fetching leave requests:', error);
    logger.error(new Error('Error fetching leave requests'), { error });
    return {};
  }
}

async function fetchPastWeeks(staffList: StaffMember[], cycleLengthWeeks: number): Promise<Record<string, number[]>> {
  try {
    const pastWeeksMap: Record<string, number[]> = {};
    
    staffList.forEach(staff => {
      if (staff && staff.id) {
        pastWeeksMap[staff.id] = Array(Math.max(0, cycleLengthWeeks - 1)).fill(0);
      }
    });

    return pastWeeksMap;
  } catch (error: any) {
    logger.error(new Error('Error fetching past weeks data'), { error });
    return {};
  }
}

async function saveAssignments(assignments: Assignment[], versionId: string): Promise<void> {
  try {
    if (!assignments || assignments.length === 0) {
      throw new Error('No assignments to save');
    }

    if (!versionId) {
      throw new Error('Version ID is required to save assignments');
    }

    console.log('📊 Preparing to save assignments', { count: assignments.length, versionId });
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

    console.log('📊 Saving valid assignments', { validCount: validAssignments.length });
    logger.info('Saving valid assignments', { validCount: validAssignments.length });

    // Save in batches to avoid potential query size limits
    const batchSize = 100;
    for (let i = 0; i < validAssignments.length; i += batchSize) {
      const batch = validAssignments.slice(i, i + batchSize);
      
      console.log(`💾 Inserting batch ${i / batchSize + 1}/${Math.ceil(validAssignments.length / batchSize)}`);
      const { error } = await supabase
        .from("roster_assignments")
        .insert(batch);
        
      if (error) {
        console.error(`❌ Error inserting assignment batch ${i / batchSize + 1}:`, error);
        logger.error(new Error(`Error inserting assignment batch ${i / batchSize + 1}`), { error });
        throw error;
      }
      
      console.log(`✅ Saved batch ${i / batchSize + 1}/${Math.ceil(validAssignments.length / batchSize)}`);
    }

    console.log('🎉 Successfully saved all assignments to database');
    logger.info('Successfully saved all assignments to database');
  } catch (error: any) {
    console.error('❌ Error in saveAssignments:', error);
    logger.error(new Error('Error in saveAssignments'), { error });
    throw new Error(`Failed to save assignments: ${error.message}`);
  }
}

// Export helper functions including the missing one
export { fetchStaffMembers } from "./staffHelpers";

// Export the missing function that was referenced
export const generateRosterAssignments = generateAndSaveRoster;

export default generateAndSaveRoster;
