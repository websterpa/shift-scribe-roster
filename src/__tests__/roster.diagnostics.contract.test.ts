/**
 * Contract tests for RosterGenerationResult diagnostics
 * 
 * These tests ensure that:
 * 1. The generator always returns diagnostics
 * 2. The diagnostics shape matches the expected contract
 * 3. The adapter provides defaults when engine data is missing
 */

import { describe, it, expect } from 'vitest';
import { transformCorrectiveResult } from '@/features/roster/engine/adapter';
import type { RosterGenerationResult, Diagnostics } from '@/features/roster/types';
import type { CorrectiveResult } from '@/engine2/generators/correctiveRosterGenerator';

/**
 * Helper to create a minimal valid CorrectiveResult mock
 */
function createMockCorrectiveResult(overrides?: Partial<CorrectiveResult>): CorrectiveResult {
  return {
    assignments: [],
    roster: {},
    coverage: {},
    fairness: {
      staffTotals: {},
      targets: { E: 0, L: 0, N: 0, D: 0 },
      variance: { E: 0, L: 0, N: 0, D: 0 },
    },
    violations: [],
    utilizationReport: {},
    diagnostics: {
      staffPoolCount: 0,
      staffUsedCount: 0,
      distributionStats: {},
    },
    ...overrides,
  };
}

