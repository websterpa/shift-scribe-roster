
import { StaffMember, Assignment } from "@/types/roster";
import { calculateShiftDetails, calculateShiftCost } from "./shiftCalculator";
import { createLogger } from "../errorLogger";

const logger = createLogger('AssignmentGenerator');

export function generateAssignments(
  staffList: StaffMember[],
  cycle: Array<{ day: number; staffId: string; shiftCode: string; date: string }>,
  config: {
    shift_type: "8h" | "12h";
    operational_hours_per_day: number;
    handshake_minutes: number;
    start_date: string;
  },
  leaveMap: Record<string, { date: string; type: string }[]>,
  pastWeeksMap: Record<string, number[]>
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

      // Check for leave conflicts
      const staffLeave = leaveMap[staff.id];
      const hasLeave = staffLeave?.some(leave => 
        new Date(leave.date).toDateString() === assignmentDate.toDateString()
      );

      let finalShiftCode = cycleEntry.shiftCode;
      
      if (hasLeave) {
        console.log(`📅 AUDIT: Staff ${staff.id} has leave on ${dateString}, converting ${cycleEntry.shiftCode} to R`);
        finalShiftCode = 'R';
      }

      // Calculate shift details using the correct function
      const shiftDetails = calculateShiftDetails(
        finalShiftCode, 
        assignmentDate, 
        config.shift_type, 
        config.handshake_minutes
      );

      // Calculate cost with holiday multiplier (defaulting to 1.5 for public holidays)
      const cost = calculateShiftCost(
        shiftDetails.hours, 
        staff.hourly_rate || 15.50, 
        assignmentDate, 
        1.5
      );

      const assignment: Assignment = {
        staff_id: staff.id,
        date: dateString,
        shift_code: finalShiftCode,
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
