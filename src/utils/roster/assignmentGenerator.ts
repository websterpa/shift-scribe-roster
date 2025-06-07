
import { isPublicHoliday } from "../dateHelpers";
import { hasDailyRest, withinWeeklyHours, calculateRollingAverage, WeeklyHours } from "../wtrCompliance";
import { StaffMember, Assignment } from "@/types/roster";
import { createLogger } from "../errorLogger";
import { generateEnhancedRosterCycle, validateEnhancedCycle } from './enhancedCycleIntegration';

const logger = createLogger('AssignmentGenerator');

/**
 * Generates roster assignments based on cycle, staff, config, and constraints
 */
export function generateAssignments(
  staffList: StaffMember[],
  cycle: any,
  config: {
    id: string;
    cycle_length_weeks: number;
    shift_type: "8h" | "12h";
    operational_hours_per_day: number;
    handshake_minutes: number;
    start_date: string;
  },
  leaveMap: Record<string, { date: string; type: string }[]>,
  pastWeeksMap: Record<string, number[]>
): Assignment[] {
  logger.info('Generating assignments with rule-compliant enhanced cycle', { 
    staffCount: staffList.length,
    cycleWeeks: config.cycle_length_weeks,
    shiftType: config.shift_type,
    handshakeMinutes: config.handshake_minutes
  });

  // Generate and validate enhanced cycle
  let primaryCycle;
  let usingEnhancedCycle = false;
  
  try {
    console.log('🎯 Generating rule-compliant enhanced cycle...');
    const enhancedCycle = generateEnhancedRosterCycle(
      staffList,
      config.cycle_length_weeks,
      config.shift_type,
      config.operational_hours_per_day,
      config.handshake_minutes
    );
    
    // Validate the enhanced cycle
    const validation = validateEnhancedCycle(enhancedCycle, staffList, config.shift_type);
    
    if (validation.isValid || validation.overallScore >= 80) {
      primaryCycle = enhancedCycle;
      usingEnhancedCycle = true;
      console.log(`✅ Using rule-compliant enhanced cycle (validation score: ${validation.overallScore.toFixed(1)}%)`);
    } else {
      console.warn(`⚠️ Enhanced cycle validation failed (score: ${validation.overallScore.toFixed(1)}%), using fallback`);
      console.log('Violations:', validation.violations);
      primaryCycle = cycle;
    }
  } catch (error) {
    console.log('⚠️ Enhanced cycle generation failed, using fallback cycle');
    logger.error('Enhanced cycle generation error', error);
    primaryCycle = cycle;
  }

  const assignments: Assignment[] = [];
  const lastShiftEnd: Record<string, Date> = {};
  const weeklyHoursTracker: Record<string, Record<number, number>> = {};
  const shiftDetails = calculateShiftDetails(config);
  
  logger.info('Calculated shift details:', shiftDetails);
  
  // Initialize weekly hours tracker
  staffList.forEach(staff => {
    if (staff?.id) {
      weeklyHoursTracker[staff.id] = {};
      for (let w = 0; w < config.cycle_length_weeks; w++) {
        weeklyHoursTracker[staff.id][w] = 0;
      }
    }
  });
  
  // Generate assignments following the primary cycle
  for (let w = 0; w < config.cycle_length_weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dateObj = new Date(config.start_date);
      dateObj.setDate(dateObj.getDate() + w * 7 + d);
      const dateKey = dateObj.toDateString();

      for (const staff of staffList) {
        if (!staff?.id) continue;
        
        // Get shift from primary cycle (enhanced or fallback)
        let code = primaryCycle[w]?.[d]?.[staff.id] || 'R';
        
        console.log(`📋 Processing ${staff.first_name} ${staff.last_name} for ${dateKey}: ${usingEnhancedCycle ? 'enhanced' : 'fallback'} cycle assignment = ${code}`);

        // Override if on leave/sick
        const leaveEntries = leaveMap[staff.id] || [];
        const leave = leaveEntries.find((e) => e.date === dateKey);
        if (leave) {
          console.log(`🏥 ${staff.first_name} ${staff.last_name} on leave: ${leave.type}`);
          code = leave.type; // 'S' for sick, 'R' for annual leave
        }

        // Calculate shift info
        let shiftInfo = calculateShiftInfo(code, config, shiftDetails, dateObj);
        
        // Apply minimal compliance checks (only for critical safety issues)
        if (['D', 'E', 'L', 'N'].includes(code) && shiftInfo.shiftStart) {
          const prevEnd = lastShiftEnd[staff.id];
          const shiftStart = new Date(shiftInfo.shiftStart);
          
          // Only override for critical daily rest violations
          if (prevEnd && !hasDailyRest(prevEnd, shiftStart)) {
            const restHours = (shiftStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60);
            if (restHours < 8) { // Critical safety threshold
              console.log(`🚨 CRITICAL: ${staff.first_name} ${staff.last_name} insufficient rest (${restHours.toFixed(1)}h) - forcing rest day`);
              code = 'R';
              shiftInfo = { hours: 0, shiftStart: null, shiftEnd: null };
            } else {
              console.log(`⚠️ Short rest period (${restHours.toFixed(1)}h) but allowing shift`);
            }
          }
          
          if (shiftInfo.shiftEnd) {
            lastShiftEnd[staff.id] = new Date(shiftInfo.shiftEnd);
          }
        }
        
        // Only check WTD for extreme violations if using enhanced cycle
        if (usingEnhancedCycle && ['D', 'E', 'L', 'N'].includes(code)) {
          const weeklyHours = calculateWeeklyHours(assignments, staff.id, w, dateObj, shiftInfo.hours);
          
          // Only override for extreme WTD violations (60+ hours)
          if (weeklyHours > 60) {
            console.log(`🚨 EXTREME: ${staff.first_name} ${staff.last_name} would work ${weeklyHours}h - forcing rest day`);
            code = 'R';
            shiftInfo = { hours: 0, shiftStart: null, shiftEnd: null };
          } else {
            weeklyHoursTracker[staff.id][w] += shiftInfo.hours;
          }
        } else if (['D', 'E', 'L', 'N'].includes(code)) {
          // Full WTD compliance for fallback cycle
          const weeklyHours = calculateWeeklyHours(assignments, staff.id, w, dateObj, shiftInfo.hours);
          const wtdCompliant = checkWTDCompliance(staff, weeklyHours, pastWeeksMap[staff.id]);
          
          if (!wtdCompliant) {
            console.log(`⚠️ WTD compliance issue for ${staff.first_name} ${staff.last_name} - changing to rest day`);
            code = 'R';
            shiftInfo = { hours: 0, shiftStart: null, shiftEnd: null };
          } else {
            weeklyHoursTracker[staff.id][w] += shiftInfo.hours;
          }
        }

        // Calculate cost
        const cost = calculateCost(staff, shiftInfo.hours, dateObj, code);

        assignments.push({
          version_id: '', // Will be filled by generateAndSaveRoster
          date: dateObj.toISOString().split("T")[0],
          staff_id: staff.id,
          shift_code: code,
          shift_start: shiftInfo.shiftStart,
          shift_end: shiftInfo.shiftEnd,
          hours: shiftInfo.hours,
          cost
        });
      }
    }
  }

  // Minimal minimum hours enforcement (only if not using enhanced cycle)
  if (!usingEnhancedCycle) {
    console.log('🔄 Applying minimum hours enforcement for fallback cycle...');
    staffList.forEach(staff => {
      if (!staff?.id || !staff.min_hours_per_week) return;
      
      const minWeeklyHours = staff.min_hours_per_week;
      
      for (let w = 0; w < config.cycle_length_weeks; w++) {
        const actualHours = weeklyHoursTracker[staff.id][w];
        const shortfall = minWeeklyHours - actualHours;
        
        if (shortfall > 0) {
          console.log(`⚠️ ${staff.first_name} ${staff.last_name} week ${w + 1}: ${actualHours}h vs ${minWeeklyHours}h required (shortfall: ${shortfall}h)`);
          addShiftsToMeetMinimum(assignments, staff, w, shortfall, config, shiftDetails, lastShiftEnd);
        }
      }
    });
  } else {
    console.log('✅ Enhanced cycle should already optimize for contracted hours');
  }

  logger.info(`Assignment generation completed using ${usingEnhancedCycle ? 'enhanced' : 'fallback'} cycle`, { 
    totalAssignments: assignments.length 
  });
  
  // Log summary
  const shiftSummary = assignments.reduce((acc, assignment) => {
    acc[assignment.shift_code] = (acc[assignment.shift_code] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('📊 Assignment summary by shift type:', shiftSummary);
  console.log(`🎯 Cycle type used: ${usingEnhancedCycle ? 'ENHANCED (rule-compliant)' : 'FALLBACK (basic)'}`);
  
  return assignments;
}

/**
 * Add additional shifts to meet minimum contracted hours
 */
function addShiftsToMeetMinimum(
  assignments: Assignment[],
  staff: StaffMember,
  weekNumber: number,
  shortfallHours: number,
  config: any,
  shiftDetails: any,
  lastShiftEnd: Record<string, Date>
): void {
  console.log(`🔧 Attempting to add shifts for ${staff.first_name} ${staff.last_name} to cover ${shortfallHours}h shortfall`);
  
  const weekStart = getWeekStart(config.start_date, weekNumber);
  const weekEnd = getWeekEnd(config.start_date, weekNumber);
  
  // Find rest days in this week that could be converted to working days
  const weekAssignments = assignments.filter(a => 
    a.staff_id === staff.id && 
    new Date(a.date) >= weekStart && 
    new Date(a.date) <= weekEnd &&
    a.shift_code === 'R'
  );
  
  console.log(`📅 Found ${weekAssignments.length} rest days that could potentially be converted to shifts`);
  
  // Sort by date to maintain chronological order
  weekAssignments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let remainingShortfall = shortfallHours;
  
  for (const assignment of weekAssignments) {
    if (remainingShortfall <= 0) break;
    
    // Determine best shift type based on eligible shifts and operational needs
    const eligibleShifts = staff.eligible_shifts || [];
    let bestShiftCode = 'D'; // Default to day shift
    
    if (config.shift_type === '12h') {
      if (eligibleShifts.includes('Day') || eligibleShifts.includes('D')) {
        bestShiftCode = 'D';
      } else if (eligibleShifts.includes('Night') || eligibleShifts.includes('N')) {
        bestShiftCode = 'N';
      }
    } else {
      // 8h shifts - prefer early shift for minimum hours compliance
      if (eligibleShifts.includes('Early') || eligibleShifts.includes('E')) {
        bestShiftCode = 'E';
      } else if (eligibleShifts.includes('Late') || eligibleShifts.includes('L')) {
        bestShiftCode = 'L';
      } else if (eligibleShifts.includes('Night') || eligibleShifts.includes('N')) {
        bestShiftCode = 'N';
      }
    }
    
    const shiftInfo = calculateShiftInfo(bestShiftCode, config, shiftDetails, new Date(assignment.date));
    
    // Check daily rest compliance
    if (shiftInfo.shiftStart) {
      const prevEnd = lastShiftEnd[staff.id];
      const shiftStart = new Date(shiftInfo.shiftStart);
      
      if (prevEnd && !hasDailyRest(prevEnd, shiftStart)) {
        console.log(`⏰ Cannot add shift on ${assignment.date} - insufficient rest period`);
        continue;
      }
    }
    
    // Update assignment
    assignment.shift_code = bestShiftCode;
    assignment.shift_start = shiftInfo.shiftStart;
    assignment.shift_end = shiftInfo.shiftEnd;
    assignment.hours = shiftInfo.hours;
    assignment.cost = calculateCost(staff, shiftInfo.hours, new Date(assignment.date), bestShiftCode);
    
    // Update tracking
    if (shiftInfo.shiftEnd) {
      lastShiftEnd[staff.id] = new Date(shiftInfo.shiftEnd);
    }
    
    remainingShortfall -= shiftInfo.hours;
    
    console.log(`✅ Added ${bestShiftCode} shift on ${assignment.date} (${shiftInfo.hours}h) - remaining shortfall: ${remainingShortfall}h`);
  }
  
  if (remainingShortfall > 0) {
    console.log(`⚠️ Could not fully meet minimum hours for ${staff.first_name} ${staff.last_name} - remaining shortfall: ${remainingShortfall}h`);
  }
}

/**
 * Get the start of a specific week in the cycle
 */
function getWeekStart(startDate: string, weekNumber: number): Date {
  const date = new Date(startDate);
  date.setDate(date.getDate() + weekNumber * 7);
  return date;
}

/**
 * Get the end of a specific week in the cycle
 */
function getWeekEnd(startDate: string, weekNumber: number): Date {
  const date = getWeekStart(startDate, weekNumber);
  date.setDate(date.getDate() + 6);
  return date;
}

/**
 * Calculate shift details based on configuration
 */
function calculateShiftDetails(config: {
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  handshake_minutes: number;
}) {
  const baseShiftHours = config.shift_type === "12h" ? 12 : 8;
  const handshakeHours = config.handshake_minutes / 60;
  const actualShiftHours = baseShiftHours + handshakeHours;
  
  if (config.shift_type === "12h") {
    return {
      D: { start: "06:00", duration: actualShiftHours, label: "Day" },
      N: { start: "18:00", duration: actualShiftHours, label: "Night" }
    };
  } else {
    return {
      E: { start: "06:00", duration: actualShiftHours, label: "Early" },
      L: { start: "14:00", duration: actualShiftHours, label: "Late" },
      N: { start: "22:00", duration: actualShiftHours, label: "Night" },
      D: { start: "06:00", duration: actualShiftHours, label: "Day" } // For supervisors
    };
  }
}

/**
 * Calculate shift information for a given shift code
 */
function calculateShiftInfo(
  code: string, 
  config: any, 
  shiftDetails: any, 
  date: Date
): { hours: number; shiftStart: string | null; shiftEnd: string | null } {
  if (!['D', 'E', 'L', 'N'].includes(code)) {
    return { hours: 0, shiftStart: null, shiftEnd: null };
  }

  const shift = shiftDetails[code];
  if (!shift) {
    return { hours: 0, shiftStart: null, shiftEnd: null };
  }

  const [startHour, startMinute] = shift.start.split(':').map(Number);
  const shiftStart = new Date(date);
  shiftStart.setHours(startHour, startMinute, 0, 0);
  
  const shiftEnd = new Date(shiftStart);
  shiftEnd.setHours(shiftEnd.getHours() + Math.floor(shift.duration));
  shiftEnd.setMinutes(shiftEnd.getMinutes() + Math.round((shift.duration % 1) * 60));

  return {
    hours: Math.round(shift.duration),
    shiftStart: shiftStart.toISOString(),
    shiftEnd: shiftEnd.toISOString()
  };
}

/**
 * Calculate weekly hours for a staff member
 */
function calculateWeeklyHours(
  assignments: Assignment[], 
  staffId: string, 
  currentWeek: number, 
  currentDate: Date, 
  additionalHours: number
): number {
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weeklyHours = assignments
    .filter(a => 
      a.staff_id === staffId && 
      new Date(a.date) >= weekStart && 
      new Date(a.date) <= weekEnd
    )
    .reduce((total, a) => total + (a.hours || 0), 0);

  return weeklyHours + additionalHours;
}

/**
 * Check WTD compliance for a staff member
 */
function checkWTDCompliance(
  staff: StaffMember, 
  weeklyHours: number, 
  pastHours: number[] = []
): boolean {
  const maxWeeklyHours = staff.max_hours_per_week || 48;
  
  if (!withinWeeklyHours(weeklyHours, maxWeeklyHours, staff.opted_out_wtd)) {
    return false;
  }

  if (!staff.opted_out_wtd && pastHours.length > 0) {
    // Convert past hours array to WeeklyHours format and calculate rolling average
    const weeklyHoursData: WeeklyHours[] = pastHours.map((hours, index) => ({
      weekStart: new Date(Date.now() - (pastHours.length - index) * 7 * 24 * 60 * 60 * 1000),
      hours,
      overtime: Math.max(0, hours - 48)
    }));
    
    const rollingAverage = calculateRollingAverage(weeklyHoursData);
    return rollingAverage <= 48;
  }

  return true;
}

/**
 * Calculate cost for a shift including public holiday multipliers
 */
function calculateCost(
  staff: StaffMember, 
  hours: number, 
  date: Date, 
  shiftCode: string
): number {
  if (!['D', 'E', 'L', 'N'].includes(shiftCode) || hours === 0) {
    return 0;
  }

  const baseRate = staff.hourly_rate || 0;
  const holidayMultiplier = staff.holiday_multiplier || 1;
  
  if (isPublicHoliday(date)) {
    return baseRate * hours * holidayMultiplier;
  }
  
  return baseRate * hours;
}

// Export the function under both names for compatibility
export const generateRosterAssignments = generateAssignments;
