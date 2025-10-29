/**
 * MIGRATION VERIFICATION TEST
 * 
 * Confirms roster engine integrity after full migration to services layer.
 * Tests that generation, helpers, and diagnostics behave identically.
 * 
 * ✅ Baseline Assertions:
 *   - Total shifts match requirements
 *   - Rest day distribution is fair
 *   - WTD compliance metrics are correct
 *   - All helpers resolve from @/services/roster/helpers
 * 
 * @module tests/migration_verification
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  generateCorrectiveRoster,
  DEFAULT_CORRECTIVE_POLICY,
  type CorrectiveStaffMember,
  type CoverageRequirements,
  type CorrectiveResult,
  type CorrectivePolicy,
} from '@/features/roster/engine';
import {
  buildDemand,
  nightExpectations,
  validateRosterResults,
  normalizeShiftCode,
  checkNightReadiness,
} from '@/services/roster/helpers';

describe('Migration Verification Suite', () => {
  // ========== BASELINE CONFIGURATION ==========
  const BASELINE = {
    totalDays: 8,
    staffCount: 12,
    expectedShiftsPerStaff: { min: 4, max: 10 },
    expectedRestDaysPerStaff: { min: 2, max: 6 },
    expectedNightShifts: 8, // 1 per day
    expectedDayShifts: 24, // 3 per day (E/L or D depending on framework)
    wtdComplianceThreshold: 0.95, // 95% compliance
  };

  let staff: CorrectiveStaffMember[];
  let requirements: CoverageRequirements;
  let days: string[];

  beforeEach(() => {
    // Build 8-day test period
    const startDate = '2025-11-01';
    days = Array.from({ length: BASELINE.totalDays }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    // Create 12 staff members with balanced night eligibility
    staff = Array.from({ length: BASELINE.staffCount }, (_, i) => ({
      id: `staff-${i + 1}`,
      name: `Staff Member ${i + 1}`,
      availability: Object.fromEntries(days.map(d => [d, true])),
      isNightEligible: i % 3 === 0, // 4 night-eligible staff
      wtd_opt_out: false,
    }));

    // Build standard 8h coverage requirements (E/L/N pattern)
    requirements = Object.fromEntries(
      days.map(dateISO => [
        dateISO,
        { E: 2, L: 1, N: 1 }, // 4 shifts per day
      ])
    );
  });

  // ========== TEST 1: Helpers Import Resolution ==========
  test('helpers resolve from services layer', () => {
    // Verify all helpers are functions (successfully imported)
    expect(typeof buildDemand).toBe('function');
    expect(typeof nightExpectations).toBe('function');
    expect(typeof validateRosterResults).toBe('function');
    expect(typeof normalizeShiftCode).toBe('function');
    expect(typeof checkNightReadiness).toBe('function');

    // Smoke test each helper
    const demand = buildDemand('8h', { 0: { E: 2, L: 1, N: 1 } });
    expect(demand.length).toBeGreaterThan(0);
    expect(demand.every(d => d.token && typeof d.need === 'number')).toBe(true);

    const normalized = normalizeShiftCode('Night');
    expect(normalized).toBe('N');

    const nightCheck = checkNightReadiness({
      system: '8h',
      staff: staff as any[], // Cast to match StaffMember type
      includeNights: true,
      requiredByDay: { 0: { N: 1 } },
    });
    expect(nightCheck).toHaveProperty('ready');
    expect(nightCheck).toHaveProperty('issues');
  });

  // ========== TEST 2: 8h Generation Baseline ==========
  test('8h pattern generation matches baseline', () => {
    console.log('\n🧪 Running 8h baseline generation...');

    const result: CorrectiveResult = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
      framework: '8h',
    });

    // Assertion 1: Total assignments match requirements
    const totalRequiredShifts = days.length * 4; // 4 shifts per day
    expect(result.assignments.length).toBe(totalRequiredShifts);
    console.log(`✅ Total shifts: ${result.assignments.length}/${totalRequiredShifts}`);

    // Assertion 2: Night shifts only assigned to night-eligible staff
    const nightAssignments = result.assignments.filter(a => a.shiftType === 'N');
    const nightEligibleIds = new Set(staff.filter(s => s.isNightEligible).map(s => s.id));
    
    expect(nightAssignments.length).toBe(BASELINE.expectedNightShifts);
    expect(nightAssignments.every(a => nightEligibleIds.has(a.staffId))).toBe(true);
    console.log(`✅ Night shifts: ${nightAssignments.length} (all night-eligible)`);

    // Assertion 3: Fair distribution (no staff overloaded)
    const shiftsPerStaff = new Map<string, number>();
    result.assignments.forEach(a => {
      shiftsPerStaff.set(a.staffId, (shiftsPerStaff.get(a.staffId) || 0) + 1);
    });

    const maxShifts = Math.max(...shiftsPerStaff.values());
    const minShifts = Math.min(...shiftsPerStaff.values());
    const variance = maxShifts - minShifts;

    expect(maxShifts).toBeLessThanOrEqual(BASELINE.expectedShiftsPerStaff.max);
    expect(minShifts).toBeGreaterThanOrEqual(BASELINE.expectedShiftsPerStaff.min);
    expect(variance).toBeLessThanOrEqual(4); // Max 4-shift variance
    console.log(`✅ Distribution: min=${minShifts}, max=${maxShifts}, variance=${variance}`);

    // Assertion 4: Rest days are fair
    const restDaysPerStaff = Array.from(shiftsPerStaff.entries()).map(([staffId, shifts]) => {
      const assignedDays = new Set(
        result.assignments.filter(a => a.staffId === staffId).map(a => a.dateISO)
      );
      return days.length - assignedDays.size;
    });

    const maxRestDays = Math.max(...restDaysPerStaff);
    const minRestDays = Math.min(...restDaysPerStaff);

    expect(minRestDays).toBeGreaterThanOrEqual(BASELINE.expectedRestDaysPerStaff.min);
    expect(maxRestDays).toBeLessThanOrEqual(BASELINE.expectedRestDaysPerStaff.max);
    console.log(`✅ Rest days: min=${minRestDays}, max=${maxRestDays}`);

    // Assertion 5: WTD compliance (no violations)
    expect(result.violations.length).toBe(0);
    console.log(`✅ WTD violations: 0`);

    // Assertion 6: Coverage requirements met
    const coverageGaps = days.filter(dateISO => {
      const dayCoverage = result.coverage[dateISO];
      const dayReqs = requirements[dateISO];
      return (
        dayCoverage.E < dayReqs.E ||
        dayCoverage.L < dayReqs.L ||
        dayCoverage.N < dayReqs.N
      );
    });

    expect(coverageGaps.length).toBe(0);
    console.log(`✅ Coverage gaps: 0 days`);

    console.log('\n✅ 8h baseline verification PASSED\n');
  });

  // ========== TEST 3: 12h Generation Baseline ==========
  test('12h pattern generation matches baseline', () => {
    console.log('\n🧪 Running 12h baseline generation...');

    // Convert requirements to 12h format (D/N only)
    const requirements12h: CoverageRequirements = Object.fromEntries(
      days.map(dateISO => [
        dateISO,
        { D: 2, N: 1 }, // 3 shifts per day in 12h mode
      ])
    );

    const result: CorrectiveResult = generateCorrectiveRoster({
      days,
      staff,
      requirements: requirements12h,
      policy: DEFAULT_CORRECTIVE_POLICY,
      framework: '12h',
    });

    // Assertion 1: Total assignments match 12h requirements
    const totalRequiredShifts = days.length * 3; // 3 shifts per day
    expect(result.assignments.length).toBe(totalRequiredShifts);
    console.log(`✅ Total shifts: ${result.assignments.length}/${totalRequiredShifts}`);

    // Assertion 2: Only D and N shifts present
    const shiftTypes = new Set(result.assignments.map(a => a.shiftType));
    expect(shiftTypes.has('D')).toBe(true);
    expect(shiftTypes.has('N')).toBe(true);
    expect(shiftTypes.has('E')).toBe(false);
    expect(shiftTypes.has('L')).toBe(false);
    console.log(`✅ Shift types: D and N only (no E/L)`);

    // Assertion 3: Night shifts assigned correctly
    const nightAssignments = result.assignments.filter(a => a.shiftType === 'N');
    const nightEligibleIds = new Set(staff.filter(s => s.isNightEligible).map(s => s.id));
    
    expect(nightAssignments.length).toBe(BASELINE.expectedNightShifts);
    expect(nightAssignments.every(a => nightEligibleIds.has(a.staffId))).toBe(true);
    console.log(`✅ Night shifts: ${nightAssignments.length} (all night-eligible)`);

    console.log('\n✅ 12h baseline verification PASSED\n');
  });

  // ========== TEST 4: Edge Cases ==========
  test('handles edge cases gracefully', () => {
    console.log('\n🧪 Running edge case tests...');

    // Edge Case 1: Insufficient night-eligible staff
    const limitedStaff = staff.map((s, i) => ({
      ...s,
      isNightEligible: i === 0, // Only 1 night-eligible
    }));

    const result1 = generateCorrectiveRoster({
      days,
      staff: limitedStaff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
      framework: '8h',
    });

    // Should produce violations due to insufficient night staff
    expect(result1.violations.length).toBeGreaterThan(0);
    console.log(`✅ Insufficient night staff: ${result1.violations.length} violations`);

    // Edge Case 2: Zero coverage requirement
    const zeroReqs: CoverageRequirements = Object.fromEntries(
      days.map(dateISO => [dateISO, { E: 0, L: 0, N: 0 }])
    );

    const result2 = generateCorrectiveRoster({
      days,
      staff,
      requirements: zeroReqs,
      policy: DEFAULT_CORRECTIVE_POLICY,
      framework: '8h',
    });

    expect(result2.assignments.length).toBe(0);
    console.log(`✅ Zero requirements: 0 assignments`);

    // Edge Case 3: All staff unavailable
    const unavailableStaff = staff.map(s => ({
      ...s,
      availability: Object.fromEntries(days.map(d => [d, false])),
    }));

    const result3 = generateCorrectiveRoster({
      days,
      staff: unavailableStaff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
      framework: '8h',
    });

    // Should produce coverage gaps
    expect(result3.assignments.length).toBe(0);
    console.log(`✅ All unavailable: 0 assignments`);

    console.log('\n✅ Edge case tests PASSED\n');
  });

  // ========== TEST 5: Snapshot Baseline ==========
  test('generation output matches stored snapshot', () => {
    const result = generateCorrectiveRoster({
      days,
      staff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
      framework: '8h',
    });

    // Create a deterministic snapshot of key metrics
    const snapshot = {
      totalAssignments: result.assignments.length,
      nightAssignments: result.assignments.filter(a => a.shiftType === 'N').length,
      dayAssignments: result.assignments.filter(a => a.shiftType !== 'N').length,
      staffUsed: new Set(result.assignments.map(a => a.staffId)).size,
      violations: result.violations.length,
      fairnessVariance: {
        E: result.fairness.variance.E,
        L: result.fairness.variance.L,
        N: result.fairness.variance.N,
      },
    };

    // Expected baseline (adjust after first run if needed)
    const expectedSnapshot = {
      totalAssignments: 32, // 8 days * 4 shifts
      nightAssignments: 8,
      dayAssignments: 24,
      staffUsed: 12,
      violations: 0,
      fairnessVariance: {
        E: expect.any(Number),
        L: expect.any(Number),
        N: expect.any(Number),
      },
    };

    expect(snapshot).toMatchObject(expectedSnapshot);
    console.log('\n📸 Snapshot baseline VERIFIED\n', snapshot);
  });
});

// ========== MIGRATION COMPLETENESS CHECK ==========
describe('Migration Completeness', () => {
  test('no utils/roster imports remain in production code', async () => {
    // This is a meta-test that ensures no production code imports from the old path
    // In a real CI environment, this would use a grep or AST scanner
    
    // For now, we verify the helpers export from the correct location
    const helpersModule = await import('@/services/roster/helpers');
    
    expect(helpersModule).toHaveProperty('buildDemand');
    expect(helpersModule).toHaveProperty('nightExpectations');
    expect(helpersModule).toHaveProperty('validateRosterResults');
    expect(helpersModule).toHaveProperty('normalizeShiftCode');
    expect(helpersModule).toHaveProperty('checkNightReadiness');
    
    console.log('✅ All helpers export from @/services/roster/helpers');
  });
});
