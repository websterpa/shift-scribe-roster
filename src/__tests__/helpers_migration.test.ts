/**
 * Helpers Migration Test
 * 
 * Verifies that migrated helpers from utils/roster to services/roster/helpers
 * maintain identical exports and functionality.
 */

import { describe, it, expect } from 'vitest';

// Import from NEW location
import {
  calculateOptimalStaffing,
  validateStaffingAgainstRequirements,
  type StaffingCalculation,
  type StaffingRecommendation,
  createOTCycleEntry,
  createCommonOTPatterns,
  validateOTRequest,
  buildMixedCycleExample,
  type OTAssignmentRequest,
  validateStaffingRequirements,
  formatValidationReport,
  type StaffingValidationReport,
  analyzeStaffUtilization,
  calculateProjectedUtilization,
  type StaffUtilizationMetrics,
  type UtilizationAnalysisReport
} from '@/services/roster/helpers';

// Import from OLD location (should still work via shim)
import {
  calculateOptimalStaffing as oldCalculateOptimalStaffing,
  validateStaffingAgainstRequirements as oldValidateStaffingAgainstRequirements,
  type StaffingCalculation as OldStaffingCalculation,
  type StaffingRecommendation as OldStaffingRecommendation
} from '@/utils/roster/staffingCalculator';

import {
  createOTCycleEntry as oldCreateOTCycleEntry,
  createCommonOTPatterns as oldCreateCommonOTPatterns,
  validateOTRequest as oldValidateOTRequest,
  buildMixedCycleExample as oldBuildMixedCycleExample,
  type OTAssignmentRequest as OldOTAssignmentRequest
} from '@/utils/roster/otAssignmentHelper';

import {
  validateStaffingRequirements as oldValidateStaffingRequirements,
  formatValidationReport as oldFormatValidationReport,
  type StaffingValidationReport as OldStaffingValidationReport
} from '@/utils/roster/staffingValidation';

import {
  analyzeStaffUtilization as oldAnalyzeStaffUtilization,
  calculateProjectedUtilization as oldCalculateProjectedUtilization,
  type StaffUtilizationMetrics as OldStaffUtilizationMetrics,
  type UtilizationAnalysisReport as OldUtilizationAnalysisReport
} from '@/utils/roster/staffUtilizationAnalysis';

import { StaffMember, ConfigItem } from '@/types/roster';

