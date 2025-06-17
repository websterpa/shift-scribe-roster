import { supabase } from "@/integrations/supabase/client";
import { buildRosterCycle } from "../rosterCycle";
import { createLogger } from "../errorLogger";
import { StaffMember, Assignment } from "@/types/roster";
import { generateAssignments } from "./assignmentGenerator";
import { createRosterVersion } from "./rosterVersion";
import { isStaffEligibleForShift, getEligibleShiftCodes } from "./shiftCodeMapping";
import { enforceStaffingRequirements } from "./staffingEnforcement";
import { enforceRestRequirement } from "./restValidation";

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
    pattern?: string[];
    staffing_requirements?: {
      day_shift_staff?: number;
      night_shift_staff?: number;
      early_shift_staff?: number;
      late_shift_staff?: number;
    };
  },
  versionName?: string
) {
  try {
    console.log('🚀 AUDIT: generateAndSaveRoster started with pattern:', config.pattern);
    console.log('📊 AUDIT: Input parameters:', { 
      staffCount: staffList.length, 
      config, 
      versionName,
      hasPattern: !!config.pattern,
      patternLength: config.pattern?.length,
      hasStaffingRequirements: !!config.staffing_requirements
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

    // FIXED: Use custom pattern if provided, otherwise use default cycle generation
    console.log('📋 AUDIT: Building roster cycle...');
    let cycle;
    
    if (config.pattern && config.pattern.length > 0) {
      console.log('🎨 AUDIT: Using provided pattern for cycle generation', config.pattern);
      
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

    // FIXED: Apply 11-hour rest enforcement to cycle
    if (cycle && cycle.length > 0) {
      console.log('⏰ AUDIT: Enforcing 11-hour rest requirements...');
      cycle = enforceElevenHourRest(cycle, config.shift_type);
      console.log('✅ AUDIT: Rest enforcement completed');
    }

    // Apply staffing requirements enforcement if provided
    if (config.staffing_requirements) {
      console.log('🎯 AUDIT: Applying staffing requirements enforcement');
      
      // Convert cycle to day-based assignments
      const dayAssignments: { [day: number]: { [staffId: string]: string } } = {};
      const totalDays = config.cycle_length_weeks * 7;
      
      // Initialize all days
      for (let day = 0; day < totalDays; day++) {
        dayAssignments[day] = {};
        staffList.forEach(staff => {
          dayAssignments[day][staff.id] = 'R'; // Default to rest
        });
      }
      
      // Apply cycle assignments
      cycle.forEach(assignment => {
        if (dayAssignments[assignment.day]) {
          dayAssignments[assignment.day][assignment.staffId] = assignment.shiftCode;
        }
      });
      
      // Enforce staffing requirements
      const adjustedAssignments = enforceStaffingRequirements(
        dayAssignments,
        staffList,
        config.shift_type,
        config.staffing_requirements
      );
      
      // Convert back to cycle format
      cycle = [];
      Object.keys(adjustedAssignments).forEach(dayStr => {
        const day = parseInt(dayStr);
        Object.entries(adjustedAssignments[day]).forEach(([staffId, shiftCode]) => {
          cycle.push({
            day,
            staffId,
            shiftCode,
            date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });
        });
      });
      
      console.log('✅ AUDIT: Staffing requirements applied');
    }

    console.log('🔍 AUDIT: Final cycle generation result:');
    console.log(`  Cycle entries: ${cycle ? cycle.length : 'null'}`);
    if (cycle && cycle.length > 0) {
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

    // Fetch approved leave requests
    console.log('📅 AUDIT: Fetching leave requests...');
    const leaveMap = await fetchLeaveRequests();
    console.log('✅ AUDIT: Leave requests processed', { staffWithLeave: Object.keys(leaveMap).length });

    // Fetch past weeks for rolling average
    console.log('📈 AUDIT: Preparing past weeks data...');
    const pastWeeksMap = await fetchPastWeeks(staffList, config.cycle_length_weeks);
    console.log('✅ AUDIT: Past weeks data prepared');

    // FIXED: Use provided versionName properly
    const finalVersionName = versionName && versionName.trim() 
      ? versionName.trim() 
      : `Generated ${new Date().toLocaleDateString()}`;
    
    console.log('📄 AUDIT: Creating roster version with name:', finalVersionName);
    const versionId = await createRosterVersion(
      config.id, 
      finalVersionName, 
      config.start_date, 
      config.cycle_length_weeks
    );
    console.log('✅ AUDIT: Created roster version:', versionId);

    // Generate assignments
    console.log('⚙️ AUDIT: Generating assignments...');
    const assignments = generateAssignments(staffList, cycle, config, leaveMap, pastWeeksMap);
    
    console.log('🔍 AUDIT: Assignment generation result:');
    console.log(`  Generated assignments: ${assignments ? assignments.length : 'null'}`);
    
    if (!assignments || assignments.length === 0) {
      const error = 'Failed to generate any assignments';
      console.error('❌ AUDIT: Assignment generation failed:', error);
      throw new Error(error);
    }
    
    console.log('✅ AUDIT: Generated assignments', { count: assignments.length });

    // Save assignments to database
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

/**
 * Enforces 11-hour rest between shifts in the cycle
 */
function enforceElevenHourRest(cycle: any[], shiftType: "8h" | "12h"): any[] {
  console.log('⏰ Starting 11-hour rest enforcement...');
  
  // Group assignments by staff member
  const staffAssignments: { [staffId: string]: any[] } = {};
  cycle.forEach(assignment => {
    if (!staffAssignments[assignment.staffId]) {
      staffAssignments[assignment.staffId] = [];
    }
    staffAssignments[assignment.staffId].push(assignment);
  });

  // Sort each staff's assignments by day
  Object.keys(staffAssignments).forEach(staffId => {
    staffAssignments[staffId].sort((a, b) => a.day - b.day);
  });

  const adjustedCycle = [...cycle];
  let adjustmentCount = 0;

  // Check each staff member's consecutive shifts
  Object.entries(staffAssignments).forEach(([staffId, assignments]) => {
    for (let i = 1; i < assignments.length; i++) {
      const prevAssignment = assignments[i - 1];
      const currentAssignment = assignments[i];
      
      // Skip if either is a rest day
      if (prevAssignment.shiftCode === 'R' || currentAssignment.shiftCode === 'R') {
        continue;
      }

      // Calculate shift end time for previous day
      const prevShiftEnd = calculateShiftEndTime(prevAssignment.day, prevAssignment.shiftCode, shiftType);
      // Calculate shift start time for current day  
      const currentShiftStart = calculateShiftStartTime(currentAssignment.day, currentAssignment.shiftCode, shiftType);

      // Check if 11-hour rest is violated
      if (!enforceRestRequirement(staffId, currentAssignment.shiftCode, prevShiftEnd, currentShiftStart)) {
        console.log(`⚠️ Rest violation: Staff ${staffId} day ${currentAssignment.day} - changing to R`);
        
        // Find and update the assignment in the main cycle
        const cycleIndex = adjustedCycle.findIndex(a => 
          a.staffId === staffId && a.day === currentAssignment.day
        );
        if (cycleIndex !== -1) {
          adjustedCycle[cycleIndex].shiftCode = 'R';
          adjustmentCount++;
        }
      }
    }
  });

  console.log(`✅ 11-hour rest enforcement completed: ${adjustmentCount} shifts changed to rest`);
  return adjustedCycle;
}

function calculateShiftEndTime(day: number, shiftCode: string, shiftType: "8h" | "12h"): Date {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + day);
  
  // Set start times based on shift code and type
  if (shiftType === "12h") {
    switch (shiftCode) {
      case 'D': // Day shift: 07:00-19:00
        baseDate.setHours(19, 0, 0, 0);
        break;
      case 'N': // Night shift: 19:00-07:00 (+1 day)
        baseDate.setHours(7, 0, 0, 0);
        baseDate.setDate(baseDate.getDate() + 1);
        break;
      default:
        baseDate.setHours(19, 0, 0, 0); // Default to day shift end
    }
  } else { // 8h
    switch (shiftCode) {
      case 'E': // Early: 06:00-14:00
        baseDate.setHours(14, 0, 0, 0);
        break;
      case 'D': // Day: 10:00-18:00  
        baseDate.setHours(18, 0, 0, 0);
        break;
      case 'L': // Late: 14:00-22:00
        baseDate.setHours(22, 0, 0, 0);
        break;
      case 'N': // Night: 22:00-06:00 (+1 day)
        baseDate.setHours(6, 0, 0, 0);
        baseDate.setDate(baseDate.getDate() + 1);
        break;
      default:
        baseDate.setHours(18, 0, 0, 0); // Default to day shift end
    }
  }
  
  return baseDate;
}

function calculateShiftStartTime(day: number, shiftCode: string, shiftType: "8h" | "12h"): Date {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + day);
  
  // Set start times based on shift code and type
  if (shiftType === "12h") {
    switch (shiftCode) {
      case 'D': // Day shift: 07:00-19:00
        baseDate.setHours(7, 0, 0, 0);
        break;
      case 'N': // Night shift: 19:00-07:00 (+1 day)
        baseDate.setHours(19, 0, 0, 0);
        break;
      default:
        baseDate.setHours(7, 0, 0, 0); // Default to day shift start
    }
  } else { // 8h
    switch (shiftCode) {
      case 'E': // Early: 06:00-14:00
        baseDate.setHours(6, 0, 0, 0);
        break;
      case 'D': // Day: 10:00-18:00
        baseDate.setHours(10, 0, 0, 0);
        break;
      case 'L': // Late: 14:00-22:00
        baseDate.setHours(14, 0, 0, 0);
        break;
      case 'N': // Night: 22:00-06:00 (+1 day)
        baseDate.setHours(22, 0, 0, 0);
        break;
      default:
        baseDate.setHours(10, 0, 0, 0); // Default to day shift start
    }
  }
  
  return baseDate;
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
