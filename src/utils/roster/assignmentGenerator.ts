
import { StaffMember, Assignment } from "@/types/roster";
import { calculateShiftDetails, calculateShiftCost } from "./shiftCalculator";
import { createLogger } from "../errorLogger";
import { LeaveMap } from "../leaveManager";
import { ShiftCode } from "../constraints";
import { makeShiftWindowResolver, OTOptions } from "@/utils/shiftWindowResolver";
import { shiftCost, durationHours } from "@/utils/costing";
import { respectsRestRules } from "../restValidation";
import { assertShiftToken } from "@/domain/shifts";

const logger = createLogger('AssignmentGenerator');

export function generateAssignments(
  staffList: StaffMember[],
  cycle: Array<{ day: number; staffId: string; shiftCode: string; date: string; otOptions?: OTOptions }>,
  config: {
    shift_type: "8h" | "12h";
    operational_hours_per_day: number;
    handshake_minutes: number;
    start_date: string;
    site_start_time?: string;
    timezone?: string;
    default_ot_hours?: number;
    default_ot_start_local_time?: string;
  },
  leaveMap: LeaveMap,
  pastWeeksMap: Record<string, number[]>,
  restValidationFn?: (
    lastWorkedEnd: Date | null,
    prevWorkedDateISO: string | null, 
    prevWorkedCode: ShiftCode | null,
    dateISO: string,
    proposedCode: ShiftCode,
    resolveShiftWindow: (dateISO: string, code: ShiftCode, otOpts?: OTOptions) => any
  ) => boolean
): Assignment[] {
  console.log('⚙️ AUDIT: generateAssignments called');
  console.log('📊 AUDIT: generateAssignments inputs:', {
    staffListLength: staffList.length,
    cycleLength: cycle.length,
    configShiftType: config.shift_type,
    leaveMapKeys: Object.keys(leaveMap).length,
    pastWeeksMapKeys: Object.keys(pastWeeksMap).length
  });

  if (!cycle || cycle.length === 0) {
    console.error('❌ AUDIT: No cycle data provided to generateAssignments');
    return [];
  }

  if (!staffList || staffList.length === 0) {
    console.error('❌ AUDIT: No staff list provided to generateAssignments');
    return [];
  }

  console.log('🔍 AUDIT: Cycle analysis:');
  const shiftCounts = cycle.reduce((acc, entry) => {
    acc[entry.shiftCode] = (acc[entry.shiftCode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('  Shift distribution in cycle:', shiftCounts);

  const nonRestCycle = cycle.filter(entry => entry.shiftCode !== 'R');
  console.log(`  Non-rest entries in cycle: ${nonRestCycle.length}`);

  if (nonRestCycle.length > 0) {
    console.log('  Sample non-rest cycle entries:');
    nonRestCycle.slice(0, 5).forEach((entry, index) => {
      console.log(`    ${index + 1}:`, entry);
    });
  }

  const assignments: Assignment[] = [];
  const startDate = new Date(config.start_date);

  // Setup shift window resolver for accurate timing and rest validation
  const resolveShiftWindow = makeShiftWindowResolver({
    shiftSystem: config.shift_type,
    siteStartLocalTime: config.site_start_time || '07:00',
    timezone: config.timezone || 'Europe/London',
    defaultOtHours: config.default_ot_hours,
    defaultOtStartLocalTime: config.default_ot_start_local_time
  });

  // Track last worked info for rest validation
  const lastWorkedEndByStaff: Record<string, Date | null> = {};
  const prevWorkedDateISOByStaff: Record<string, string | null> = {};
  const prevWorkedCodeByStaff: Record<string, ShiftCode | null> = {};

  console.log('🔄 AUDIT: Processing cycle entries...');
  
  cycle.forEach((cycleEntry, index) => {
    try {
      const staff = staffList.find(s => s.id === cycleEntry.staffId);
      
      if (!staff) {
        console.warn(`⚠️ AUDIT: Staff not found for ID: ${cycleEntry.staffId}`);
        return;
      }

      // Calculate the actual date for this assignment
      const assignmentDate = new Date(startDate);
      assignmentDate.setDate(assignmentDate.getDate() + cycleEntry.day);
      const dateString = assignmentDate.toISOString().split('T')[0];

      // Check for leave conflicts using new LeaveMap format
      const staffLeave = leaveMap[staff.id];
      const hasLeave = staffLeave && staffLeave[dateString];

      let finalShiftCode = cycleEntry.shiftCode;
      
      if (hasLeave) {
        console.log(`📅 AUDIT: Staff ${staff.id} has leave on ${dateString} (${hasLeave}), converting ${cycleEntry.shiftCode} to ${hasLeave}`);
        finalShiftCode = hasLeave; // Use the actual leave code (A/L, S, SP, CL)
      }

      let shiftWindow = null;
      let shiftDetails = null;
      let cost = 0;

      // Handle OT with variable timing using shift window resolver
      if (finalShiftCode === "OT") {
        const otOpts: OTOptions = {
          otHours: cycleEntry.otOptions?.otHours || config.default_ot_hours || (config.shift_type === "12h" ? 12 : 8),
          otStartLocalTime: cycleEntry.otOptions?.otStartLocalTime || config.default_ot_start_local_time
        };

        console.log(`🕒 AUDIT: Processing OT for staff ${staff.id} on ${dateString} with options:`, otOpts);

        // Check rest rules for OT using shift window resolver
        if (restValidationFn) {
        const respectsRest = respectsRestRules(
          lastWorkedEndByStaff[staff.id] || null,
          prevWorkedDateISOByStaff[staff.id] || null,
          prevWorkedCodeByStaff[staff.id] || null,
          dateString,
          "OT",
          (d, c, opts) => resolveShiftWindow(d, c, opts || otOpts),
          otOpts
        );
          
          if (respectsRest) {
            console.warn(`⚠️ AUDIT: OT assignment for staff ${staff.id} on ${dateString} violates rest rules - skipping`);
            return; // Skip this assignment due to rest rule violation
          }
        }

        shiftWindow = resolveShiftWindow(dateString, "OT", otOpts);
        if (shiftWindow) {
          const hours = durationHours(shiftWindow.start, shiftWindow.end);
          shiftDetails = {
            shiftStart: shiftWindow.start,
            shiftEnd: shiftWindow.end,
            hours
          };

          // Cost calculation using actual window timing
          cost = shiftCost(
            staff.hourly_rate || 15.50,
            "OT",
            dateString,
            [], // TODO: Pass actual public holidays from config
            { start: shiftWindow.start, end: shiftWindow.end }
          );

          console.log(`💰 AUDIT: OT cost for ${hours}h shift: £${cost.toFixed(2)}`);
        }
      } else {
        // Standard shift handling with legacy calculator
        shiftDetails = calculateShiftDetails(
          finalShiftCode, 
          assignmentDate, 
          config.shift_type, 
          config.handshake_minutes
        );

        // Calculate cost using new costing system with accurate timing
        cost = calculateShiftCost(
          finalShiftCode as ShiftCode,
          dateString,
          staff.hourly_rate || 15.50,
          {
            start: shiftDetails.shiftStart || undefined,
            end: shiftDetails.shiftEnd || undefined,
            hoursOverride: shiftDetails.hours > 0 ? shiftDetails.hours : undefined,
            publicHolidays: [] // TODO: Pass actual public holidays from config
          }
        );

        // Update tracking for rest validation on next iteration
        if (shiftDetails.shiftEnd && finalShiftCode !== 'R') {
          lastWorkedEndByStaff[staff.id] = shiftDetails.shiftEnd;
          prevWorkedDateISOByStaff[staff.id] = dateString;
          prevWorkedCodeByStaff[staff.id] = finalShiftCode as ShiftCode;
        }
      }

      if (!shiftDetails) {
        console.warn(`⚠️ AUDIT: Failed to calculate shift details for ${finalShiftCode} on ${dateString}`);
        return;
      }

      // Ensure token is valid before insert
      assertShiftToken(finalShiftCode);
      
      const assignment: Assignment = {
        staff_id: staff.id,
        date: dateString,
        shift_code: finalShiftCode, // Use token directly
        shift_start: shiftDetails.shiftStart ? shiftDetails.shiftStart.toISOString() : null,
        shift_end: shiftDetails.shiftEnd ? shiftDetails.shiftEnd.toISOString() : null,
        hours: shiftDetails.hours,
        cost
      };

      assignments.push(assignment);

      // Log non-rest assignments for audit
      if (finalShiftCode !== 'R' && index < 10) {
        console.log(`🎯 AUDIT: Created non-rest assignment ${index + 1}:`, assignment);
      }

    } catch (error) {
      console.error(`❌ AUDIT: Error processing cycle entry ${index}:`, error, cycleEntry);
      logger.error(new Error(`Error processing cycle entry ${index}`), { error, cycleEntry });
    }
  });

  console.log('✅ AUDIT: Assignment generation completed');
  console.log('📊 AUDIT: Final assignment statistics:', {
    totalAssignments: assignments.length,
    nonRestAssignments: assignments.filter(a => a.shift_code !== 'R').length,
    assignmentShiftDistribution: assignments.reduce((acc, a) => {
      acc[a.shift_code] = (acc[a.shift_code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });

  if (assignments.length === 0) {
    console.error('❌ AUDIT: No assignments were generated!');
  }

  return assignments;
}
