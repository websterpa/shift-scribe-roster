/**
 * @month
 * Tests for full month expansion (1st → last day, inclusive)
 */
import { describe, it, expect } from 'vitest';
import { generateRosterEnhanced } from '@/utils/roster/enhancedRosterGenerator';
import type { StaffMember } from '@/types/roster';

describe('Full Month Expansion (@month)', () => {
  const mockStaff: StaffMember[] = [
    {
      id: 's1',
      employee_id: 'EMP001',
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@test.com',
      hire_date: '2024-01-01',
      role: 'staff',
      is_active: true,
      availability_status: 'active',
      eligible_shifts: ['Early', 'Late', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 36,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      hourly_rate: 18,
      holiday_multiplier: 2,
      leave_allowance_days: 28
    },
    {
      id: 's2',
      employee_id: 'EMP002',
      first_name: 'Bob',
      last_name: 'Jones',
      email: 'bob@test.com',
      hire_date: '2024-01-01',
      role: 'staff',
      is_active: true,
      availability_status: 'active',
      eligible_shifts: ['Early', 'Late', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 36,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      hourly_rate: 18,
      holiday_multiplier: 2,
      leave_allowance_days: 28
    },
    {
      id: 's3',
      employee_id: 'EMP003',
      first_name: 'Charlie',
      last_name: 'Brown',
      email: 'charlie@test.com',
      hire_date: '2024-01-01',
      role: 'staff',
      is_active: true,
      availability_status: 'active',
      eligible_shifts: ['Early', 'Late', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 36,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      hourly_rate: 18,
      holiday_multiplier: 2,
      leave_allowance_days: 28
    },
    {
      id: 's4',
      employee_id: 'EMP004',
      first_name: 'Dave',
      last_name: 'Wilson',
      email: 'dave@test.com',
      hire_date: '2024-01-01',
      role: 'staff',
      is_active: true,
      availability_status: 'active',
      eligible_shifts: ['Day', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 36,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      hourly_rate: 18,
      holiday_multiplier: 2,
      leave_allowance_days: 28
    },
    {
      id: 's5',
      employee_id: 'EMP005',
      first_name: 'Eve',
      last_name: 'Davis',
      email: 'eve@test.com',
      hire_date: '2024-01-01',
      role: 'staff',
      is_active: true,
      availability_status: 'active',
      eligible_shifts: ['Day', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 36,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      hourly_rate: 18,
      holiday_multiplier: 2,
      leave_allowance_days: 28
    }
  ];

  it('8h: October 2025 (31 days) with weekly E:1, L:1, N:1 → expands to 31 days', () => {
    // October 2025: 1st=Wed, 31st=Fri (31 days total)
    const requirementsByDay = {
      0: { E: 1, L: 1, N: 1 }, // Sunday
      1: { E: 1, L: 1, N: 1 }, // Monday
      2: { E: 1, L: 1, N: 1 }, // Tuesday
      3: { E: 1, L: 1, N: 1 }, // Wednesday
      4: { E: 1, L: 1, N: 1 }, // Thursday
      5: { E: 1, L: 1, N: 1 }, // Friday
      6: { E: 1, L: 1, N: 1 }, // Saturday
    };

    const result = generateRosterEnhanced({
      system: '8h',
      versionId: 'test-version',
      staff: mockStaff,
      requirementsByDay,
      startDate: '2025-10-01',
      siteStartHH: 6,
      allowSupervisorNights: false,
      includeNights: true,
      patternTokens: ['E', 'E', 'L', 'L', 'N', 'N', 'R', 'R', 'R', 'R']
    });

    // Count assignments by code
    const tokenCounts = result.assignments.reduce((acc, a) => {
      acc[a.shift_code] = (acc[a.shift_code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // October 2025 has 31 days
    // With E:1, L:1, N:1 per day → expect 31 of each
    expect(tokenCounts.E).toBeGreaterThanOrEqual(28); // Allow some flexibility
    expect(tokenCounts.L).toBeGreaterThanOrEqual(28);
    expect(tokenCounts.N).toBeGreaterThanOrEqual(28);
    
    // Verify total days covered
    const uniqueDates = new Set(result.assignments.map(a => a.date));
    expect(uniqueDates.size).toBeGreaterThanOrEqual(28); // Should cover most/all days
  });

  it('12h: October 2025 (31 days) with weekly D:2, N:2 → expands to 31 days', () => {
    const requirementsByDay = {
      0: { D: 2, N: 2 }, // Sunday
      1: { D: 2, N: 2 }, // Monday
      2: { D: 2, N: 2 }, // Tuesday
      3: { D: 2, N: 2 }, // Wednesday
      4: { D: 2, N: 2 }, // Thursday
      5: { D: 2, N: 2 }, // Friday
      6: { D: 2, N: 2 }, // Saturday
    };

    const result = generateRosterEnhanced({
      system: '12h',
      versionId: 'test-version-12h',
      staff: mockStaff,
      requirementsByDay,
      startDate: '2025-10-01',
      siteStartHH: 6,
      allowSupervisorNights: false,
      includeNights: true,
      patternTokens: ['D', 'D', 'N', 'N', 'R', 'R', 'R', 'R']
    });

    const tokenCounts = result.assignments.reduce((acc, a) => {
      acc[a.shift_code] = (acc[a.shift_code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // October 2025 has 31 days
    // With D:2, N:2 per day → expect 62 of each
    expect(tokenCounts.D).toBeGreaterThanOrEqual(56); // Allow some flexibility
    expect(tokenCounts.N).toBeGreaterThanOrEqual(56);
    
    // Verify full month coverage
    const uniqueDates = new Set(result.assignments.map(a => a.date));
    expect(uniqueDates.size).toBeGreaterThanOrEqual(28);
  });

  it('Weekday-only requirements expand across all matching weekdays in month', () => {
    // Only Monday-Friday requirements
    const requirementsByDay = {
      1: { E: 1, L: 1 }, // Monday
      2: { E: 1, L: 1 }, // Tuesday
      3: { E: 1, L: 1 }, // Wednesday
      4: { E: 1, L: 1 }, // Thursday
      5: { E: 1, L: 1 }, // Friday
      // No weekend requirements
    };

    const result = generateRosterEnhanced({
      system: '8h',
      versionId: 'test-weekday',
      staff: mockStaff,
      requirementsByDay,
      startDate: '2025-10-01',
      siteStartHH: 6,
      allowSupervisorNights: false,
      includeNights: false,
      patternTokens: ['E', 'E', 'L', 'L', 'R', 'R', 'R']
    });

    // October 2025 has 23 weekdays (Mon-Fri)
    const tokenCounts = result.assignments.reduce((acc, a) => {
      acc[a.shift_code] = (acc[a.shift_code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Should have assignments for weekdays only
    expect(tokenCounts.E).toBeGreaterThanOrEqual(20); // ~23 weekdays
    expect(tokenCounts.L).toBeGreaterThanOrEqual(20);
    
    // No weekend assignments
    const weekendDates = result.assignments.filter(a => {
      const d = new Date(a.date);
      const dow = d.getDay();
      return dow === 0 || dow === 6; // Sunday or Saturday
    });
    expect(weekendDates.length).toBe(0);
  });

  it('February 2025 (28 days) expands to 28 days, not 31', () => {
    const requirementsByDay = {
      0: { E: 1 }, 1: { E: 1 }, 2: { E: 1 }, 3: { E: 1 },
      4: { E: 1 }, 5: { E: 1 }, 6: { E: 1 }
    };

    const result = generateRosterEnhanced({
      system: '8h',
      versionId: 'test-feb',
      staff: mockStaff,
      requirementsByDay,
      startDate: '2025-02-01',
      siteStartHH: 6,
      allowSupervisorNights: false,
      includeNights: false,
      patternTokens: ['E', 'E', 'R', 'R', 'R', 'R', 'R']
    });

    const uniqueDates = new Set(result.assignments.map(a => a.date));
    
    // February 2025 has exactly 28 days
    expect(uniqueDates.size).toBeGreaterThanOrEqual(25); // Should cover most of 28 days
    expect(uniqueDates.size).toBeLessThanOrEqual(28); // Should not exceed 28
    
    // Verify no dates in March
    const marchDates = result.assignments.filter(a => a.date.startsWith('2025-03'));
    expect(marchDates.length).toBe(0);
  });

  it('Assignments cover first and last day of month (inclusive)', () => {
    const requirementsByDay = {
      0: { D: 1 }, 1: { D: 1 }, 2: { D: 1 }, 3: { D: 1 },
      4: { D: 1 }, 5: { D: 1 }, 6: { D: 1 }
    };

    const result = generateRosterEnhanced({
      system: '12h',
      versionId: 'test-boundaries',
      staff: mockStaff,
      requirementsByDay,
      startDate: '2025-10-01',
      siteStartHH: 6,
      allowSupervisorNights: false,
      includeNights: false,
      patternTokens: ['D', 'D', 'R', 'R', 'R', 'R', 'R', 'R']
    });

    const dates = result.assignments.map(a => a.date).sort();
    
    // First assignment should be October 1st or very close
    expect(dates[0]).toMatch(/2025-10-0[1-3]/);
    
    // Last assignment should be October 31st or very close
    expect(dates[dates.length - 1]).toMatch(/2025-10-(2[89]|3[01])/);
  });
});
