/**
 * Unit tests for absence overlay on patterns
 */

import { describe, it, expect } from 'vitest';
import { overlayAbsencesOnPatterns } from '@/features/roster/patterns/overlayAbsence';
import type { ExpandedPatternDay, AbsenceRecord } from '@/features/roster/patterns';

describe('overlayAbsencesOnPatterns', () => {
  it('marks absence days as rest with A marker', () => {
    const expansions = new Map<string, ExpandedPatternDay[]>([
      ['staff-1', [
        { date: '2025-01-01', shift_code: 'D', is_rest: false },
        { date: '2025-01-02', shift_code: 'D', is_rest: false },
        { date: '2025-01-03', shift_code: 'N', is_rest: false },
        { date: '2025-01-04', shift_code: 'N', is_rest: false },
        { date: '2025-01-05', shift_code: 'R', is_rest: true },
      ]],
    ]);

    const absences: AbsenceRecord[] = [
      {
        staffId: 'staff-1',
        startDate: '2025-01-02',
        endDate: '2025-01-03',
        leaveType: 'annual',
        status: 'approved',
      },
    ];

    const result = overlayAbsencesOnPatterns(expansions, absences);
    const staff1Days = result.get('staff-1')!;

    // Day 1: Not affected
    expect(staff1Days[0].shift_code).toBe('D');
    expect(staff1Days[0].is_rest).toBe(false);
    expect(staff1Days[0].absence).toBeUndefined();

    // Day 2: Absence period - marked as rest with A
    expect(staff1Days[1].shift_code).toBe('R');
    expect(staff1Days[1].is_rest).toBe(true);
    expect(staff1Days[1].absence).toBe('A');
    expect(staff1Days[1].absenceType).toBe('annual');

    // Day 3: Absence period - marked as rest with A
    expect(staff1Days[2].shift_code).toBe('R');
    expect(staff1Days[2].is_rest).toBe(true);
    expect(staff1Days[2].absence).toBe('A');
    expect(staff1Days[2].absenceType).toBe('annual');

    // Day 4: Not affected
    expect(staff1Days[3].shift_code).toBe('N');
    expect(staff1Days[3].is_rest).toBe(false);
    expect(staff1Days[3].absence).toBeUndefined();

    // Day 5: Already rest, not changed
    expect(staff1Days[4].shift_code).toBe('R');
    expect(staff1Days[4].is_rest).toBe(true);
    expect(staff1Days[4].absence).toBeUndefined();
  });

  it('handles multiple absence periods for same staff', () => {
    const expansions = new Map<string, ExpandedPatternDay[]>([
      ['staff-1', [
        { date: '2025-01-01', shift_code: 'D', is_rest: false },
        { date: '2025-01-02', shift_code: 'D', is_rest: false },
        { date: '2025-01-03', shift_code: 'N', is_rest: false },
        { date: '2025-01-04', shift_code: 'N', is_rest: false },
        { date: '2025-01-05', shift_code: 'D', is_rest: false },
      ]],
    ]);

    const absences: AbsenceRecord[] = [
      {
        staffId: 'staff-1',
        startDate: '2025-01-01',
        endDate: '2025-01-01',
        leaveType: 'sick',
        status: 'approved',
      },
      {
        staffId: 'staff-1',
        startDate: '2025-01-04',
        endDate: '2025-01-05',
        leaveType: 'annual',
        status: 'approved',
      },
    ];

    const result = overlayAbsencesOnPatterns(expansions, absences);
    const staff1Days = result.get('staff-1')!;

    // Day 1: Sick leave
    expect(staff1Days[0].absence).toBe('A');
    expect(staff1Days[0].absenceType).toBe('sick');

    // Day 2: Not affected
    expect(staff1Days[1].absence).toBeUndefined();

    // Day 3: Not affected
    expect(staff1Days[2].absence).toBeUndefined();

    // Day 4-5: Annual leave
    expect(staff1Days[3].absence).toBe('A');
    expect(staff1Days[3].absenceType).toBe('annual');
    expect(staff1Days[4].absence).toBe('A');
    expect(staff1Days[4].absenceType).toBe('annual');
  });

  it('handles multiple staff members', () => {
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

    const absences: AbsenceRecord[] = [
      {
        staffId: 'staff-1',
        startDate: '2025-01-01',
        endDate: '2025-01-01',
        leaveType: 'annual',
        status: 'approved',
      },
      {
        staffId: 'staff-2',
        startDate: '2025-01-02',
        endDate: '2025-01-02',
        leaveType: 'sick',
        status: 'approved',
      },
    ];

    const result = overlayAbsencesOnPatterns(expansions, absences);

    // Staff 1: Day 1 absent
    expect(result.get('staff-1')![0].absence).toBe('A');
    expect(result.get('staff-1')![1].absence).toBeUndefined();

    // Staff 2: Day 2 absent
    expect(result.get('staff-2')![0].absence).toBeUndefined();
    expect(result.get('staff-2')![1].absence).toBe('A');
  });

  it('preserves expansions for staff with no absences', () => {
    const expansions = new Map<string, ExpandedPatternDay[]>([
      ['staff-1', [
        { date: '2025-01-01', shift_code: 'D', is_rest: false },
        { date: '2025-01-02', shift_code: 'N', is_rest: false },
      ]],
    ]);

    const absences: AbsenceRecord[] = [];

    const result = overlayAbsencesOnPatterns(expansions, absences);
    const staff1Days = result.get('staff-1')!;

    // Should be unchanged
    expect(staff1Days[0].shift_code).toBe('D');
    expect(staff1Days[0].absence).toBeUndefined();
    expect(staff1Days[1].shift_code).toBe('N');
    expect(staff1Days[1].absence).toBeUndefined();
  });

  it('handles overlapping absence periods', () => {
    const expansions = new Map<string, ExpandedPatternDay[]>([
      ['staff-1', [
        { date: '2025-01-01', shift_code: 'D', is_rest: false },
        { date: '2025-01-02', shift_code: 'D', is_rest: false },
        { date: '2025-01-03', shift_code: 'N', is_rest: false },
      ]],
    ]);

    const absences: AbsenceRecord[] = [
      {
        staffId: 'staff-1',
        startDate: '2025-01-01',
        endDate: '2025-01-02',
        leaveType: 'annual',
        status: 'approved',
      },
      {
        staffId: 'staff-1',
        startDate: '2025-01-02',
        endDate: '2025-01-03',
        leaveType: 'sick', // Overlapping but different type
        status: 'approved',
      },
    ];

    const result = overlayAbsencesOnPatterns(expansions, absences);
    const staff1Days = result.get('staff-1')!;

    // All three days should be marked as absence
    expect(staff1Days[0].absence).toBe('A');
    expect(staff1Days[1].absence).toBe('A');
    expect(staff1Days[2].absence).toBe('A');

    // First matching absence wins for type
    expect(staff1Days[0].absenceType).toBe('annual');
    expect(staff1Days[1].absenceType).toBe('annual'); // First match
    expect(staff1Days[2].absenceType).toBe('sick');
  });
});