describe('Helpers Migration - Export Integrity', () => {
  describe('Staffing Calculator Functions', () => {
    it('exports calculateOptimalStaffing from both locations', () => {
      expect(calculateOptimalStaffing).toBeDefined();
      expect(oldCalculateOptimalStaffing).toBeDefined();
      expect(typeof calculateOptimalStaffing).toBe('function');
      expect(typeof oldCalculateOptimalStaffing).toBe('function');
    });

    it('exports validateStaffingAgainstRequirements from both locations', () => {
      expect(validateStaffingAgainstRequirements).toBeDefined();
      expect(oldValidateStaffingAgainstRequirements).toBeDefined();
      expect(typeof validateStaffingAgainstRequirements).toBe('function');
    });

    it('calculates identical staffing recommendations', () => {
      const mockStaff: StaffMember[] = [
        {
          id: '1',
          employee_id: 'EMP001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@test.com',
          hire_date: '2024-01-01',
          is_active: true,
          availability_status: 'active',
          role: 'Staff',
          is_shift_worker: true,
          hourly_rate: 20,
          eligible_shifts: ['E', 'L', 'N'],
          min_hours_per_week: 37,
          max_hours_per_week: 48,
          wtd_opt_out: false,
          opted_out_wtd: false,
          days_off_per_week: 2,
          holiday_multiplier: 1.5,
          leave_allowance_days: 28
        }
      ];

      const config = {
        operationalHoursPerDay: 24,
        shiftType: '8h' as const,
        cycleWeeks: 4,
        handshakeMinutes: 30,
        averageHourlyRate: 20
      };

      const newResult = calculateOptimalStaffing(mockStaff, config);
      const oldResult = oldCalculateOptimalStaffing(mockStaff, config);

      expect(newResult.totalRequiredStaff).toBe(oldResult.totalRequiredStaff);
      expect(newResult.totalRecommendedStaff).toBe(oldResult.totalRecommendedStaff);
      expect(newResult.calculations.length).toBe(oldResult.calculations.length);
    });
  });

  describe('OT Assignment Functions', () => {
    it('exports createOTCycleEntry from both locations', () => {
      expect(createOTCycleEntry).toBeDefined();
      expect(oldCreateOTCycleEntry).toBeDefined();
      expect(typeof createOTCycleEntry).toBe('function');
    });

    it('exports createCommonOTPatterns from both locations', () => {
      expect(createCommonOTPatterns).toBeDefined();
      expect(oldCreateCommonOTPatterns).toBeDefined();
      expect(typeof createCommonOTPatterns).toBe('function');
    });

    it('exports validateOTRequest from both locations', () => {
      expect(validateOTRequest).toBeDefined();
      expect(oldValidateOTRequest).toBeDefined();
      expect(typeof validateOTRequest).toBe('function');
    });

    it('creates identical OT cycle entries', () => {
      const newEntry = createOTCycleEntry(0, 'staff-1', { otHours: 4, otStartLocalTime: '10:00' });
      const oldEntry = oldCreateOTCycleEntry(0, 'staff-1', { otHours: 4, otStartLocalTime: '10:00' });

      expect(newEntry).toEqual(oldEntry);
      expect(newEntry.day).toBe(0);
      expect(newEntry.staffId).toBe('staff-1');
      expect(newEntry.shiftCode).toBe('OT');
      expect(newEntry.otOptions.otHours).toBe(4);
    });

    it('validates OT requests identically', () => {
      const request: OTAssignmentRequest = {
        staffId: 'staff-1',
        dateISO: '2025-01-15',
        otHours: 4,
        otStartLocalTime: '10:00'
      };

      const newResult = validateOTRequest(request);
      const oldResult = oldValidateOTRequest(request);

      expect(newResult.valid).toBe(oldResult.valid);
      expect(newResult.errors).toEqual(oldResult.errors);
    });
  });

  describe('Validation Utilities', () => {
    it('exports validateStaffingRequirements from both locations', () => {
      expect(validateStaffingRequirements).toBeDefined();
      expect(oldValidateStaffingRequirements).toBeDefined();
      expect(typeof validateStaffingRequirements).toBe('function');
    });

    it('exports formatValidationReport from both locations', () => {
      expect(formatValidationReport).toBeDefined();
      expect(oldFormatValidationReport).toBeDefined();
      expect(typeof formatValidationReport).toBe('function');
    });

    it('validates staffing requirements identically', () => {
      const mockStaff: StaffMember[] = [
        {
          id: '1',
          employee_id: 'EMP001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@test.com',
          hire_date: '2024-01-01',
          is_active: true,
          availability_status: 'active',
          role: 'Staff',
          is_shift_worker: true,
          hourly_rate: 20,
          eligible_shifts: ['E', 'L', 'N'],
          min_hours_per_week: 37,
          max_hours_per_week: 48,
          wtd_opt_out: false,
          opted_out_wtd: false,
          days_off_per_week: 2,
          holiday_multiplier: 1.5,
          leave_allowance_days: 28
        }
      ];

      const config: ConfigItem & { staffing_requirements?: any } = {
        id: 'config-1',
        config_name: 'Test Config',
        shift_type: '8h',
        cycle_length_weeks: 4,
        operational_hours_per_day: 24,
        handshake_minutes: 30,
        start_date: '2025-01-01',
        created_at: new Date().toISOString(),
        staffing_requirements: {
          early_shift_staff: 2,
          late_shift_staff: 2,
          night_shift_staff: 1
        }
      };

      const newResult = validateStaffingRequirements(mockStaff, config);
      const oldResult = oldValidateStaffingRequirements(mockStaff, config);

      expect(newResult.isValid).toBe(oldResult.isValid);
      expect(newResult.totalStaff).toBe(oldResult.totalStaff);
      expect(newResult.shiftWorkers).toBe(oldResult.shiftWorkers);
    });
  });

  describe('Utilization Analysis Functions', () => {
    it('exports analyzeStaffUtilization from both locations', () => {
      expect(analyzeStaffUtilization).toBeDefined();
      expect(oldAnalyzeStaffUtilization).toBeDefined();
      expect(typeof analyzeStaffUtilization).toBe('function');
    });

    it('exports calculateProjectedUtilization from both locations', () => {
      expect(calculateProjectedUtilization).toBeDefined();
      expect(oldCalculateProjectedUtilization).toBeDefined();
      expect(typeof calculateProjectedUtilization).toBe('function');
    });

    it('calculates identical projected utilization', () => {
      const mockStaff: StaffMember[] = [
        {
          id: '1',
          employee_id: 'EMP001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@test.com',
          hire_date: '2024-01-01',
          is_active: true,
          availability_status: 'active',
          role: 'Staff',
          is_shift_worker: true,
          hourly_rate: 20,
          eligible_shifts: ['E', 'L', 'N'],
          min_hours_per_week: 37,
          max_hours_per_week: 48,
          wtd_opt_out: false,
          opted_out_wtd: false,
          days_off_per_week: 2,
          holiday_multiplier: 1.5,
          leave_allowance_days: 28
        }
      ];

      const proposedShifts = { '1': 5 };
      const avgHours = 8;

      const newResult = calculateProjectedUtilization(mockStaff, proposedShifts, avgHours);
      const oldResult = oldCalculateProjectedUtilization(mockStaff, proposedShifts, avgHours);

      expect(newResult.length).toBe(oldResult.length);
      expect(newResult[0].staffId).toBe(oldResult[0].staffId);
      expect(newResult[0].actualHoursPerWeek).toBe(oldResult[0].actualHoursPerWeek);
      expect(newResult[0].utilizationPercentage).toBe(oldResult[0].utilizationPercentage);
    });
  });

  describe('Type Exports', () => {
    it('exports all required types', () => {
      // This test ensures TypeScript can resolve all exported types
      const staffingCalc: StaffingCalculation = {
        shiftType: 'Early',
        requiredStaff: 2,
        recommendedStaff: 3,
        reasoning: ['Test'],
        bufferStaff: 1,
        totalWithBuffer: 3
      };

      const otRequest: OTAssignmentRequest = {
        staffId: 'staff-1',
        dateISO: '2025-01-15',
        otHours: 4
      };

      expect(staffingCalc).toBeDefined();
      expect(otRequest).toBeDefined();
    });
  });
});
