
import { StaffMember, ConfigItem } from "@/types/roster";
import { createLogger } from "../errorLogger";

const logger = createLogger('StaffingValidation');

export interface StaffingValidationReport {
  isValid: boolean;
  totalStaff: number;
  shiftWorkers: number;
  supervisors: number;
  shiftRequirements: {
    [key: string]: {
      required: number;
      available: number;
      eligible: StaffMember[];
      shortfall: number;
      isAdequate: boolean;
    };
  };
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

interface StaffingRequirements {
  day_shift_staff?: number;
  night_shift_staff?: number;
  early_shift_staff?: number;
  late_shift_staff?: number;
}

/**
 * Validates staff availability against roster requirements
 */
export function validateStaffingRequirements(
  staffList: StaffMember[],
  config: ConfigItem & { staffing_requirements?: StaffingRequirements }
): StaffingValidationReport {
  console.log('🔍 Starting comprehensive staffing validation...');
  logger.info('Starting staffing validation', { 
    staffCount: staffList.length, 
    configType: config.shift_type 
  });

  const report: StaffingValidationReport = {
    isValid: true,
    totalStaff: staffList.length,
    shiftWorkers: 0,
    supervisors: 0,
    shiftRequirements: {},
    warnings: [],
    errors: [],
    recommendations: []
  };

  // Basic staff categorization
  const shiftWorkers = staffList.filter(staff => staff.is_shift_worker && staff.eligible_shifts?.length > 0);
  const supervisors = staffList.filter(staff => !staff.is_shift_worker);
  
  report.shiftWorkers = shiftWorkers.length;
  report.supervisors = supervisors.length;

  console.log('📊 Staff breakdown:', {
    total: report.totalStaff,
    shiftWorkers: report.shiftWorkers,
    supervisors: report.supervisors
  });

  // Get staffing requirements with defaults
  const defaultStaffing: StaffingRequirements = {
    day_shift_staff: 2,
    night_shift_staff: 2,
    early_shift_staff: 1,
    late_shift_staff: 1
  };
  
  const requirements = { ...defaultStaffing, ...config.staffing_requirements };
  console.log('📋 Staffing requirements:', requirements);

  // Validate each shift type based on configuration
  if (config.shift_type === "12h") {
    // 12-hour shifts: Day and Night
    validateShiftType('Day', ['Day', 'D'], requirements.day_shift_staff!, shiftWorkers, report);
    validateShiftType('Night', ['Night', 'N'], requirements.night_shift_staff!, shiftWorkers, report);
  } else {
    // 8-hour shifts: Early, Late, Night
    validateShiftType('Early', ['Early', 'E'], requirements.early_shift_staff!, shiftWorkers, report);
    validateShiftType('Late', ['Late', 'L'], requirements.late_shift_staff!, shiftWorkers, report);
    validateShiftType('Night', ['Night', 'N'], requirements.night_shift_staff!, shiftWorkers, report);
  }

  // Additional validations
  performAdditionalValidations(staffList, config, report);

  // Determine overall validity
  report.isValid = report.errors.length === 0 && 
    Object.values(report.shiftRequirements).every(req => req.isAdequate);

  console.log('✅ Staffing validation completed:', {
    isValid: report.isValid,
    errorsCount: report.errors.length,
    warningsCount: report.warnings.length
  });

  return report;
}

/**
 * Validates a specific shift type
 */
function validateShiftType(
  shiftName: string,
  eligibleCodes: string[],
  required: number,
  shiftWorkers: StaffMember[],
  report: StaffingValidationReport
): void {
  console.log(`🔍 Validating ${shiftName} shift requirements...`);
  
  const eligibleStaff = shiftWorkers.filter(staff => 
    staff.eligible_shifts?.some(shift => eligibleCodes.includes(shift))
  );
  
  const available = eligibleStaff.length;
  const shortfall = Math.max(0, required - available);
  const isAdequate = available >= required;

  report.shiftRequirements[shiftName] = {
    required,
    available,
    eligible: eligibleStaff,
    shortfall,
    isAdequate
  };

  console.log(`📊 ${shiftName} shift validation:`, {
    required,
    available,
    shortfall,
    isAdequate,
    eligibleStaff: eligibleStaff.map(s => `${s.first_name} ${s.last_name}`)
  });

  if (!isAdequate) {
    const error = `${shiftName} shift understaffed: need ${required}, have ${available} (shortfall: ${shortfall})`;
    report.errors.push(error);
    console.error(`❌ ${error}`);
    
    if (available === 0) {
      report.recommendations.push(`Add at least ${required} staff members eligible for ${shiftName} shifts`);
    } else {
      report.recommendations.push(`Add ${shortfall} more staff members eligible for ${shiftName} shifts`);
    }
  } else {
    console.log(`✅ ${shiftName} shift adequately staffed`);
    
    if (available === required) {
      report.warnings.push(`${shiftName} shift has minimum staffing (${available}/${required}) - consider adding backup staff`);
    }
  }
}

/**
 * Additional validation checks
 */
function performAdditionalValidations(
  staffList: StaffMember[],
  config: ConfigItem,
  report: StaffingValidationReport
): void {
  // Check for staff with no eligible shifts
  const staffWithoutShifts = staffList.filter(staff => 
    staff.is_shift_worker && (!staff.eligible_shifts || staff.eligible_shifts.length === 0)
  );
  
  if (staffWithoutShifts.length > 0) {
    const warning = `${staffWithoutShifts.length} shift workers have no eligible shifts configured`;
    report.warnings.push(warning);
    console.warn(`⚠️ ${warning}:`, staffWithoutShifts.map(s => `${s.first_name} ${s.last_name}`));
  }

  // Check minimum staff for cycle coverage
  const cycleDays = config.cycle_length_weeks * 7;
  const minStaffForCoverage = config.shift_type === "12h" ? 4 : 6;
  
  if (report.shiftWorkers < minStaffForCoverage) {
    const error = `Insufficient total shift workers: need at least ${minStaffForCoverage} for ${config.shift_type} operation, have ${report.shiftWorkers}`;
    report.errors.push(error);
    report.recommendations.push(`Hire at least ${minStaffForCoverage - report.shiftWorkers} additional shift workers`);
  }

  // Check working time directive compliance
  const staffWithHighHours = staffList.filter(staff => 
    staff.min_hours_per_week && staff.min_hours_per_week > 48
  );
  
  if (staffWithHighHours.length > 0) {
    const warning = `${staffWithHighHours.length} staff have contracted hours > 48hrs/week (WTD compliance risk)`;
    report.warnings.push(warning);
  }
}

/**
 * Formats validation report for display
 */
export function formatValidationReport(report: StaffingValidationReport): string {
  const lines: string[] = [];
  
  lines.push('=== STAFFING VALIDATION REPORT ===');
  lines.push(`Overall Status: ${report.isValid ? '✅ VALID' : '❌ INVALID'}`);
  lines.push(`Total Staff: ${report.totalStaff} (${report.shiftWorkers} shift workers, ${report.supervisors} supervisors)`);
  lines.push('');
  
  lines.push('SHIFT REQUIREMENTS:');
  Object.entries(report.shiftRequirements).forEach(([shift, req]) => {
    const status = req.isAdequate ? '✅' : '❌';
    lines.push(`${status} ${shift}: ${req.available}/${req.required} ${req.shortfall > 0 ? `(${req.shortfall} short)` : ''}`);
    if (req.eligible.length > 0) {
      lines.push(`   Eligible: ${req.eligible.map(s => `${s.first_name} ${s.last_name}`).join(', ')}`);
    }
  });
  
  if (report.errors.length > 0) {
    lines.push('');
    lines.push('ERRORS:');
    report.errors.forEach(error => lines.push(`❌ ${error}`));
  }
  
  if (report.warnings.length > 0) {
    lines.push('');
    lines.push('WARNINGS:');
    report.warnings.forEach(warning => lines.push(`⚠️ ${warning}`));
  }
  
  if (report.recommendations.length > 0) {
    lines.push('');
    lines.push('RECOMMENDATIONS:');
    report.recommendations.forEach(rec => lines.push(`💡 ${rec}`));
  }
  
  return lines.join('\n');
}
