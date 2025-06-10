
import { StaffMember, ConfigItem } from "@/types/roster";
import { createLogger } from "../errorLogger";

const logger = createLogger('StaffingCalculator');

export interface StaffingCalculation {
  shiftType: string;
  requiredStaff: number;
  recommendedStaff: number;
  reasoning: string[];
  bufferStaff: number;
  totalWithBuffer: number;
}

export interface StaffingRecommendation {
  totalRequiredStaff: number;
  totalRecommendedStaff: number;
  calculations: StaffingCalculation[];
  assumptions: string[];
  warnings: string[];
  costImplications: {
    minimumWeeklyCost: number;
    recommendedWeeklyCost: number;
    annualSavings: number;
  };
}

interface CalculationParams {
  operationalHoursPerDay: number;
  shiftType: '8h' | '12h';
  cycleWeeks: number;
  handshakeMinutes: number;
  averageLeaveRate?: number;
  averageHourlyRate?: number;
}

/**
 * Calculates optimal staffing requirements based on operational needs
 */
export function calculateOptimalStaffing(
  currentStaff: StaffMember[],
  config: CalculationParams
): StaffingRecommendation {
  logger.info('Starting optimal staffing calculation', {
    staffCount: currentStaff.length,
    operationalHours: config.operationalHoursPerDay,
    shiftType: config.shiftType
  });

  const calculations: StaffingCalculation[] = [];
  const assumptions: string[] = [];
  const warnings: string[] = [];

  // Base calculations
  const shiftWorkers = currentStaff.filter(staff => staff.is_shift_worker);
  const averageHourlyRate = config.averageHourlyRate || calculateAverageHourlyRate(shiftWorkers);
  const averageLeaveRate = config.averageLeaveRate || 0.15; // 15% average leave/absence rate
  
  assumptions.push(`Average leave/absence rate: ${(averageLeaveRate * 100).toFixed(1)}%`);
  assumptions.push(`Average hourly rate: £${averageHourlyRate.toFixed(2)}`);
  assumptions.push(`Handover time: ${config.handshakeMinutes} minutes`);

  if (config.shiftType === '12h') {
    // 12-hour shift calculations
    const dayShiftCalc = calculateShiftRequirement('Day', 12, config, averageLeaveRate);
    const nightShiftCalc = calculateShiftRequirement('Night', 12, config, averageLeaveRate);
    
    calculations.push(dayShiftCalc, nightShiftCalc);
  } else {
    // 8-hour shift calculations
    const earlyShiftCalc = calculateShiftRequirement('Early', 8, config, averageLeaveRate);
    const lateShiftCalc = calculateShiftRequirement('Late', 8, config, averageLeaveRate);
    const nightShiftCalc = calculateShiftRequirement('Night', 8, config, averageLeaveRate);
    
    calculations.push(earlyShiftCalc, lateShiftCalc, nightShiftCalc);
  }

  // Calculate totals
  const totalRequiredStaff = calculations.reduce((sum, calc) => sum + calc.requiredStaff, 0);
  const totalRecommendedStaff = calculations.reduce((sum, calc) => sum + calc.totalWithBuffer, 0);

  // Validate against current staff
  const availableShiftWorkers = shiftWorkers.length;
  if (availableShiftWorkers < totalRequiredStaff) {
    warnings.push(`Current shift workers (${availableShiftWorkers}) below minimum requirement (${totalRequiredStaff})`);
  }

  // Cost implications
  const minimumWeeklyCost = totalRequiredStaff * 37 * averageHourlyRate; // Assuming 37-hour minimum
  const recommendedWeeklyCost = totalRecommendedStaff * 37 * averageHourlyRate;
  const annualSavings = (recommendedWeeklyCost - minimumWeeklyCost) * 52;

  const recommendation: StaffingRecommendation = {
    totalRequiredStaff,
    totalRecommendedStaff,
    calculations,
    assumptions,
    warnings,
    costImplications: {
      minimumWeeklyCost,
      recommendedWeeklyCost,
      annualSavings
    }
  };

  logger.info('Staffing calculation completed', {
    totalRequired: totalRequiredStaff,
    totalRecommended: totalRecommendedStaff,
    currentStaff: availableShiftWorkers
  });

  return recommendation;
}

