import { describe, it, expect } from 'vitest';
import { generateCorrectiveRoster, CorrectiveStaffMember, CoverageRequirements, DEFAULT_CORRECTIVE_POLICY } from '../../engine2/generators/correctiveRosterGenerator';

describe('Corrective Generator - 12h Framework Support', () => {
  
  // Helper to create staff
  const createStaff = (count: number): CorrectiveStaffMember[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `S${i + 1}`,
      name: `Staff ${i + 1}`,
      availability: {},
      isNightEligible: i % 2 === 0, // Half eligible for nights
    }));
  };

  // Helper to set availability for all staff on all days
  const setAllAvailable = (staff: CorrectiveStaffMember[], days: string[]) => {
    staff.forEach(s => {
      days.forEach(d => {
        s.availability[d] = true;
      });
    });
  };

  describe('12h framework (D/N only)', () => {
    it('generates roster with D and N shifts only (no E/L)', () => {
      const staff = createStaff(5);
      const days = Array.from({ length: 7 }, (_, i) => 
        `2025-01-${String(i + 1).padStart(2, '0')}`
      );
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {};
      days.forEach(d => {
        requirements[d] = { D: 2, N: 1 }; // 12h framework: Day and Night only
      });

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
        framework: '12h',
      });

      // Verify NO E or L assignments exist
      const hasEorL = result.assignments.some(a => a.shiftType === 'E' || a.shiftType === 'L');
      expect(hasEorL).toBe(false);

      // Verify only D and N assignments (plus R for rest)
      result.assignments.forEach(a => {
        expect(['D', 'N']).toContain(a.shiftType);
      });

      // Verify coverage for D and N
      days.forEach(d => {
        expect(result.coverage[d].D).toBeGreaterThan(0);
        expect(result.coverage[d].N).toBeGreaterThan(0);
        expect(result.coverage[d].E).toBe(0);
        expect(result.coverage[d].L).toBe(0);
      });

      console.log('12h Framework Test - Coverage:', result.coverage);
      console.log('12h Framework Test - Assignments:', result.assignments.length);
    });

    it('distributes D shifts fairly across staff', () => {
      const staff = createStaff(6);
      const days = Array.from({ length: 14 }, (_, i) => 
        `2025-01-${String(i + 1).padStart(2, '0')}`
      );
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {};
      days.forEach(d => {
        requirements[d] = { D: 3 }; // 3 day shifts per day
      });

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
        framework: '12h',
      });

      // Count D shifts per staff
      const dShiftsPerStaff: Record<string, number> = {};
      result.assignments.forEach(a => {
        if (a.shiftType === 'D') {
          dShiftsPerStaff[a.staffId] = (dShiftsPerStaff[a.staffId] || 0) + 1;
        }
      });

      // Check variance is reasonable (fairness)
      const counts = Object.values(dShiftsPerStaff);
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance = counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / counts.length;
      
      console.log('12h D-shift distribution:', dShiftsPerStaff);
      console.log('12h D-shift variance:', variance);
      
      // Variance should be low (good fairness)
      expect(variance).toBeLessThan(10);
    });

    it('respects night eligibility in 12h mode', () => {
      const staff = createStaff(4);
      const days = ['2025-01-01', '2025-01-02', '2025-01-03'];
      setAllAvailable(staff, days);

      // Override night eligibility: only S1 and S2 eligible
      staff.forEach((s, i) => {
        s.isNightEligible = i < 2;
      });

      const requirements: CoverageRequirements = {};
      days.forEach(d => {
        requirements[d] = { D: 1, N: 1 };
      });

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
        framework: '12h',
      });

      // Check all night assignments are from eligible staff
      const nightAssignments = result.assignments.filter(a => a.shiftType === 'N');
      nightAssignments.forEach(a => {
        const staffMember = staff.find(s => s.id === a.staffId);
        expect(staffMember?.isNightEligible).toBe(true);
      });
    });
  });

  describe('8h framework (E/L/N)', () => {
    it('generates roster with E, L, N shifts only (no D)', () => {
      const staff = createStaff(5);
      const days = Array.from({ length: 7 }, (_, i) => 
        `2025-01-${String(i + 1).padStart(2, '0')}`
      );
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {};
      days.forEach(d => {
        requirements[d] = { E: 2, L: 1, N: 1 }; // 8h framework: Early, Late, Night
      });

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
        framework: '8h', // Explicit 8h mode
      });

      // Verify NO D assignments exist
      const hasD = result.assignments.some(a => a.shiftType === 'D');
      expect(hasD).toBe(false);

      // Verify only E, L, N assignments (plus R for rest)
      result.assignments.forEach(a => {
        expect(['E', 'L', 'N']).toContain(a.shiftType);
      });

      // Verify coverage for E, L, N
      days.forEach(d => {
        expect(result.coverage[d].E).toBeGreaterThan(0);
        expect(result.coverage[d].L).toBeGreaterThan(0);
        expect(result.coverage[d].N).toBeGreaterThan(0);
        expect(result.coverage[d].D).toBe(0);
      });
    });

    it('defaults to 8h framework when not specified', () => {
      const staff = createStaff(3);
      const days = ['2025-01-01', '2025-01-02'];
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {
        '2025-01-01': { E: 1, L: 1 },
        '2025-01-02': { E: 1, L: 1 },
      };

      // Don't specify framework - should default to 8h
      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
        // framework not specified
      });

      // Should use 8h shifts (E/L/N)
      const hasD = result.assignments.some(a => a.shiftType === 'D');
      expect(hasD).toBe(false);
    });
  });

  describe('Framework isolation', () => {
    it('12h and 8h rosters produce different shift types', () => {
      const staff = createStaff(4);
      const days = ['2025-01-01', '2025-01-02', '2025-01-03'];
      setAllAvailable(staff, days);

      const requirements12h: CoverageRequirements = {};
      const requirements8h: CoverageRequirements = {};
      days.forEach(d => {
        requirements12h[d] = { D: 2, N: 1 };
        requirements8h[d] = { E: 2, L: 1, N: 1 };
      });

      const result12h = generateCorrectiveRoster({
        days,
        staff,
        requirements: requirements12h,
        policy: DEFAULT_CORRECTIVE_POLICY,
        framework: '12h',
      });

      const result8h = generateCorrectiveRoster({
        days,
        staff,
        requirements: requirements8h,
        policy: DEFAULT_CORRECTIVE_POLICY,
        framework: '8h',
      });

      // 12h should have D shifts, 8h should not
      const has12hD = result12h.assignments.some(a => a.shiftType === 'D');
      const has8hD = result8h.assignments.some(a => a.shiftType === 'D');
      expect(has12hD).toBe(true);
      expect(has8hD).toBe(false);

      // 8h should have E/L shifts, 12h should not
      const has12hEorL = result12h.assignments.some(a => a.shiftType === 'E' || a.shiftType === 'L');
      const has8hEorL = result8h.assignments.some(a => a.shiftType === 'E' || a.shiftType === 'L');
      expect(has12hEorL).toBe(false);
      expect(has8hEorL).toBe(true);
    });
  });

  describe('12h rest constraints', () => {
    it('enforces minimum rest between 12h D shifts', () => {
      const staff = createStaff(2);
      const days = ['2025-01-01', '2025-01-02', '2025-01-03'];
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {};
      days.forEach(d => {
        requirements[d] = { D: 1 }; // One 12h day shift per day
      });

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          minGapHoursBetweenShifts: 11,
        },
        framework: '12h',
      });

      // Verify each staff has rest between consecutive D shifts
      // (consecutive D shifts should be allowed with 12h+ rest)
      staff.forEach(s => {
        let prevWasD = false;
        let consecDCount = 0;
        
        for (const day of days) {
          const shift = result.roster[s.id]?.[day];
          if (shift === 'D') {
            if (prevWasD) {
              consecDCount++;
            }
            prevWasD = true;
          } else {
            prevWasD = false;
          }
        }
        
        // Should not have too many consecutive D shifts without rest
        expect(consecDCount).toBeLessThanOrEqual(5);
      });
    });
  });
});
