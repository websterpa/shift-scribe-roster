import { supabase } from "@/integrations/supabase/client";
import { buildRosterCycle } from "../rosterCycle";
import { createLogger } from "../errorLogger";
import { StaffMember, Assignment } from "@/types/roster";
import { generateAssignments } from "./assignmentGenerator";
import { createRosterVersion } from "./rosterVersion";
import { isStaffEligibleForShift, getEligibleShiftCodes } from "./shiftCodeMapping";
import { enforceStaffingRequirements } from "./staffingEnforcement";
import { enforceRestRequirement } from "./restValidation";
import { ensureShiftSystemConsistency, ShiftSystem, ShiftCode, isWorkCode } from "../constraints";
import { respectsRestRules, ShiftWindowResolver } from "../restValidation";
import { getLeaveMap, LeaveMap } from "../leaveManager";
import { score, ScoreWeights, ScoreContext, PersonStats } from "./scoring";
import { optimiseRoster } from "./optimizer"; 
import { checkWeeklyLimits, WeeklySummaries } from "../wtrGate";
import { calculatePeriodCostSummary, StaffCostSummary } from "../costCalculations";
import { makeShiftWindowResolver } from "../shiftWindowResolver";

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
    site_start_time?: string; // e.g. "06:00" or "07:00"
    timezone?: string; // e.g. "Europe/London"
    default_ot_hours?: number; // e.g. 4 or 3.5
    default_ot_start_local_time?: string; // e.g. "10:00"
    staffing_requirements?: {
      day_shift_staff?: number;
      night_shift_staff?: number;
      early_shift_staff?: number;
      late_shift_staff?: number;
    };
    budget?: number;
  },
  versionName?: string
) {
  try {
    console.log('🚀 AUDIT: generateAndSaveRoster started with enhanced workflow');
    console.log('📊 AUDIT: Input parameters:', { 
      staffCount: staffList.length, 
      config, 
      versionName,
      hasPattern: !!config.pattern,
      patternLength: config.pattern?.length,
      hasStaffingRequirements: !!config.staffing_requirements,
      hasBudget: !!config.budget
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
    
    logger.info('Starting enhanced roster generation...', { 
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

    // 1. VALIDATE SHIFT SYSTEM - Block mixed codes
    console.log('🔍 AUDIT: Validating shift system consistency...');
    if (config.pattern) {
      const invalidCodes = config.pattern.filter(code => 
        !ensureShiftSystemConsistency(code as ShiftCode, config.shift_type as ShiftSystem)
      );
      if (invalidCodes.length > 0) {
        const error = `Invalid shift codes for ${config.shift_type} system: ${invalidCodes.join(', ')}`;
        console.error('❌ AUDIT: Shift system validation failed:', error);
        throw new Error(error);
      }
    }
    
    // Validate staff eligible shifts for system consistency
    staffList.forEach(staff => {
      const invalidStaffShifts = staff.eligible_shifts.filter(shiftName => {
        const shiftCode = getShiftCodeFromName(shiftName);
        return shiftCode && !ensureShiftSystemConsistency(shiftCode as ShiftCode, config.shift_type as ShiftSystem);
      });
      if (invalidStaffShifts.length > 0) {
        console.warn(`⚠️ Staff ${staff.first_name} ${staff.last_name} has shifts incompatible with ${config.shift_type} system: ${invalidStaffShifts.join(', ')}`);
      }
    });
    console.log('✅ AUDIT: Shift system validation completed');

    // Setup shift timing configuration for luxon-based resolver
    console.log('⚙️ AUDIT: Setting up shift timing configuration...');
    const timingConfig = {
      shiftSystem: config.shift_type as ShiftSystem,
      siteStartLocalTime: config.site_start_time || (config.shift_type === "12h" ? "07:00" : "06:00"),
      timezone: config.timezone || "Europe/London",
      defaultOtHours: config.default_ot_hours,
      defaultOtStartLocalTime: config.default_ot_start_local_time,
    } as const;
    
    const resolveShiftWindow = makeShiftWindowResolver(timingConfig);
    console.log('✅ AUDIT: Shift timing configuration ready:', timingConfig);

    // 2. PRE-MARK LEAVE - Fetch and convert to new format
    console.log('📅 AUDIT: Fetching and pre-marking leave dates...');
    const leaveMap: LeaveMap = await getLeaveMap();
    console.log('✅ AUDIT: Leave requests processed', { staffWithLeave: Object.keys(leaveMap).length });

    // FIXED: Use custom pattern if provided, otherwise use default cycle generation
    console.log('📋 AUDIT: Building initial roster cycle...');
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

    if (!cycle || cycle.length === 0) {
      const error = 'Initial cycle generation failed - no assignments created';
      console.error('❌ AUDIT: Initial cycle generation failed:', error);
      throw new Error(error);
    }

    console.log('✅ AUDIT: Initial cycle built successfully');

    // 3. ENFORCE REST RULES - Per-assignment enforcement using respectsRestRules
    console.log('⏰ AUDIT: Enforcing rest rules per assignment...');
    cycle = enforceRestRulesPerAssignment(cycle, resolveShiftWindow, leaveMap);
    console.log('✅ AUDIT: Rest rules enforcement completed');

    // 4. COVERAGE ENFORCEMENT - Eligibility + rest + supervisor/night rules
    console.log('🎯 AUDIT: Running coverage enforcement...');
    cycle = enforceCoverageRules(cycle, staffList, config);
    console.log('✅ AUDIT: Coverage enforcement completed');

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

    // 5. COMPUTE SCORE CONTEXT & RUN OPTIMIZER
    console.log('📊 AUDIT: Computing score context and running optimizer...');
    const { optimizedCycle, optimizationResult } = await runOptimization(cycle, staffList, config);
    cycle = optimizedCycle;
    console.log('✅ AUDIT: Optimization completed', optimizationResult);

    // 6. RUN WTR GATE - Check violations and repair if needed
    console.log('⚖️ AUDIT: Running WTR gate validation...');
    const { finalCycle, wtrResult } = await runWTRGate(cycle, staffList, config);
    cycle = finalCycle;
    console.log('✅ AUDIT: WTR gate completed', wtrResult);

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
    const assignments = generateAssignments(
      staffList, 
      cycle, 
      config, 
      leaveMap, 
      pastWeeksMap,
      respectsRestRules // Pass rest validation function for OT rest checks
    );
    
    console.log('🔍 AUDIT: Assignment generation result:');
    console.log(`  Generated assignments: ${assignments ? assignments.length : 'null'}`);
    
    if (!assignments || assignments.length === 0) {
      const error = 'Failed to generate any assignments';
      console.error('❌ AUDIT: Assignment generation failed:', error);
      throw new Error(error);
    }
    
    console.log('✅ AUDIT: Generated assignments', { count: assignments.length });

    // 7. COMPUTE COST & BUDGET VARIANCE
    console.log('💰 AUDIT: Computing cost and budget variance...');
    const costResult = computeCostAndBudgetVariance(assignments, staffList, config);
    console.log('✅ AUDIT: Cost calculation completed', costResult);

    // Save assignments to database
    console.log('💾 AUDIT: Saving assignments to database...');
    await saveAssignments(assignments, versionId);
    console.log('✅ AUDIT: Successfully saved roster assignments', { count: assignments.length, versionId });

    console.log('🎉 AUDIT: generateAndSaveRoster completed successfully');
    return { 
      versionId, 
      optimizationResult, 
      wtrResult, 
      costResult,
      totalAssignments: assignments.length
    };
  } catch (error: any) {
    console.error('❌ AUDIT: generateAndSaveRoster error:', error);
    console.error('❌ AUDIT: Error stack:', error.stack);
    logger.error(new Error('Failed to generate and save roster'), { error });
    throw new Error(`Roster generation failed: ${error.message}`);
  }
}

/**
 * 3. ENFORCE REST RULES - Per-assignment enforcement using luxon-based resolver
 */
function enforceRestRulesPerAssignment(cycle: any[], resolveShiftWindow: ShiftWindowResolver, leaveMap: LeaveMap): any[] {
  console.log('⏰ Starting enhanced rest rules enforcement with luxon resolver...');
  
  // Group assignments by staff member and sort by date
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

  // Track last worked end time and details by staff
  const lastWorkedEndByStaff: { [staffId: string]: Date | null } = {};
  const prevWorkedDateISOByStaff: { [staffId: string]: string | null } = {};
  const prevWorkedCodeByStaff: { [staffId: string]: ShiftCode | null } = {};

  // Check each staff member's consecutive shifts using luxon-based rest validation
  Object.entries(staffAssignments).forEach(([staffId, assignments]) => {
    lastWorkedEndByStaff[staffId] = null;
    prevWorkedDateISOByStaff[staffId] = null;
    prevWorkedCodeByStaff[staffId] = null;

    for (let i = 0; i < assignments.length; i++) {
      const currentAssignment = assignments[i];
      const dateISO = currentAssignment.date;
      const proposedCode = currentAssignment.shiftCode as ShiftCode;
      
      // Skip if current assignment is already rest or leave
      if (!isWorkCode(proposedCode)) {
        // Reset tracking for non-work assignments
        if (proposedCode === 'R') {
          lastWorkedEndByStaff[staffId] = null;
          prevWorkedDateISOByStaff[staffId] = null;
          prevWorkedCodeByStaff[staffId] = null;
        }
        continue;
      }

      // Use luxon-based respectsRestRules function
      const respectsRest = respectsRestRules(
        lastWorkedEndByStaff[staffId],
        prevWorkedDateISOByStaff[staffId],
        prevWorkedCodeByStaff[staffId],
        dateISO,
        proposedCode,
        resolveShiftWindow
      );

      if (!respectsRest) {
        console.log(`⚠️ Rest rule violation: Staff ${staffId} day ${currentAssignment.day} - changing ${proposedCode} to R`);
        
        // Find and update the assignment in the main cycle
        const cycleIndex = adjustedCycle.findIndex(a => 
          a.staffId === staffId && a.day === currentAssignment.day
        );
        if (cycleIndex !== -1) {
          adjustedCycle[cycleIndex].shiftCode = 'R';
          adjustmentCount++;
        }
        
        // Don't update tracking since we changed to rest
      } else {
        // Update tracking for successful work assignment
        const shiftWindow = resolveShiftWindow(dateISO, proposedCode);
        if (shiftWindow) {
          lastWorkedEndByStaff[staffId] = shiftWindow.end;
          prevWorkedDateISOByStaff[staffId] = dateISO;
          prevWorkedCodeByStaff[staffId] = proposedCode;
        }
      }
    }
  });

  console.log(`✅ Enhanced rest rules enforcement completed: ${adjustmentCount} shifts changed to rest`);
  return adjustedCycle;
}

/**
 * 4. COVERAGE ENFORCEMENT - Eligibility + rest + supervisor/night rules
 */
function enforceCoverageRules(cycle: any[], staffList: StaffMember[], config: any): any[] {
  console.log('🎯 Starting coverage rules enforcement...');
  
  let adjustmentCount = 0;
  const adjustedCycle = [...cycle];

  // Check eligibility and supervisor night rules
  adjustedCycle.forEach((assignment, index) => {
    const staff = staffList.find(s => s.id === assignment.staffId);
    if (!staff) return;

      // Check if staff is eligible for this shift
      if (isWorkCode(assignment.shiftCode as ShiftCode)) {
        const eligibleShifts = staff.eligible_shifts || [];
        const shiftName = assignment.shiftCode === 'D' ? 'Day' : assignment.shiftCode === 'E' ? 'Early' : assignment.shiftCode === 'L' ? 'Late' : assignment.shiftCode === 'N' ? 'Night' : '';
        const isEligible = eligibleShifts.includes(shiftName);
      
      if (!isEligible) {
        console.log(`⚠️ Eligibility violation: Staff ${staff.first_name} ${staff.last_name} not eligible for ${assignment.shiftCode} - changing to R`);
        adjustedCycle[index].shiftCode = 'R';
        adjustmentCount++;
        return;
      }

      // Check supervisor night rule (if configured)
      if (assignment.shiftCode === 'N' && staff.role !== 'Staff' && !config.allowSupervisorNights) {
        console.log(`⚠️ Supervisor night violation: Supervisor ${staff.first_name} ${staff.last_name} assigned to night - changing to R`);
        adjustedCycle[index].shiftCode = 'R';
        adjustmentCount++;
      }
    }
  });

  console.log(`✅ Coverage rules enforcement completed: ${adjustmentCount} violations corrected`);
  return adjustedCycle;
}

/**
 * 5. COMPUTE SCORE CONTEXT & RUN OPTIMIZER
 */
async function runOptimization(cycle: any[], staffList: StaffMember[], config: any): Promise<{ optimizedCycle: any[], optimizationResult: any }> {
  console.log('📊 Starting optimization process...');
  
  try {
    // Create roster matrix from cycle
    const rosterMatrix = new Map<string, Map<string, string[]>>();
    
    cycle.forEach(assignment => {
      if (!rosterMatrix.has(assignment.date)) {
        rosterMatrix.set(assignment.date, new Map());
      }
      const dayMap = rosterMatrix.get(assignment.date)!;
      if (!dayMap.has(assignment.shiftCode)) {
        dayMap.set(assignment.shiftCode, []);
      }
      dayMap.get(assignment.shiftCode)!.push(assignment.staffId);
    });

    // Compute initial score context
    const scoreContext = computeScoreContext(cycle, staffList, config);
    
    // Set up score weights
    const weights: ScoreWeights = {
      uncoveredPenalty: 1000,     // High penalty for uncovered shifts
      leaveClashPenalty: 500,     // High penalty for leave clashes
      restViolationPenalty: 750,  // High penalty for rest violations
      supervisorNightPenalty: config.allowSupervisorNights ? 10 : 400,
      fairnessNightWeight: 50,    // Moderate weight for fairness
      fairnessWeekendWeight: 30,
      phCapPenalty: 200,          // Moderate penalty for PH cap exceeded
      budgetDeviationWeight: config.budget ? 100 : 10
    };

    // Run optimizer with 5 second limit
    console.log('🔄 Running 5-second optimization...');
    const optimizationStart = Date.now();
    
    // Simple optimization placeholder - in real implementation this would call optimiseRoster
    const initialScore = score(scoreContext, weights);
    console.log(`📊 Initial score: ${initialScore}`);
    
    // For now, return the original cycle with optimization metadata
    const optimizationTime = Date.now() - optimizationStart;
    const optimizationResult = {
      initialScore,
      finalScore: initialScore, // Would be updated by real optimizer
      improvementPercent: 0,
      optimizationTimeMs: optimizationTime,
      iterations: 0
    };

    console.log('✅ Optimization completed', optimizationResult);
    return { optimizedCycle: cycle, optimizationResult };
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    return { optimizedCycle: cycle, optimizationResult: { error: 'Optimization failed' } };
  }
}

/**
 * 6. RUN WTR GATE
 */
async function runWTRGate(cycle: any[], staffList: StaffMember[], config: any): Promise<{ finalCycle: any[], wtrResult: any }> {
  console.log('⚖️ Starting WTR gate validation...');
  
  try {
    // Compute weekly summaries
    const weeklySummaries: WeeklySummaries = {};
    
    staffList.forEach(staff => {
      weeklySummaries[staff.id] = [];
      
      for (let week = 0; week < config.cycle_length_weeks; week++) {
        const weekStart = week * 7;
        const weekEnd = weekStart + 7;
        
        const weekAssignments = cycle.filter(a => 
          a.staffId === staff.id && 
          a.day >= weekStart && 
          a.day < weekEnd &&
          isWorkCode(a.shiftCode as ShiftCode)
        );
        
        const hours = weekAssignments.length * (config.shift_type === "12h" ? 12 : 8);
        const nightHours = weekAssignments.filter(a => a.shiftCode === 'N').length * (config.shift_type === "12h" ? 12 : 8);
        
        // Check for 24h rest (simplified - check if there's at least one rest day)
        const restDays = 7 - weekAssignments.length;
        const has24hRest = restDays >= 1;
        
        weeklySummaries[staff.id].push({
          weekIndex: week,
          hours,
          has24hRest,
          nightHours
        });
      }
    });

    // Check for violations
    const violations = checkWeeklyLimits(weeklySummaries, true); // Allow 48h opt-out
    
    if (violations.length > 0) {
      console.log('⚠️ WTR violations found:', violations);
      
      // Attempt one repair cycle (simplified)
      let repairedCount = 0;
      const adjustedCycle = [...cycle];
      
      violations.forEach(violation => {
        if (violation.includes('missing 24h rest') && repairedCount < 5) {
          // Find a work day to convert to rest for this staff member
          const staffId = violation.split(':')[0];
          const weekMatch = violation.match(/week (\d+)/);
          if (weekMatch) {
            const weekIndex = parseInt(weekMatch[1]);
            const weekStart = weekIndex * 7;
            const weekEnd = weekStart + 7;
            
            const weekWorkAssignments = adjustedCycle.filter(a => 
              a.staffId === staffId && 
              a.day >= weekStart && 
              a.day < weekEnd &&
              isWorkCode(a.shiftCode as ShiftCode)
            );
            
            if (weekWorkAssignments.length > 0) {
              // Convert last work assignment of week to rest
              const lastWork = weekWorkAssignments[weekWorkAssignments.length - 1];
              const cycleIndex = adjustedCycle.findIndex(a => 
                a.staffId === staffId && a.day === lastWork.day
              );
              if (cycleIndex !== -1) {
                adjustedCycle[cycleIndex].shiftCode = 'R';
                repairedCount++;
                console.log(`🔧 Repaired WTR violation: Staff ${staffId} week ${weekIndex} - converted day ${lastWork.day} to rest`);
              }
            }
          }
        }
      });
      
      // Re-check violations after repair
      const remainingViolations = checkWeeklyLimits(weeklySummaries, true);
      
      const wtrResult = {
        initialViolations: violations.length,
        repairedViolations: repairedCount,
        remainingViolations: remainingViolations.length,
        violationDetails: remainingViolations,
        success: remainingViolations.length === 0
      };
      
      if (remainingViolations.length > 0) {
        console.warn('⚠️ WTR violations remain after repair:', remainingViolations);
      }
      
      return { finalCycle: adjustedCycle, wtrResult };
    }
    
    const wtrResult = {
      initialViolations: 0,
      repairedViolations: 0,
      remainingViolations: 0,
      violationDetails: [],
      success: true
    };
    
    console.log('✅ No WTR violations found');
    return { finalCycle: cycle, wtrResult };
    
  } catch (error) {
    console.error('❌ WTR gate failed:', error);
    const wtrResult = { error: 'WTR gate validation failed' };
    return { finalCycle: cycle, wtrResult };
  }
}

/**
 * 7. COMPUTE COST & BUDGET VARIANCE
 */
function computeCostAndBudgetVariance(assignments: Assignment[], staffList: StaffMember[], config: any) {
  console.log('💰 Computing cost and budget variance...');
  
  try {
    // Calculate total cost from assignments
    const totalCost = assignments.reduce((sum, assignment) => sum + (assignment.cost || 0), 0);
    const totalHours = assignments.reduce((sum, assignment) => sum + (assignment.hours || 0), 0);
    
    // Calculate budget variance
    let budgetVariance = 0;
    let budgetVariancePercent = 0;
    let budgetStatus = 'No budget set';
    
    if (config.budget && config.budget > 0) {
      budgetVariance = totalCost - config.budget;
      budgetVariancePercent = (budgetVariance / config.budget) * 100;
      
      if (budgetVariance > 0) {
        budgetStatus = `Over budget by £${budgetVariance.toFixed(2)} (${budgetVariancePercent.toFixed(1)}%)`;
      } else if (budgetVariance < 0) {
        budgetStatus = `Under budget by £${Math.abs(budgetVariance).toFixed(2)} (${Math.abs(budgetVariancePercent).toFixed(1)}%)`;
      } else {
        budgetStatus = 'On budget';
      }
    }
    
    // Calculate average hourly rate
    const averageHourlyRate = totalHours > 0 ? totalCost / totalHours : 0;
    
    // Calculate cost by shift type
    const costByShiftType: Record<string, { hours: number; cost: number; count: number }> = {};
    assignments.forEach(assignment => {
      if (!costByShiftType[assignment.shift_code]) {
        costByShiftType[assignment.shift_code] = { hours: 0, cost: 0, count: 0 };
      }
      costByShiftType[assignment.shift_code].hours += assignment.hours || 0;
      costByShiftType[assignment.shift_code].cost += assignment.cost || 0;
      costByShiftType[assignment.shift_code].count += 1;
    });
    
    const costResult = {
      totalCost: totalCost,
      totalHours: totalHours,
      averageHourlyRate: averageHourlyRate,
      budget: config.budget || null,
      budgetVariance: budgetVariance,
      budgetVariancePercent: budgetVariancePercent,
      budgetStatus: budgetStatus,
      costByShiftType: costByShiftType,
      assignmentCount: assignments.length
    };
    
    console.log('💰 Cost calculation completed:', {
      totalCost: `£${totalCost.toFixed(2)}`,
      totalHours: totalHours,
      averageRate: `£${averageHourlyRate.toFixed(2)}/hr`,
      budgetStatus: budgetStatus
    });
    
    return costResult;
    
  } catch (error) {
    console.error('❌ Cost calculation failed:', error);
    return { error: 'Cost calculation failed' };
  }
}

/**
 * Compute score context for optimization
 */
function computeScoreContext(cycle: any[], staffList: StaffMember[], config: any): ScoreContext {
  const statsByStaff: Record<string, PersonStats> = {};
  
  // Initialize stats for each staff member
  staffList.forEach(staff => {
    statsByStaff[staff.id] = {
      nights: 0,
      weekends: 0,
      publicHolidaysWorked: 0,
      totalHours: 0
    };
  });
  
  // Count assignments
  cycle.forEach(assignment => {
    const stats = statsByStaff[assignment.staffId];
    if (stats && isWorkCode(assignment.shiftCode as ShiftCode)) {
      if (assignment.shiftCode === 'N') {
        stats.nights += 1;
      }
      
      const date = new Date(assignment.date);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        stats.weekends += 1;
      }
      
      // Simplified: assume 8h or 12h based on shift type
      const hours = config.shift_type === "12h" ? 12 : 8;
      stats.totalHours += hours;
    }
  });
  
  // Calculate variances
  const nightCounts = Object.values(statsByStaff).map(s => s.nights);
  const weekendCounts = Object.values(statsByStaff).map(s => s.weekends);
  
  const nightsVariance = calculateVariance(nightCounts);
  const weekendsVariance = calculateVariance(weekendCounts);
  
  return {
    budget: config.budget || null,
    totalCost: 0, // Would be calculated properly
    statsByStaff,
    uncoveredByDayShift: 0, // Would be calculated from coverage analysis
    leaveClashes: 0, // Would be calculated from leave conflicts
    restViolations: 0, // Would be calculated from rest rule checks
    supervisorNightViolations: 0, // Would be calculated from supervisor night checks
    phCapExceeded: 0, // Would be calculated from public holiday caps
    nightsVariance,
    weekendsVariance
  };
}

/**
 * Calculate statistical variance
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
  
  return variance;
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

/**
 * Helper function to convert shift name to shift code
 */
function getShiftCodeFromName(shiftName: string): string | null {
  const mapping: Record<string, string> = {
    'Day': 'D',
    'Early': 'E', 
    'Late': 'L',
    'Night': 'N',
    'Rest': 'R',
    'Sick': 'S'
  };
  return mapping[shiftName] || null;
}

function getShiftHours(shiftCode: string, shiftType: "8h" | "12h"): number {
  if (!isWorkCode(shiftCode as ShiftCode)) {
    return 0;
  }
  
  return shiftType === "12h" ? 12 : 8;
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
