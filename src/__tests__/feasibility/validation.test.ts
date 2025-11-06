import { describe, it, expect } from 'vitest';
import { detectSystem, activeShiftKeys, type System, type ShiftKey } from '@/services/feasibility/staffingBreakdown';

/**
 * Test suite for feasibility validation rules
 * Ensures that zero-staff requirements are caught for active shift types
 */
describe('Feasibility Validation', () => {
  describe('8-hour system validation', () => {
    it('should flag L=0 as invalid for 8h system', () => {
      const system: System = '8h';
      const activeCodes = activeShiftKeys(system); // ['E', 'L', 'N']
      const requiredPerDay: Partial<Record<ShiftKey, number>> = {
        E: 2,
        L: 0, // Invalid!
        N: 2
      };

      const zeros = activeCodes.filter(c => (requiredPerDay[c] ?? 0) <= 0);
      
      expect(zeros).toContain('L');
      expect(zeros.length).toBe(1);
    });

    it('should flag multiple zeros as invalid for 8h system', () => {
      const system: System = '8h';
      const activeCodes = activeShiftKeys(system);
      const requiredPerDay: Partial<Record<ShiftKey, number>> = {
        E: 0, // Invalid!
        L: 0, // Invalid!
        N: 2
      };

      const zeros = activeCodes.filter(c => (requiredPerDay[c] ?? 0) <= 0);
      
      expect(zeros).toEqual(['E', 'L']);
      expect(zeros.length).toBe(2);
    });

    it('should pass validation when all 8h shifts are ≥ 1', () => {
      const system: System = '8h';
      const activeCodes = activeShiftKeys(system);
      const requiredPerDay: Partial<Record<ShiftKey, number>> = {
        E: 2,
        L: 1,
        N: 2
      };

      const zeros = activeCodes.filter(c => (requiredPerDay[c] ?? 0) <= 0);
      
      expect(zeros).toEqual([]);
    });

    it('should flag undefined (missing) values as invalid for 8h system', () => {
      const system: System = '8h';
      const activeCodes = activeShiftKeys(system);
      const requiredPerDay: Partial<Record<ShiftKey, number>> = {
        E: 2,
        // L is missing (undefined)
        N: 2
      };

      const zeros = activeCodes.filter(c => (requiredPerDay[c] ?? 0) <= 0);
      
      expect(zeros).toContain('L');
    });
  });

  describe('12-hour system validation', () => {
    it('should flag D=0 as invalid for 12h system', () => {
      const system: System = '12h';
      const activeCodes = activeShiftKeys(system); // ['D', 'N']
      const requiredPerDay: Partial<Record<ShiftKey, number>> = {
        D: 0, // Invalid!
        N: 4
      };

      const zeros = activeCodes.filter(c => (requiredPerDay[c] ?? 0) <= 0);
      
      expect(zeros).toContain('D');
      expect(zeros.length).toBe(1);
    });

    it('should flag N=0 as invalid for 12h system', () => {
      const system: System = '12h';
      const activeCodes = activeShiftKeys(system);
      const requiredPerDay: Partial<Record<ShiftKey, number>> = {
        D: 2,
        N: 0 // Invalid!
      };

      const zeros = activeCodes.filter(c => (requiredPerDay[c] ?? 0) <= 0);
      
      expect(zeros).toContain('N');
      expect(zeros.length).toBe(1);
    });

    it('should pass validation when all 12h shifts are ≥ 1', () => {
      const system: System = '12h';
      const activeCodes = activeShiftKeys(system);
      const requiredPerDay: Partial<Record<ShiftKey, number>> = {
        D: 2,
        N: 4
      };

      const zeros = activeCodes.filter(c => (requiredPerDay[c] ?? 0) <= 0);
      
      expect(zeros).toEqual([]);
    });

    it('should flag both D and N as invalid when both are 0', () => {
      const system: System = '12h';
      const activeCodes = activeShiftKeys(system);
      const requiredPerDay: Partial<Record<ShiftKey, number>> = {
        D: 0, // Invalid!
        N: 0  // Invalid!
      };

      const zeros = activeCodes.filter(c => (requiredPerDay[c] ?? 0) <= 0);
      
      expect(zeros).toEqual(['D', 'N']);
      expect(zeros.length).toBe(2);
    });
  });

  describe('System detection', () => {
    it('should detect 8h system correctly', () => {
      expect(detectSystem(8)).toBe('8h');
    });

    it('should detect 12h system correctly', () => {
      expect(detectSystem(12)).toBe('12h');
    });
  });

  describe('Active shift keys', () => {
    it('should return correct keys for 8h system', () => {
      const keys = activeShiftKeys('8h');
      expect(keys).toEqual(['E', 'L', 'N']);
    });

    it('should return correct keys for 12h system', () => {
      const keys = activeShiftKeys('12h');
      expect(keys).toEqual(['D', 'N']);
    });
  });
});
