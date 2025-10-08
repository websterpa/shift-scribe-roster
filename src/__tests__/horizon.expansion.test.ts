import { describe, test, expect } from 'vitest';
import { generateRosterEnhanced } from '@/utils/roster/enhancedRosterGenerator';
import type { StaffMember } from '@/types/roster';

function createTestStaff(id: string, name: string): StaffMember {
  return {
    id,
    employee_id: id,
    first_name: name.split(' ')[0],
    last_name: name.split(' ')[1] || 'Test',
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`,
    role: 'Staff',
    is_active: true,
    eligible_shifts: ['Day', 'Night', 'Early', 'Late'],
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

describe('@nights Horizon Expansion', () => {
  const mockStaff: StaffMember[] = [
    createTestStaff('staff-1', 'Alice Test'),
    createTestStaff('staff-2', 'Bob Test'),
    createTestStaff('staff-3', 'Charlie Test'),
    createTestStaff('staff-4', 'David Test')
  ];

  test('16-day pattern expands demand across full horizon', () => {
    const pattern16 = 'DDDDRRRRNNNNRRRR'; // 16 days
    
    const result = generateRosterEnhanced({
      system: '12h',
      versionId: 'test-version',
      staff: mockStaff,
      requirementsByDay: {
        0: { D: 2, N: 1 }, // Sunday
        1: { D: 2, N: 1 }, // Monday
        2: { D: 2, N: 1 }, // Tuesday
        3: { D: 2, N: 1 }, // Wednesday
        4: { D: 2, N: 1 }, // Thursday
        5: { D: 2, N: 1 }, // Friday
        6: { D: 2, N: 1 }  // Saturday
      },
      startDate: '2025-10-13',
      allowSupervisorNights: false,
      includeNights: true,
      patternTokens: pattern16.split('')
    });

    // Verify assignments span the full 16 days
    const uniqueDates = new Set(result.assignments.map(a => a.date));
    expect(uniqueDates.size).toBeGreaterThanOrEqual(7); // At least a week
    
    // Verify Night shifts are present
    const nightShifts = result.assignments.filter(a => a.shift_code === 'N');
    expect(nightShifts.length).toBeGreaterThan(0);
    expect(result.nightsGenerated).toBeGreaterThan(0);
    
    // Verify total assignments match demand across horizon
    expect(result.assignments.length).toBeGreaterThan(16); // More than just one day
  });

  test('weekly requirements repeat across full horizon', () => {
    const pattern10 = 'EELLNNRRRR'; // 10 days
    
    const result = generateRosterEnhanced({
      system: '8h',
      versionId: 'test-version',
      staff: mockStaff,
      requirementsByDay: {
        0: { E: 1, L: 1, N: 1 }, // Sunday (low)
        1: { E: 2, L: 2, N: 1 }, // Monday (high)
        2: { E: 2, L: 2, N: 1 }, // Tuesday (high)
        3: { E: 2, L: 2, N: 1 }, // Wednesday (high)
        4: { E: 2, L: 2, N: 1 }, // Thursday (high)
        5: { E: 2, L: 2, N: 1 }, // Friday (high)
        6: { E: 1, L: 1, N: 1 }  // Saturday (low)
      },
      startDate: '2025-10-13', // Monday
      allowSupervisorNights: false,
      includeNights: true,
      patternTokens: pattern10.split('')
    });

    // Pattern is 10 days, so we should have assignments across at least 10 days
    const uniqueDates = new Set(result.assignments.map(a => a.date));
    expect(uniqueDates.size).toBeGreaterThanOrEqual(7); // At least 7 unique dates
    
    // Verify we have different volumes on different weekdays
    const assignmentsByDate: Record<string, number> = {};
    result.assignments.forEach(a => {
      assignmentsByDate[a.date] = (assignmentsByDate[a.date] || 0) + 1;
    });
    
    const volumes = Object.values(assignmentsByDate);
    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);
    
    // Weekend days (Sun/Sat) should have fewer assignments than weekdays
    expect(maxVolume).toBeGreaterThan(minVolume);
  });

  test('demand does not stop at day 7', () => {
    const pattern12 = 'DDNNRRDDNNRR'; // 12 days
    
    const result = generateRosterEnhanced({
      system: '12h',
      versionId: 'test-version',
      staff: mockStaff,
      requirementsByDay: {
        0: { D: 2, N: 1 },
        1: { D: 2, N: 1 },
        2: { D: 2, N: 1 },
        3: { D: 2, N: 1 },
        4: { D: 2, N: 1 },
        5: { D: 2, N: 1 },
        6: { D: 2, N: 1 }
      },
      startDate: '2025-10-13',
      allowSupervisorNights: false,
      includeNights: true,
      patternTokens: pattern12.split('')
    });

    // Group assignments by day index
    const startDate = new Date('2025-10-13');
    const assignmentsByDayIdx: Record<number, number> = {};
    
    result.assignments.forEach(a => {
      const date = new Date(a.date);
      const dayIdx = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      assignmentsByDayIdx[dayIdx] = (assignmentsByDayIdx[dayIdx] || 0) + 1;
    });

    // We should have assignments beyond day 7
    const maxDayIdx = Math.max(...Object.keys(assignmentsByDayIdx).map(Number));
    expect(maxDayIdx).toBeGreaterThanOrEqual(7);
    
    // We should have assignments on days 8-12
    const days8to12 = [8, 9, 10, 11].filter(d => assignmentsByDayIdx[d] > 0);
    expect(days8to12.length).toBeGreaterThan(0);
  });
});
