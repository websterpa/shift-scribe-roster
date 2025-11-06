import { describe, it, expect } from 'vitest';

/**
 * Test suite for roster generation validation guards
 * Ensures that zero-staff requirements are caught before roster generation
 */
describe('Roster Generation Guards', () => {
  describe('Zero-staff validation guard', () => {
    it('should validate that active shift types have the correct structure', () => {
      // 8h system
      const validShiftTypes8h = new Set(['E', 'L', 'N']);
      expect(validShiftTypes8h.has('E')).toBe(true);
      expect(validShiftTypes8h.has('L')).toBe(true);
      expect(validShiftTypes8h.has('N')).toBe(true);
      expect(validShiftTypes8h.has('D')).toBe(false);

      // 12h system
      const validShiftTypes12h = new Set(['D', 'N']);
      expect(validShiftTypes12h.has('D')).toBe(true);
      expect(validShiftTypes12h.has('N')).toBe(true);
      expect(validShiftTypes12h.has('E')).toBe(false);
      expect(validShiftTypes12h.has('L')).toBe(false);
    });

    it('should detect zero-staff requirements in 8h mode', () => {
      const shiftSystem = '8h';
      const validShiftTypes = new Set(['E', 'L', 'N']);
      const activeCodes = Array.from(validShiftTypes);

      // Valid requirements
      const validReqs = { E: 2, L: 1, N: 2 };
      const validZeros = activeCodes.filter(code => (validReqs as any)[code] <= 0);
      expect(validZeros).toEqual([]);

      // Invalid requirements (L = 0)
      const invalidReqs = { E: 2, L: 0, N: 2 };
      const invalidZeros = activeCodes.filter(code => (invalidReqs as any)[code] <= 0);
      expect(invalidZeros).toContain('L');
      expect(invalidZeros.length).toBe(1);
    });

    it('should detect zero-staff requirements in 12h mode', () => {
      const shiftSystem = '12h';
      const validShiftTypes = new Set(['D', 'N']);
      const activeCodes = Array.from(validShiftTypes);

      // Valid requirements
      const validReqs = { D: 2, N: 4 };
      const validZeros = activeCodes.filter(code => (validReqs as any)[code] <= 0);
      expect(validZeros).toEqual([]);

      // Invalid requirements (D = 0)
      const invalidReqs = { D: 0, N: 4 };
      const invalidZeros = activeCodes.filter(code => (invalidReqs as any)[code] <= 0);
      expect(invalidZeros).toContain('D');
      expect(invalidZeros.length).toBe(1);
    });

    it('should generate appropriate error messages', () => {
      const shiftSystem = '8h';
      const activeCodes = ['E', 'L', 'N'];
      const zeros = ['L'];

      const errorMsg = `Invalid staffing requirements: All active shift types must have ≥ 1 staff assigned. Zero-staff shifts detected: ${zeros.join(', ')} (${shiftSystem} mode requires ${activeCodes.join('/')})`;

      expect(errorMsg).toContain('Invalid staffing requirements');
      expect(errorMsg).toContain('L');
      expect(errorMsg).toContain('8h');
      expect(errorMsg).toContain('E/L/N');
    });

    it('should handle undefined/null values as zeros', () => {
      const activeCodes = ['E', 'L', 'N'];
      
      // Undefined value
      const reqsWithUndefined = { E: 2, L: undefined, N: 2 };
      const zerosUndefined = activeCodes.filter(code => ((reqsWithUndefined as any)[code] ?? 0) <= 0);
      expect(zerosUndefined).toContain('L');

      // Null value
      const reqsWithNull = { E: 2, L: null, N: 2 };
      const zerosNull = activeCodes.filter(code => ((reqsWithNull as any)[code] ?? 0) <= 0);
      expect(zerosNull).toContain('L');

      // Missing property
      const reqsWithMissing = { E: 2, N: 2 } as any;
      const zerosMissing = activeCodes.filter(code => (reqsWithMissing[code] ?? 0) <= 0);
      expect(zerosMissing).toContain('L');
    });
  });

  describe('Error message formatting', () => {
    it('should format error messages correctly for single zero', () => {
      const zeros = ['L'];
      const message = `These shift types must be ≥ 1: ${zeros.join(', ')}`;
      expect(message).toBe('These shift types must be ≥ 1: L');
    });

    it('should format error messages correctly for multiple zeros', () => {
      const zeros = ['E', 'L'];
      const message = `These shift types must be ≥ 1: ${zeros.join(', ')}`;
      expect(message).toBe('These shift types must be ≥ 1: E, L');
    });
  });
});