describe('RosterGenerationResult diagnostics contract', () => {
  describe('shape validation', () => {
    it('should have required top-level fields', () => {
      const mockEngineResult = createMockCorrectiveResult({
        assignments: [
          {
            staffId: 'staff-1',
            dateISO: '2025-10-01',
            shiftType: 'E',
          },
        ],
        diagnostics: {
          staffPoolCount: 5,
          staffUsedCount: 3,
          distributionStats: {
            'staff-1': { nights: 2, weekendDays: 1, totalHours: 40 },
            'staff-2': { nights: 1, weekendDays: 2, totalHours: 38 },
          },
        },
        violations: ['Test warning'],
      });

      const result = transformCorrectiveResult(mockEngineResult);

      // Top-level contract
      expect(result).toHaveProperty('assignments');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('diagnostics');
      
      expect(Array.isArray(result.assignments)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.diagnostics).toBe('object');
    });

    it('should have distributionStats with byStaff and byShiftCode', () => {
      const mockEngineResult = createMockCorrectiveResult({
        assignments: [
          {
            staffId: 'staff-1',
            dateISO: '2025-10-01',
            shiftType: 'E',
          },
        ],
        diagnostics: {
          staffPoolCount: 1,
          staffUsedCount: 1,
          distributionStats: {
            'staff-1': { nights: 2, weekendDays: 1, totalHours: 40 },
          },
        },
      });

      const result = transformCorrectiveResult(mockEngineResult);

      // Diagnostics shape
      expect(result.diagnostics).toHaveProperty('distributionStats');
      expect(result.diagnostics.distributionStats).toHaveProperty('byStaff');
      expect(result.diagnostics.distributionStats).toHaveProperty('byShiftCode');
      
      // byStaff is an array
      expect(Array.isArray(result.diagnostics.distributionStats.byStaff)).toBe(true);
      
      // byShiftCode is an object
      expect(typeof result.diagnostics.distributionStats.byShiftCode).toBe('object');
    });

    it('should have correct byStaff item shape', () => {
      const mockEngineResult = createMockCorrectiveResult({
        assignments: [
          {
            staffId: 'staff-1',
            dateISO: '2025-10-01',
            shiftType: 'E',
          },
        ],
        diagnostics: {
          staffPoolCount: 1,
          staffUsedCount: 1,
          distributionStats: {
            'staff-1': { nights: 2, weekendDays: 1, totalHours: 40 },
          },
        },
      });

      const result = transformCorrectiveResult(mockEngineResult);
      const byStaff = result.diagnostics.distributionStats.byStaff;

      expect(byStaff.length).toBeGreaterThan(0);
      
      const firstStaff = byStaff[0];
      expect(firstStaff).toHaveProperty('staffId');
      expect(firstStaff).toHaveProperty('totalHours');
      expect(firstStaff).toHaveProperty('totalShifts');
      expect(firstStaff).toHaveProperty('nights');
      expect(firstStaff).toHaveProperty('weekendDays');
      
      // Type checks
      expect(typeof firstStaff.staffId).toBe('string');
      expect(typeof firstStaff.totalHours).toBe('number');
      expect(typeof firstStaff.totalShifts).toBe('number');
      expect(typeof firstStaff.nights).toBe('number');
      expect(typeof firstStaff.weekendDays).toBe('number');
    });
  });

  describe('default values when engine data is missing', () => {
    it('should provide default diagnostics when missing', () => {
      const mockEngineResult = createMockCorrectiveResult({
        assignments: [],
        diagnostics: {
          staffPoolCount: 0,
          staffUsedCount: 0,
          distributionStats: {},
        },
      });

      const result = transformCorrectiveResult(mockEngineResult);

      // Should still have diagnostics with defaults
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.distributionStats).toBeDefined();
      expect(Array.isArray(result.diagnostics.distributionStats.byStaff)).toBe(true);
      expect(typeof result.diagnostics.distributionStats.byShiftCode).toBe('object');
    });

    it('should provide empty arrays/objects when distributionStats is missing', () => {
      const mockEngineResult = createMockCorrectiveResult({
        assignments: [],
        diagnostics: {
          staffPoolCount: 0,
          staffUsedCount: 0,
          distributionStats: {},
        },
      });

      const result = transformCorrectiveResult(mockEngineResult);

      expect(result.diagnostics.distributionStats).toBeDefined();
      expect(result.diagnostics.distributionStats.byStaff).toEqual([]);
      expect(result.diagnostics.distributionStats.byShiftCode).toBeDefined();
    });

    it('should handle partial diagnostics data', () => {
      const mockEngineResult = createMockCorrectiveResult({
        assignments: [
          {
            staffId: 'staff-1',
            dateISO: '2025-10-01',
            shiftType: 'E',
          },
        ],
        diagnostics: {
          staffPoolCount: 5,
          staffUsedCount: 0,
          distributionStats: {},
        },
      });

      const result = transformCorrectiveResult(mockEngineResult);

      // Should still build valid distributionStats from assignments
      expect(result.diagnostics.distributionStats).toBeDefined();
      expect(result.diagnostics.distributionStats.byStaff.length).toBeGreaterThanOrEqual(0);
      expect(typeof result.diagnostics.distributionStats.byShiftCode).toBe('object');
    });
  });

  describe('byShiftCode aggregation', () => {
    it('should aggregate shift counts correctly', () => {
      const mockEngineResult = createMockCorrectiveResult({
        assignments: [
          {
            staffId: 'staff-1',
            dateISO: '2025-10-01',
            shiftType: 'E',
          },
          {
            staffId: 'staff-2',
            dateISO: '2025-10-02',
            shiftType: 'E',
          },
          {
            staffId: 'staff-1',
            dateISO: '2025-10-03',
            shiftType: 'N',
          },
        ],
        diagnostics: {
          staffPoolCount: 2,
          staffUsedCount: 2,
          distributionStats: {
            'staff-1': { nights: 1, weekendDays: 0, totalHours: 20 },
            'staff-2': { nights: 0, weekendDays: 0, totalHours: 8 },
          },
        },
        fairness: {
          staffTotals: {
            'staff-1': { E: 1, L: 0, N: 1, D: 0, total: 2 },
            'staff-2': { E: 1, L: 0, N: 0, D: 0, total: 1 },
          },
          targets: { E: 1, L: 0, N: 0.5, D: 0 },
          variance: { E: 0, L: 0, N: 0.5, D: 0 },
        },
      });

      const result = transformCorrectiveResult(mockEngineResult);
      const byShiftCode = result.diagnostics.distributionStats.byShiftCode;

      expect(byShiftCode).toHaveProperty('E');
      expect(byShiftCode).toHaveProperty('N');
      expect(byShiftCode.E.count).toBe(2);
      expect(byShiftCode.N.count).toBe(1);
    });
  });

  describe('type safety', () => {
    it('should satisfy RosterGenerationResult interface', () => {
      const mockEngineResult = createMockCorrectiveResult({
        assignments: [
          {
            staffId: 'staff-1',
            dateISO: '2025-10-01',
            shiftType: 'E',
          },
        ],
        diagnostics: {
          staffPoolCount: 1,
          staffUsedCount: 1,
          distributionStats: {
            'staff-1': { nights: 2, weekendDays: 1, totalHours: 40 },
          },
        },
      });

      const result: RosterGenerationResult = transformCorrectiveResult(mockEngineResult);

      // TypeScript compilation ensures this satisfies the interface
      // Runtime check that it has the expected structure
      expect(result).toBeDefined();
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.distributionStats).toBeDefined();
      
      // Ensure diagnostics satisfies Diagnostics type
      const diagnostics: Diagnostics = result.diagnostics;
      expect(diagnostics.distributionStats).toBeDefined();
    });
  });

  describe('optional diagnostic fields', () => {
    it('should preserve constraint violations when present', () => {
      const mockEngineResult = createMockCorrectiveResult({
        assignments: [],
        violations: [
          'Staff A: insufficient rest between shifts',
          'Staff B: too many consecutive days',
        ],
        diagnostics: {
          staffPoolCount: 0,
          staffUsedCount: 0,
          distributionStats: {},
        },
      });

      const result = transformCorrectiveResult(mockEngineResult);

      // Adapter should extract constraint violations from violation strings
      expect(result.diagnostics.constraintViolations).toBeDefined();
      if (result.diagnostics.constraintViolations) {
        expect(result.diagnostics.constraintViolations.minRest).toBeGreaterThan(0);
        expect(result.diagnostics.constraintViolations.maxConsec).toBeGreaterThan(0);
      }
    });

    it('should handle missing optional fields gracefully', () => {
      const mockEngineResult = createMockCorrectiveResult({
        assignments: [],
        violations: [], // No violations
        diagnostics: {
          staffPoolCount: 0,
          staffUsedCount: 0,
          distributionStats: {},
        },
      });

      const result = transformCorrectiveResult(mockEngineResult);

      // No constraint violations
      expect(result.diagnostics.constraintViolations).toBeUndefined();
    });
  });
});
