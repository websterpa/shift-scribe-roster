import { describe, test, expect } from 'vitest';
import { generateRosterEnhanced } from '@/utils/roster/enhancedRosterGenerator';
import { checkNightReadiness } from '@/utils/roster/nightReadinessCheck';
import type { StaffMember } from '@/types/roster';

function createStaff(id: string, name: string, eligibleShifts?: string[]): StaffMember {
  return {
    id,
    employee_id: id,
    first_name: name.split(' ')[0],
    last_name: name.split(' ')[1] || 'Test',
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`,
    role: 'Staff',
    is_active: true,
    eligible_shifts: eligibleShifts || ['Early', 'Late', 'Night', 'Day'],
    hourly_rate: 18,
    hire_date: '2025-01-01',
    phone: undefined,
    is_shift_worker: true,
    min_hours_per_week: 40,
    max_hours_per_week: 48,
    opted_out_wtd: false,
    days_off_per_week: 2,
    holiday_multiplier: 2,
    leave_allowance_days: 28,
    unavailable_from: undefined,
    expected_return_date: undefined,
    availability_status: 'active',
    unavailability_reason: undefined,
    unavailability_notes: undefined
  };
}

describe('@nights Night Presence', () => {
  test('generates Night shifts when N demand exists (8h)', () => {
    const staff = [
      createStaff('s1', 'Alice Test'),
      createStaff('s2', 'Bob Test'),
      createStaff('s3', 'Charlie Test')
    ];

    const result = generateRosterEnhanced({
      system: '8h',
      versionId: 'test-v1',
      staff,
      requirementsByDay: {
        0: { E: 2, L: 2, N: 1 },
        1: { E: 2, L: 2, N: 1 },
        2: { E: 2, L: 2, N: 1 },
        3: { E: 2, L: 2, N: 1 },
        4: { E: 2, L: 2, N: 1 },
        5: { E: 2, L: 2, N: 1 },
        6: { E: 2, L: 2, N: 1 }
      },
      startDate: '2025-10-13',
      allowSupervisorNights: false,
      includeNights: true,
      patternTokens: ['E', 'E', 'L', 'L', 'N', 'N', 'R', 'R', 'R', 'R']
    });

    expect(result.nightsGenerated).toBeGreaterThan(0);
    expect(result.assignments.some(a => a.shift_code === 'N')).toBe(true);
    
    const nightShifts = result.assignments.filter(a => a.shift_code === 'N');
    expect(nightShifts.length).toBeGreaterThanOrEqual(7); // At least 1 per day
  });

  test('generates Night shifts when N demand exists (12h)', () => {
    const staff = [
      createStaff('s1', 'Alice Test'),
      createStaff('s2', 'Bob Test'),
      createStaff('s3', 'Charlie Test')
    ];

    const result = generateRosterEnhanced({
      system: '12h',
      versionId: 'test-v1',
      staff,
      requirementsByDay: {
        0: { D: 3, N: 2 },
        1: { D: 3, N: 2 },
        2: { D: 3, N: 2 },
        3: { D: 3, N: 2 },
        4: { D: 3, N: 2 },
        5: { D: 3, N: 2 },
        6: { D: 3, N: 2 }
      },
      startDate: '2025-10-13',
      allowSupervisorNights: false,
      includeNights: true,
      patternTokens: ['D', 'D', 'N', 'N', 'R', 'R']
    });

    expect(result.nightsGenerated).toBeGreaterThan(0);
    expect(result.assignments.some(a => a.shift_code === 'N')).toBe(true);
  });

  test('throws error when nights required but no eligible staff', () => {
    const dayOnlyStaff = [
      createStaff('s1', 'Day Only', ['Day', 'Early', 'Late'])
    ];

    expect(() => {
      generateRosterEnhanced({
        system: '12h',
        versionId: 'test-v1',
        staff: dayOnlyStaff,
        requirementsByDay: {
          0: { D: 1, N: 1 }
        },
        startDate: '2025-10-13',
        allowSupervisorNights: false,
        includeNights: true,
        patternTokens: ['D', 'N', 'R', 'R']
      });
    }).toThrow(/No eligible staff for Night shifts/);
  });

  test('night readiness check catches missing eligible staff', () => {
    const dayOnlyStaff = [
      createStaff('s1', 'Day Only', ['Day', 'Early', 'Late'])
    ];

    const readiness = checkNightReadiness({
      system: '12h',
      staff: dayOnlyStaff,
      allowSupervisorNights: false,
      patternTokens: ['D', 'N', 'R', 'R'],
      includeNights: true,
      requiredByDay: {
        0: { D: 1, N: 1 }
      }
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.issues.length).toBeGreaterThan(0);
    expect(readiness.issues.some(i => i.includes('eligible staff'))).toBe(true);
  });

  test('respects eligible_shifts constraint for nights', () => {
    const mixedStaff = [
      createStaff('s1', 'Night OK', ['Night']),
      createStaff('s2', 'Day Only', ['Day'])
    ];

    const result = generateRosterEnhanced({
      system: '12h',
      versionId: 'test-v1',
      staff: mixedStaff,
      requirementsByDay: {
        0: { D: 1, N: 1 }
      },
      startDate: '2025-10-13',
      allowSupervisorNights: false,
      includeNights: true,
      patternTokens: ['D', 'N', 'R', 'R']
    });

    // Only s1 should have night shifts
    const nightShifts = result.assignments.filter(a => a.shift_code === 'N');
    expect(nightShifts.every(a => a.staff_id === 's1')).toBe(true);
    
    // s2 should only have day shifts
    const s2Shifts = result.assignments.filter(a => a.staff_id === 's2');
    expect(s2Shifts.every(a => a.shift_code === 'D')).toBe(true);
  });

  test('supervisor nights work when enabled', () => {
    const supervisorStaff = [
      {
        ...createStaff('sup1', 'Supervisor One', ['Night']),
        role: 'Supervisor'
      }
    ];

    const result = generateRosterEnhanced({
      system: '12h',
      versionId: 'test-v1',
      staff: supervisorStaff as StaffMember[],
      requirementsByDay: {
        0: { D: 1, N: 1 }
      },
      startDate: '2025-10-13',
      allowSupervisorNights: true,
      includeNights: true,
      patternTokens: ['D', 'N', 'R', 'R']
    });

    expect(result.nightsGenerated).toBeGreaterThan(0);
  });

  test('supervisor nights blocked when disabled', () => {
    const supervisorOnly = [
      {
        ...createStaff('sup1', 'Supervisor One', ['Night']),
        role: 'Supervisor'
      }
    ];

    expect(() => {
      generateRosterEnhanced({
        system: '12h',
        versionId: 'test-v1',
        staff: supervisorOnly as StaffMember[],
        requirementsByDay: {
          0: { D: 1, N: 1 }
        },
        startDate: '2025-10-13',
        allowSupervisorNights: false,
        includeNights: true,
        patternTokens: ['D', 'N', 'R', 'R']
      });
    }).toThrow(/No eligible staff for Night shifts/);
  });
});
