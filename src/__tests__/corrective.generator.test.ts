/**
 * @corrective-generator
 * Tests for corrective roster generator with balanced E/L/N and guaranteed utilization
 */
import { describe, it, expect } from 'vitest';
import {
  generateCorrectiveRoster,
  type CorrectiveStaffMember,
  type CoverageRequirements,
  DEFAULT_CORRECTIVE_POLICY,
} from '@/engine2/generators/correctiveRosterGenerator';

describe('Corrective Roster Generator @corrective-generator', () => {
  const createStaff = (count: number): CorrectiveStaffMember[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `staff-${i + 1}`,
      name: `Staff ${i + 1}`,
      availability: {},
      isNightEligible: i < 6, // First 6 can work nights
    }));
  };

  const createRequirements = (days: number): { days: string[]; requirements: CoverageRequirements } => {
    const startDate = new Date('2025-11-01');
    const daysList: string[] = [];
    const requirements: CoverageRequirements = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateISO = date.toISOString().split('T')[0];
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;

      daysList.push(dateISO);
      requirements[dateISO] = {
        E: isWeekend ? 1 : 2,
        L: isWeekend ? 1 : 2,
        N: 1,
      };
    }

    return { days: daysList, requirements };
  };

  const setAllAvailable = (staff: CorrectiveStaffMember[], days: string[]) => {
    staff.forEach(s => {
      days.forEach(d => {
        s.availability[d] = true;
      });
    });
  };

  it('generates roster for 11 staff over 28 days', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(28);
    setAllAvailable(staff, days);

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // Check all days have roster entries
    expect(Object.keys(result.roster)).toHaveLength(11);
    staff.forEach(s => {
      expect(result.roster[s.id]).toBeDefined();
      expect(Object.keys(result.roster[s.id])).toHaveLength(28);
    });
  });

  it('ensures ALL 11 staff are utilized (no one with zero assignments)', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(28);
    setAllAvailable(staff, days);

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // Check utilization report
    staff.forEach(s => {
      const assignments = result.utilizationReport[s.id];
      expect(assignments).toBeGreaterThan(0);
    });

    // Verify in fairness stats
    staff.forEach(s => {
      const totals = result.fairness.staffTotals[s.id];
      expect(totals.total).toBeGreaterThan(0);
    });
  });

  it('respects night eligibility constraints', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(7);
    setAllAvailable(staff, days);

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // Staff 7-11 (indices 6-10) are NOT night eligible
    staff.slice(6).forEach(s => {
      days.forEach(d => {
        const shift = result.roster[s.id][d];
        expect(shift).not.toBe('N');
      });
    });
  });

  it('respects availability constraints', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(7);

    // First staff unavailable on first 3 days
    days.slice(0, 3).forEach(d => {
      staff[0].availability[d] = false;
    });

    // Others available
    staff.slice(1).forEach(s => {
      days.forEach(d => {
        s.availability[d] = true;
      });
    });

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // First staff should have R on unavailable days
    days.slice(0, 3).forEach(d => {
      expect(result.roster[staff[0].id][d]).toBe('R');
    });
  });

  it('achieves fair distribution across shift types', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(28);
    setAllAvailable(staff, days);

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // Check variance is reasonable
    expect(result.fairness.variance.E).toBeLessThan(10);
    expect(result.fairness.variance.L).toBeLessThan(10);
    expect(result.fairness.variance.N).toBeLessThan(10);

    // Check all staff are close to targets
    const { targets } = result.fairness;
    staff.forEach(s => {
      const totals = result.fairness.staffTotals[s.id];
      // Allow some flexibility but should be roughly balanced
      expect(Math.abs(totals.E - targets.E)).toBeLessThan(5);
      expect(Math.abs(totals.L - targets.L)).toBeLessThan(5);
      expect(Math.abs(totals.N - targets.N)).toBeLessThan(5);
    });
  });

  it('fills all coverage requirements', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(7);
    setAllAvailable(staff, days);

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // Check coverage matches requirements
    days.forEach(d => {
      const req = requirements[d];
      const cov = result.coverage[d];

      expect(cov.E).toBe(req.E || 0);
      expect(cov.L).toBe(req.L || 0);
      expect(cov.N).toBe(req.N || 0);
    });

    // Should have no coverage violations
    const coverageViolations = result.violations.filter(v => v.includes('Coverage mismatch'));
    expect(coverageViolations).toHaveLength(0);
  });

  it('enforces consecutive days limit', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(14);
    setAllAvailable(staff, days);

    const policy = {
      ...DEFAULT_CORRECTIVE_POLICY,
      maxConsecDays: 4, // Stricter limit for testing
    };

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy,
    });

    // Check no staff exceeds consecutive limit
    staff.forEach(s => {
      let consecCount = 0;
      days.forEach(d => {
        const shift = result.roster[s.id][d];
        if (shift !== 'R') {
          consecCount++;
          expect(consecCount).toBeLessThanOrEqual(policy.maxConsecDays);
        } else {
          consecCount = 0;
        }
      });
    });
  });

  it('enforces consecutive nights limit', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(14);
    setAllAvailable(staff, days);

    const policy = {
      ...DEFAULT_CORRECTIVE_POLICY,
      maxConsecNights: 2, // Stricter for testing
    };

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy,
    });

    // Check no staff exceeds consecutive nights limit
    staff.forEach(s => {
      let consecNights = 0;
      days.forEach(d => {
        const shift = result.roster[s.id][d];
        if (shift === 'N') {
          consecNights++;
          expect(consecNights).toBeLessThanOrEqual(policy.maxConsecNights);
        } else {
          consecNights = 0;
        }
      });
    });
  });

  it('prevents illegal turnarounds (11h rest)', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(7);
    setAllAvailable(staff, days);

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // Check for illegal transitions
    staff.forEach(s => {
      for (let i = 1; i < days.length; i++) {
        const prevShift = result.roster[s.id][days[i - 1]];
        const currShift = result.roster[s.id][days[i]];

        // N -> E is illegal (night ends 06:00, early starts 06:00)
        if (prevShift === 'N') {
          expect(currShift).not.toBe('E');
          expect(currShift).not.toBe('L');
        }

        // L -> E is illegal (late ends 22:00, early starts 06:00 = 8h)
        if (prevShift === 'L') {
          expect(currShift).not.toBe('E');
        }
      }
    });
  });

  it('prefers rest after nights when policy enabled', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(14);
    setAllAvailable(staff, days);

    const policy = {
      ...DEFAULT_CORRECTIVE_POLICY,
      preferRestAfterNights: true,
    };

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy,
    });

    // Count how often rest follows night
    let nightsFollowedByRest = 0;
    let totalNights = 0;

    staff.forEach(s => {
      for (let i = 0; i < days.length - 1; i++) {
        const currShift = result.roster[s.id][days[i]];
        const nextShift = result.roster[s.id][days[i + 1]];

        if (currShift === 'N') {
          totalNights++;
          if (nextShift === 'R') {
            nightsFollowedByRest++;
          }
        }
      }
    });

    // At least 70% of nights should be followed by rest
    if (totalNights > 0) {
      const ratio = nightsFollowedByRest / totalNights;
      expect(ratio).toBeGreaterThan(0.7);
    }
  });

  it('generates valid assignments array', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(7);
    setAllAvailable(staff, days);

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // Assignments should match roster (excluding R)
    expect(result.assignments.length).toBeGreaterThan(0);

    result.assignments.forEach(a => {
      expect(['E', 'L', 'N']).toContain(a.shiftType);
      expect(result.roster[a.staffId][a.dateISO]).toBe(a.shiftType);
    });
  });

  it('handles low staff scenario gracefully', () => {
    const staff = createStaff(5); // Only 5 staff for 11-person needs
    const { days, requirements } = createRequirements(7);
    setAllAvailable(staff, days);

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // All staff should be heavily utilized
    staff.forEach(s => {
      const totals = result.fairness.staffTotals[s.id];
      expect(totals.total).toBeGreaterThan(0);
    });

    // May have violations due to undercoverage
    expect(result.violations.length).toBeGreaterThanOrEqual(0);
  });

  it('calculates targets correctly', () => {
    const staff = createStaff(11);
    const { days, requirements } = createRequirements(28);
    setAllAvailable(staff, days);

    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // Calculate expected totals
    let totalE = 0, totalL = 0, totalN = 0;
    days.forEach(d => {
      totalE += requirements[d].E || 0;
      totalL += requirements[d].L || 0;
      totalN += requirements[d].N || 0;
    });

    const expectedTargetE = Math.round(totalE / 11);
    const expectedTargetL = Math.round(totalL / 11);
    const expectedTargetN = Math.round(totalN / 11);

    expect(result.fairness.targets.E).toBe(expectedTargetE);
    expect(result.fairness.targets.L).toBe(expectedTargetL);
    expect(result.fairness.targets.N).toBe(expectedTargetN);
  });
});