/**
 * Calculates staffing requirement for a specific shift
 */
function calculateShiftRequirement(
  shiftName: string,
  shiftHours: number,
  config: CalculationParams,
  leaveRate: number
): StaffingCalculation {
  const reasoning: string[] = [];
  
  // Base requirement: minimum staff to cover operational hours
  const baseStaffNeeded = Math.ceil(config.operationalHoursPerDay / shiftHours);
  reasoning.push(`Base coverage: ${config.operationalHoursPerDay}h ÷ ${shiftHours}h = ${baseStaffNeeded} staff`);
  
  // Account for handover time if applicable
  let handoverAdjustment = 0;
  if (config.handshakeMinutes > 0) {
    const handoverHours = config.handshakeMinutes / 60;
    handoverAdjustment = Math.ceil(handoverHours / shiftHours);
    reasoning.push(`Handover adjustment: +${handoverAdjustment} for ${config.handshakeMinutes}min handovers`);
  }
  
  const requiredStaff = baseStaffNeeded + handoverAdjustment;
  
  // Buffer calculation for leave coverage
  const bufferStaff = Math.ceil(requiredStaff * leaveRate);
  reasoning.push(`Leave buffer: ${requiredStaff} × ${(leaveRate * 100).toFixed(1)}% = +${bufferStaff} staff`);
  
  // Cycle coverage consideration
  const cycleDays = config.cycleWeeks * 7;
  if (cycleDays > 28) { // For longer cycles, add extra buffer
    const extraBuffer = Math.ceil(requiredStaff * 0.1);
    reasoning.push(`Long cycle buffer: +${extraBuffer} for ${config.cycleWeeks}-week cycle`);
    bufferStaff += extraBuffer;
  }
  
  const totalWithBuffer = requiredStaff + bufferStaff;
  
  return {
    shiftType: shiftName,
    requiredStaff,
    recommendedStaff: totalWithBuffer,
    reasoning,
    bufferStaff,
    totalWithBuffer
  };
}

/**
 * Calculates average hourly rate from staff data
 */
function calculateAverageHourlyRate(staff: StaffMember[]): number {
  if (staff.length === 0) return 15.50; // Default minimum wage
  
  const ratesWithValues = staff
    .map(s => s.hourly_rate)
    .filter(rate => rate && rate > 0);
  
  if (ratesWithValues.length === 0) return 15.50;
  
  return ratesWithValues.reduce((sum, rate) => sum + rate, 0) / ratesWithValues.length;
}

/**
 * Validates if current staffing can meet calculated requirements
 */
export function validateStaffingAgainstRequirements(
  currentStaff: StaffMember[],
  recommendation: StaffingRecommendation,
  shiftType: '8h' | '12h'
): {
  isAdequate: boolean;
  gaps: Array<{
    shift: string;
    required: number;
    available: number;
    shortfall: number;
  }>;
  recommendations: string[];
} {
  const gaps: Array<{
    shift: string;
    required: number;
    available: number;
    shortfall: number;
  }> = [];
  
  const recommendations: string[] = [];
  
  for (const calc of recommendation.calculations) {
    let eligibleStaff: StaffMember[];
    
    if (shiftType === '12h') {
      eligibleStaff = currentStaff.filter(staff => 
        staff.is_shift_worker && 
        staff.eligible_shifts?.includes(calc.shiftType === 'Day' ? 'D' : 'N')
      );
    } else {
      const shiftCode = calc.shiftType === 'Early' ? 'E' : 
                      calc.shiftType === 'Late' ? 'L' : 'N';
      eligibleStaff = currentStaff.filter(staff => 
        staff.is_shift_worker && 
        staff.eligible_shifts?.includes(shiftCode)
      );
    }
    
    const available = eligibleStaff.length;
    const shortfall = Math.max(0, calc.requiredStaff - available);
    
    if (shortfall > 0) {
      gaps.push({
        shift: calc.shiftType,
        required: calc.requiredStaff,
        available,
        shortfall
      });
      
      recommendations.push(`Hire ${shortfall} additional staff for ${calc.shiftType} shifts`);
    }
  }
  
  const isAdequate = gaps.length === 0;
  
  return {
    isAdequate,
    gaps,
    recommendations
  };
}
