import { describe, test, expect, beforeEach } from 'vitest';
import { generateRosterEnhanced } from '@/utils/roster/enhancedRosterGenerator';
import type { StaffMember } from '@/types/roster';

// Helper to create test staff with all required fields
function createTestStaff(
  id: string, 
  name: string, 
  role: string, 
  eligibleShifts: string[] = ['Early', 'Late', 'Night']
): StaffMember {
  return {
    id,
    employee_id: id,
    first_name: name.split(' ')[0],
    last_name: name.split(' ')[1] || 'Tester',
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`,
    role,
    is_active: true,
    eligible_shifts: eligibleShifts,
    hourly_rate: role === 'Supervisor' ? 24 : 18,
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

describe('@nights Enhanced Generator', () => {
  let mockStaff: StaffMember[];

  beforeEach(() => {
    mockStaff = [
      createTestStaff('staff-1', 'Alice Smith', 'Staff'),
      createTestStaff('staff-2', 'Bob Jones', 'Staff'),
      createTestStaff('staff-3', 'Charlie Brown', 'Staff')
    ];
  });

  test('generates Night shifts when N demand exists (8h system)', () => {
    const result = generateRosterEnhanced({
      system: '8h',
      versionId: 'test-version',
      staff: mockStaff,
      requirementsByDay: {
        0: { E: 1, L: 1, N: 2 }, // Sunday
        1: { E: 1, L: 1, N: 2 }  // Monday
      },
      startDate: '2025-10-13', // Monday
      allowSupervisorNights: false,
      includeNights: true,
      patternTokens: ['E', 'E', 'L', 'L', 'N', 'N', 'R', 'R', 'E', 'E', 'L', 'L', 'N', 'N', 'R', 'R'] // 16-day pattern
    });

    expect(result.nightsGenerated).toBeGreaterThan(0);
    expect(result.assignments.some(a => a.shift_code === 'N')).toBe(true);
    
    const nightShifts = result.assignments.filter(a => a.shift_code === 'N');
    expect(nightShifts.length).toBeGreaterThanOrEqual(4); // At least 2 days × 2 weeks worth
  });

  test('generates Night shifts when N demand exists (12h system)', () => {
    const result = generateRosterEnhanced({
      system: '12h',
      versionId: 'test-version',
      staff: mockStaff,
      requirementsByDay: {
        0: { D: 3, N: 2 },
        1: { D: 3, N: 2 }
      },
      startDate: '2025-10-13',
      allowSupervisorNights: false,
      includeNights: true,
      patternTokens: ['D', 'D', 'N', 'N', 'R', 'R']
    });

    expect(result.nightsGenerated).toBeGreaterThan(0);
    expect(result.assignments.some(a => a.shift_code === 'N')).toBe(true);
  });

  test('throws error when nights expected but no eligible staff', () => {
    const supervisorOnly: StaffMember[] = [
      createTestStaff('sup-1', 'Supervisor One', 'Supervisor', ['Day'])
    ];

    expect(() => {
      generateRosterEnhanced({
        system: '8h',
        versionId: 'test-version',
        staff: supervisorOnly,
        requirementsByDay: {
          0: { E: 1, L: 1, N: 2 }
        },
        startDate: '2025-10-13',
        allowSupervisorNights: false,
        includeNights: true
      });
    }).toThrow(/No eligible staff for Night shifts/);
  });

  test('allows supervisor nights when enabled', () => {
    const mixedStaff: StaffMember[] = [
      createTestStaff('sup-1', 'Supervisor One', 'Supervisor', ['Day', 'Night'])
    ];

    const result = generateRosterEnhanced({
      system: '12h',
      versionId: 'test-version',
      staff: mixedStaff,
      requirementsByDay: {
        0: { D: 1, N: 1 }
      },
      startDate: '2025-10-13',
      allowSupervisorNights: true,
      includeNights: true
    });

    expect(result.nightsGenerated).toBeGreaterThan(0);
  });

  test('respects eligible_shifts constraints', () => {
    const restrictedStaff: StaffMember[] = [
      createTestStaff('staff-1', 'Day Only', 'Staff', ['Day']) // No Night
    ];

    expect(() => {
      generateRosterEnhanced({
        system: '12h',
        versionId: 'test-version',
        staff: restrictedStaff,
        requirementsByDay: {
          0: { D: 1, N: 1 }
        },
        startDate: '2025-10-13',
        allowSupervisorNights: false,
        includeNights: true
      });
    }).toThrow(/No available staff for N shift/);
  });
});
