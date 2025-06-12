import { supabase } from "@/integrations/supabase/client";
import { buildRosterCycle } from "../rosterCycle";
import { createLogger } from "../errorLogger";
import { StaffMember, Assignment } from "@/types/roster";
import { generateAssignments } from "./assignmentGenerator";
import { createRosterVersion } from "./rosterVersion";
import { isStaffEligibleForShift, getEligibleShiftCodes } from "./shiftCodeMapping";

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
    console.log('🚀 AUDIT: generateAndSaveRoster started');
    console.log('📊 AUDIT: Input parameters:', { 
      staffCount: staffList.length, 
      config, 
      versionName,
      hasPattern: !!config.pattern,
      patternLength: config.pattern?.length
    });

    // Enhanced staff eligibility logging
    console.log('👥 AUDIT: Staff eligibility analysis:');
    staffList.forEach((staff, index) => {
      const eligibleCodes = getEligibleShiftCodes(staff.eligible_shifts);
      console.log(`  Staff ${index + 1}:`, {
        id: staff.id,
        name: `${staff.first_name} ${staff.last_name}`,
        is_shift_worker: staff.is_shift_worker,
        eligible_shifts_names: staff.eligible_shifts,
        eligible_shift_codes: eligibleCodes,
        is_active: staff.is_active
      });
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
      console.error('❌ AUDIT: Validation failed:', error);
      throw new Error(error);
    }

    if (!config || !config.id) {
      const error = 'Invalid configuration provided for roster generation';
      console.error('❌ AUDIT: Validation failed:', error);
      throw new Error(error);
    }

    // Validate pattern if provided
    if (config.pattern && config.pattern.length === 0) {
      const error = 'Empty pattern provided - pattern must contain at least one shift code';
      console.error('❌ AUDIT: Validation failed:', error);
      throw new Error(error);
    }

    // Validate minimum staff requirements
    const minStaffRequired = calculateMinimumStaffRequired(config);
    if (staffList.length < minStaffRequired) {
      const error = `Insufficient staff: need at least ${minStaffRequired} staff members, but only ${staffList.length} available`;
      console.error('❌ AUDIT: Validation failed:', error);
      throw new Error(error);
    }

    // Validate shift eligibility with improved logging
    const eligibleStaff = staffList.filter(staff => {
      if (!staff.is_shift_worker) return false;
      const eligibleCodes = getEligibleShiftCodes(staff.eligible_shifts);
      return eligibleCodes.length > 0;
    });
    
    console.log('🔍 AUDIT: Enhanced eligible staff analysis:');
    console.log(`  Total staff: ${staffList.length}`);
    console.log(`  Shift workers: ${staffList.filter(s => s.is_shift_worker).length}`);
    console.log(`  With eligible shifts: ${eligibleStaff.length}`);
    
    if (eligibleStaff.length === 0) {
      const error = 'No shift worker staff members have eligible shifts configured';
      console.error('❌ AUDIT: Validation failed:', error);
      throw new Error(error);
    }

    console.log('✅ AUDIT: Validation passed', { 
      eligibleStaff: eligibleStaff.length, 
      minRequired: calculateMinimumStaffRequired(config),
      usingCustomPattern: !!config.pattern 
    });

    // 1. Build cycle assignments - use custom pattern if provided
    console.log('📋 AUDIT: Building roster cycle...');
    let cycle;
    
    if (config.pattern && config.pattern.length > 0) {
      console.log('🎨 AUDIT: Using custom pattern for cycle generation', config.pattern);
      
      // Use the enhanced cycle generation with the custom pattern
      cycle = await createCycleFromPatternEnhanced(
        staffList,
        config.pattern,
        config.cycle_length_weeks,
        config.shift_type,
        config.operational_hours_per_day,
        config.handshake_minutes
      );
    } else {
      console.log('🔄 AUDIT: Using default cycle generation algorithm');
      
      cycle = buildRosterCycle(
        staffList,
        config.cycle_length_weeks,
        config.shift_type,
        config.operational_hours_per_day,
        config.handshake_minutes
      );
    }

    console.log('🔍 AUDIT: Cycle generation result:');
    console.log(`  Cycle entries: ${cycle ? cycle.length : 'null'}`);
    if (cycle && cycle.length > 0) {
      console.log('  Sample cycle entries (first 10):');
      cycle.slice(0, 10).forEach((entry, index) => {
        console.log(`    ${index + 1}:`, entry);
      });
      
      // Count non-rest assignments
      const nonRestAssignments = cycle.filter(entry => entry.shiftCode !== 'R');
      console.log(`  Non-rest assignments: ${nonRestAssignments.length}`);
      
      // Group by shift type
      const shiftCounts = cycle.reduce((acc, entry) => {
        acc[entry.shiftCode] = (acc[entry.shiftCode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('  Shift distribution:', shiftCounts);
    }

    if (!cycle || cycle.length === 0) {
      const error = 'Cycle generation failed - no assignments created';
      console.error('❌ AUDIT: Cycle generation failed:', error);
      throw new Error(error);
    }

    console.log('✅ AUDIT: Cycle assignments built successfully');

    // 2. Fetch approved leave requests
    console.log('📅 AUDIT: Fetching leave requests...');
    const leaveMap = await fetchLeaveRequests();
    console.log('✅ AUDIT: Leave requests processed', { staffWithLeave: Object.keys(leaveMap).length });

    // 3. Fetch past weeks for rolling average
    console.log('📈 AUDIT: Preparing past weeks data...');
    const pastWeeksMap = await fetchPastWeeks(staffList, config.cycle_length_weeks);
    console.log('✅ AUDIT: Past weeks data prepared');

    // 4. Create roster version
    console.log('📄 AUDIT: Creating roster version...');
    const versionId = await createRosterVersion(
      config.id, 
      versionName || `Generated ${new Date().toLocaleDateString()}`, 
      config.start_date, 
      config.cycle_length_weeks
    );
    console.log('✅ AUDIT: Created roster version:', versionId);

    // 5. Generate assignments
    console.log('⚙️ AUDIT: Generating assignments...');
    console.log('📊 AUDIT: Assignment generation inputs:', {
      staffListLength: staffList.length,
      cycleLength: cycle.length,
      config: config,
      leaveMapKeys: Object.keys(leaveMap),
      pastWeeksMapKeys: Object.keys(pastWeeksMap)
    });
    
    const assignments = generateAssignments(staffList, cycle, config, leaveMap, pastWeeksMap);
    
    console.log('🔍 AUDIT: Assignment generation result:');
    console.log(`  Generated assignments: ${assignments ? assignments.length : 'null'}`);
    
    if (assignments && assignments.length > 0) {
      console.log('  Sample assignments (first 10):');
      assignments.slice(0, 10).forEach((assignment, index) => {
        console.log(`    ${index + 1}:`, assignment);
      });
      
      // Count non-rest assignments
      const nonRestAssignments = assignments.filter(assignment => assignment.shift_code !== 'R');
      console.log(`  Non-rest assignments: ${nonRestAssignments.length}`);
      
      // Group by shift type
      const assignmentShiftCounts = assignments.reduce((acc, assignment) => {
        acc[assignment.shift_code] = (acc[assignment.shift_code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('  Assignment shift distribution:', assignmentShiftCounts);
    }
    
    if (!assignments || assignments.length === 0) {
      const error = 'Failed to generate any assignments';
      console.error('❌ AUDIT: Assignment generation failed:', error);
      throw new Error(error);
    }
    
    console.log('✅ AUDIT: Generated assignments', { count: assignments.length });

    // 6. Save assignments to database
    console.log('💾 AUDIT: Saving assignments to database...');
    await saveAssignments(assignments, versionId);
    console.log('✅ AUDIT: Successfully saved roster assignments', { count: assignments.length, versionId });

    console.log('🎉 AUDIT: generateAndSaveRoster completed successfully, returning version ID:', versionId);
    return versionId;
  } catch (error: any) {
    console.error('❌ AUDIT: generateAndSaveRoster error:', error);
    console.error('❌ AUDIT: Error stack:', error.stack);
    logger.error(new Error('Failed to generate and save roster'), { error });
    throw new Error(`Roster generation failed: ${error.message}`);
  }
}

// Enhanced function to create cycle from custom pattern with proper validation
async function createCycleFromPatternEnhanced(
  staffList: StaffMember[],
  pattern: string[],
  cycleLengthWeeks: number,
  shiftType: "8h" | "12h",
  operationalHoursPerDay: number,
  handshakeMinutes: number
) {
  console.log('🎨 AUDIT: Creating enhanced cycle from custom pattern', { 
    pattern, 
    staffCount: staffList.length,
    cycleLengthWeeks 
  });

  // Import the enhanced cycle generation
  const { generateEnhancedRosterCycle } = await import('./enhancedCycleIntegration');
  
  // Convert staff list to the format expected by enhanced cycle generation
  const enhancedStaffList = staffList.map(staff => ({
    ...staff,
    // Ensure all required fields are present
    employee_id: staff.employee_id || staff.id,
    first_name: staff.first_name || staff.id,
    last_name: staff.last_name || '',
    email: staff.email || `${staff.id}@company.com`,
    phone: staff.phone || '',
    hire_date: new Date().toISOString().split('T')[0],
    is_active: staff.is_active !== undefined ? staff.is_active : true,
    availability_status: staff.availability_status || 'active',
    role: staff.role || 'CCTV Operator',
    min_hours_per_week: staff.min_hours_per_week || 32,
    max_hours_per_week: staff.max_hours_per_week || 48,
    opted_out_wtd: staff.opted_out_wtd || false,
    days_off_per_week: staff.days_off_per_week || 2,
    hourly_rate: staff.hourly_rate || 15.50,
    holiday_multiplier: staff.holiday_multiplier || 2,
    leave_allowance_days: staff.leave_allowance_days || 28
  }));

  console.log('🔧 AUDIT: Using enhanced cycle generation with custom pattern');
  
  // Generate the enhanced cycle with the custom pattern as a guide
  const enhancedCycle = generateEnhancedRosterCycle(
    enhancedStaffList,
    cycleLengthWeeks,
    shiftType,
    operationalHoursPerDay,
    handshakeMinutes,
    pattern // Pass the pattern as a guide
  );

  console.log('🔍 AUDIT: Enhanced cycle generation result:', {
    cycleKeys: Object.keys(enhancedCycle),
    totalWeeks: Object.keys(enhancedCycle).length
  });

  // Convert back to the expected format for the rest of the system
  const cycle = [];
  const totalDays = cycleLengthWeeks * 7;

  for (let day = 0; day < totalDays; day++) {
    const weekIndex = Math.floor(day / 7);
    const dayIndex = day % 7;
    
    if (enhancedCycle[weekIndex] && enhancedCycle[weekIndex][dayIndex]) {
      Object.entries(enhancedCycle[weekIndex][dayIndex]).forEach(([staffId, shiftCode]) => {
        const assignment = {
          day,
          staffId,
          shiftCode,
          date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
        cycle.push(assignment);
        
        // Log non-rest assignments for audit
        if (shiftCode !== 'R') {
          console.log(`🎯 AUDIT: Non-rest assignment created:`, assignment);
        }
      });
    }
  }

  console.log('✅ AUDIT: Enhanced pattern cycle created', { 
    totalAssignments: cycle.length,
    patternLength: pattern.length,
    cycleWeeks: cycleLengthWeeks,
    nonRestAssignments: cycle.filter(c => c.shiftCode !== 'R').length
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

    console.log('📊 AUDIT: Preparing to save assignments', { count: assignments.length, versionId });

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

    console.log('📊 AUDIT: Saving valid assignments', { validCount: validAssignments.length });

    // Save in batches to avoid potential query size limits
    const batchSize = 100;
    for (let i = 0; i < validAssignments.length; i += batchSize) {
      const batch = validAssignments.slice(i, i + batchSize);
      
      console.log(`💾 AUDIT: Inserting batch ${i / batchSize + 1}/${Math.ceil(validAssignments.length / batchSize)}`);
      const { error } = await supabase
        .from("roster_assignments")
        .insert(batch);
        
      if (error) {
        console.error(`❌ AUDIT: Error inserting assignment batch ${i / batchSize + 1}:`, error);
        logger.error(new Error(`Error inserting assignment batch ${i / batchSize + 1}`), { error });
        throw error;
      }
      
      console.log(`✅ AUDIT: Saved batch ${i / batchSize + 1}/${Math.ceil(validAssignments.length / batchSize)}`);
    }

    console.log('🎉 AUDIT: Successfully saved all assignments to database');
  } catch (error: any) {
    console.error('❌ AUDIT: Error in saveAssignments:', error);
    logger.error(new Error('Error in saveAssignments'), { error });
    throw new Error(`Failed to save assignments: ${error.message}`);
  }
}

// Export helper functions including the missing one
export { fetchStaffMembers } from "./staffHelpers";

// Export the missing function that was referenced
export const generateRosterAssignments = generateAndSaveRoster;

export default generateAndSaveRoster;
