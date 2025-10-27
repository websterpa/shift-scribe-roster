/**
 * Unit tests for pattern adherence calculation
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateStaffAdherence, 
  calculatePatternAdherence,
  validatePatternAdherence 
} from '@/features/roster/patterns/adherence';
import type { ExpandedPatternDay } from '@/features/roster/patterns/types';
import type { Assignment } from '@/features/roster/types';

describe('calculateStaffAdherence', () => {
  it('calculates 100% adherence when all work days have assignments', () => {
    const pattern: ExpandedPatternDay[] = [
      { date: '2025-01-01', shift_code: 'D', is_rest: false },
      { date: '2025-01-02', shift_code: 'D', is_rest: false },
      { date: '2025-01-03', shift_code: 'N', is_rest: false },
      { date: '2025-01-04', shift_code: 'R', is_rest: true },
    ];

    const assignments: Assignment[] = [
      { staff_id: 'staff-1', date: '2025-01-01', shift_code: 'D' },
      { staff_id: 'staff-1', date: '2025-01-02', shift_code: 'D' },
      { staff_id: 'staff-1', date: '2025-01-03', shift_code: 'N' },
    ];

    const result = calculateStaffAdherence('staff-1', pattern, assignments);

    expect(result.expectedDutyDays).toBe(3);
    expect(result.matchedDutyDays).toBe(3);
    expect(result.adherencePct).toBe(100);
    expect(result.restPreservedDays).toBe(1);
  });

  it('tracks E/L to D remapping in 12h framework', () => {
    const pattern: ExpandedPatternDay[] = [
      { date: '2025-01-01', shift_code: 'E', is_rest: false },
      { date: '2025-01-02', shift_code: 'L', is_rest: false },
      { date: '2025-01-03', shift_code: 'N', is_rest: false },
    ];

    const assignments: Assignment[] = [
      { staff_id: 'staff-1', date: '2025-01-01', shift_code: 'D' }, // E → D
      { staff_id: 'staff-1', date: '2025-01-02', shift_code: 'D' }, // L → D
      { staff_id: 'staff-1', date: '2025-01-03', shift_code: 'N' },
    ];

    const result = calculateStaffAdherence('staff-1', pattern, assignments);

    expect(result.remappedELtoD).toBe(2);
    expect(result.adherencePct).toBe(100);
  });

  it('tracks absence days correctly', () => {
    const pattern: Array<ExpandedPatternDay & { absence?: 'A' }> = [
      { date: '2025-01-01', shift_code: 'D', is_rest: false },
      { date: '2025-01-02', shift_code: 'R', is_rest: true, absence: 'A' },
      { date: '2025-01-03', shift_code: 'R', is_rest: true, absence: 'A' },
      { date: '2025-01-04', shift_code: 'N', is_rest: false },
    ];

    const assignments: Assignment[] = [
      { staff_id: 'staff-1', date: '2025-01-01', shift_code: 'D' },
      { staff_id: 'staff-1', date: '2025-01-04', shift_code: 'N' },
    ];

    const result = calculateStaffAdherence('staff-1', pattern, assignments);

    expect(result.expectedDutyDays).toBe(2); // Only D and N
    expect(result.matchedDutyDays).toBe(2);
    expect(result.absenceDays).toBe(2);
    expect(result.restPreservedDays).toBe(2); // Absence days with no assignment
    expect(result.adherencePct).toBe(100);
  });

  it('calculates partial adherence when some assignments are missing', () => {
    const pattern: ExpandedPatternDay[] = [
      { date: '2025-01-01', shift_code: 'D', is_rest: false },
      { date: '2025-01-02', shift_code: 'D', is_rest: false },
      { date: '2025-01-03', shift_code: 'N', is_rest: false },
      { date: '2025-01-04', shift_code: 'N', is_rest: false },
    ];

    const assignments: Assignment[] = [
      { staff_id: 'staff-1', date: '2025-01-01', shift_code: 'D' },
      { staff_id: 'staff-1', date: '2025-01-03', shift_code: 'N' },
      // Missing assignments for Jan 2 and 4
    ];

    const result = calculateStaffAdherence('staff-1', pattern, assignments);

    expect(result.expectedDutyDays).toBe(4);
    expect(result.matchedDutyDays).toBe(2);
    expect(result.adherencePct).toBe(50);
  });

  it('handles patterns with no work days (all rest)', () => {
    const pattern: ExpandedPatternDay[] = [
      { date: '2025-01-01', shift_code: 'R', is_rest: true },
      { date: '2025-01-02', shift_code: 'R', is_rest: true },
    ];

    const assignments: Assignment[] = [];

    const result = calculateStaffAdherence('staff-1', pattern, assignments);

    expect(result.expectedDutyDays).toBe(0);
    expect(result.matchedDutyDays).toBe(0);
    expect(result.adherencePct).toBe(100); // Default to 100% when no work expected
    expect(result.restPreservedDays).toBe(2);
  });
});

describe('calculatePatternAdherence', () => {
  it('calculates overall adherence across multiple staff', () => {
    const expansions = new Map<string, ExpandedPatternDay[]>([
      ['staff-1', [
        { date: '2025-01-01', shift_code: 'D', is_rest: false },
        { date: '2025-01-02', shift_code: 'D', is_rest: false },
      ]],
      ['staff-2', [
        { date: '2025-01-01', shift_code: 'N', is_rest: false },
        { date: '2025-01-02', shift_code: 'N', is_rest: false },
      ]],
    ]);

    const assignments: Assignment[] = [
      { staff_id: 'staff-1', date: '2025-01-01', shift_code: 'D' },
      { staff_id: 'staff-1', date: '2025-01-02', shift_code: 'D' },
      { staff_id: 'staff-2', date: '2025-01-01', shift_code: 'N' },
      // staff-2 missing Jan 2
    ];

    const result = calculatePatternAdherence(expansions, assignments);

    expect(result.byStaff).toHaveLength(2);
    expect(result.totalExpectedDays).toBe(4);
    expect(result.totalMatchedDays).toBe(3);
    expect(result.overallAdherence).toBe(75);
  });

  it('includes staff names when provided', () => {
    const expansions = new Map<string, ExpandedPatternDay[]>([
      ['staff-1', [
        { date: '2025-01-01', shift_code: 'D', is_rest: false },
      ]],
    ]);

    const assignments: Assignment[] = [
      { staff_id: 'staff-1', date: '2025-01-01', shift_code: 'D' },
    ];

    const staffNames = new Map<string, string>([
      ['staff-1', 'John Doe'],
    ]);

    const result = calculatePatternAdherence(expansions, assignments, staffNames);

    expect(result.byStaff[0].staffName).toBe('John Doe');
  });
});

describe('validatePatternAdherence', () => {
  it('validates adherence meets minimum threshold', () => {
    const summary = {
      byStaff: [
        {
          staffId: 'staff-1',
          expectedDutyDays: 10,
          matchedDutyDays: 10,
          adherencePct: 100,
          restPreservedDays: 5,
        },
        {
          staffId: 'staff-2',
          expectedDutyDays: 10,
          matchedDutyDays: 9,
          adherencePct: 90,
          restPreservedDays: 5,
        },
      ],
      overallAdherence: 95,
      totalExpectedDays: 20,
      totalMatchedDays: 19,
      totalRestPreserved: 10,
      totalAbsenceDays: 0,
    };

    const result = validatePatternAdherence(summary, 95);

    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('staff-2');
    expect(result.violations[0]).toContain('90.0%');
  });

  it('passes validation when all staff meet threshold', () => {
    const summary = {
      byStaff: [
        {
          staffId: 'staff-1',
          expectedDutyDays: 10,
          matchedDutyDays: 10,
          adherencePct: 100,
          restPreservedDays: 5,
        },
      ],
      overallAdherence: 100,
      totalExpectedDays: 10,
      totalMatchedDays: 10,
      totalRestPreserved: 5,
      totalAbsenceDays: 0,
    };

    const result = validatePatternAdherence(summary, 95);

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails validation when overall adherence is too low', () => {
    const summary = {
      byStaff: [
        {
          staffId: 'staff-1',
          expectedDutyDays: 10,
          matchedDutyDays: 8,
          adherencePct: 80,
          restPreservedDays: 5,
        },
      ],
      overallAdherence: 80,
      totalExpectedDays: 10,
      totalMatchedDays: 8,
      totalRestPreserved: 5,
      totalAbsenceDays: 0,
    };

    const result = validatePatternAdherence(summary, 95);

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
