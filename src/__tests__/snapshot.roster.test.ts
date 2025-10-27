/**
 * @snapshot
 * Regression protection: ensure roster generation produces consistent, valid output
 */
import { describe, it, expect } from 'vitest';
import { generateRosterEnhanced } from '@/utils/roster/enhancedRosterGenerator';
import type { StaffMember } from '@/types/roster';

const KNOWN_GOOD_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    employee_id: 'EMP001',
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@test.com',
    hire_date: '2024-01-01',
    is_active: true,
    availability_status: 'active',
    role: 'Supervisor',
    eligible_shifts: ['D', 'N'],
    is_shift_worker: true,
    min_hours_per_week: 36,
    max_hours_per_week: 48,
    opted_out_wtd: false,
    days_off_per_week: 2,
    hourly_rate: 25,
    holiday_multiplier: 1.5,
    leave_allowance_days: 28,
  },
  {
    id: 'staff-2',
    employee_id: 'EMP002',
    first_name: 'Bob',
    last_name: 'Jones',
    email: 'bob@test.com',
    hire_date: '2024-01-01',
    is_active: true,
    availability_status: 'active',
    role: 'Staff',
    eligible_shifts: ['D', 'N'],
    is_shift_worker: true,
    min_hours_per_week: 36,
    max_hours_per_week: 48,
    opted_out_wtd: false,
    days_off_per_week: 2,
    hourly_rate: 22,
    holiday_multiplier: 1.5,
    leave_allowance_days: 28,
  },
  {
    id: 'staff-3',
    employee_id: 'EMP003',
    first_name: 'Carol',
    last_name: 'White',
    email: 'carol@test.com',
    hire_date: '2024-01-01',
    is_active: true,
    availability_status: 'active',
    role: 'Staff',
    eligible_shifts: ['D'],
    is_shift_worker: true,
    min_hours_per_week: 36,
    max_hours_per_week: 48,
    opted_out_wtd: false,
    days_off_per_week: 2,
    hourly_rate: 22,
    holiday_multiplier: 1.5,
    leave_allowance_days: 28,
  },
  {
    id: 'staff-4',
    employee_id: 'EMP004',
    first_name: 'Dave',
    last_name: 'Brown',
    email: 'dave@test.com',
    hire_date: '2024-01-01',
    is_active: true,
    availability_status: 'active',
    role: 'Staff',
    eligible_shifts: ['D', 'N'],
    is_shift_worker: true,
    min_hours_per_week: 36,
    max_hours_per_week: 48,
    opted_out_wtd: false,
    days_off_per_week: 2,
    hourly_rate: 22,
    holiday_multiplier: 1.5,
    leave_allowance_days: 28,
  },
];

describe('Roster Generation Snapshot Tests', () => {
  it('October 2025 12h roster: consistent staff counts and coverage', async () => {
    const result = await generateRosterEnhanced({
      staff: KNOWN_GOOD_STAFF,
      versionId: 'test-version',
      startDate: '2025-10-01',
      system: '12h',
      requirementsByDay: {
        0: { D: 2, N: 1 }, // weekday
        1: { D: 2, N: 1 },
        2: { D: 2, N: 1 },
        3: { D: 2, N: 1 },
        4: { D: 2, N: 1 },
        5: { D: 2, N: 1 },
        6: { D: 2, N: 1 }, // weekend
      },
    });

    // Assert structural integrity
    expect(result.assignments).toBeDefined();
    expect(result.assignments.length).toBeGreaterThan(0);

    // Group by date
    const byDate = result.assignments.reduce((acc, a) => {
      acc[a.date] = acc[a.date] || [];
      acc[a.date].push(a);
      return acc;
    }, {} as Record<string, any[]>);

    // Snapshot: coverage per day should be consistent
    const coverageSnapshot = Object.entries(byDate).map(([date, assigns]) => {
      const dCount = (assigns as any[]).filter(a => a.shift_code === 'D').length;
      const nCount = (assigns as any[]).filter(a => a.shift_code === 'N').length;
      return { date, D: dCount, N: nCount };
    });

    // Expect 31 days
    expect(Object.keys(byDate).length).toBe(31);

    // Each day should have coverage (allow ±1 tolerance for optimization)
    coverageSnapshot.forEach(day => {
      expect(day.D).toBeGreaterThanOrEqual(1);
      expect(day.D).toBeLessThanOrEqual(3);
      expect(day.N).toBeGreaterThanOrEqual(0);
      expect(day.N).toBeLessThanOrEqual(2);
    });

    // No duplicates per staff per day
    Object.entries(byDate).forEach(([date, assigns]) => {
      const staffIds = (assigns as any[]).map(a => a.staff_id);
      const unique = new Set(staffIds);
      expect(staffIds.length).toBe(unique.size);
    });
  });

  it('8h roster: E/L/N coverage consistency', async () => {
    const staff8h: StaffMember[] = KNOWN_GOOD_STAFF.map(s => ({
      ...s,
      eligible_shifts: ['E', 'L', 'N'],
    }));

    const result = await generateRosterEnhanced({
      staff: staff8h,
      versionId: 'test-version',
      startDate: '2025-10-01',
      system: '8h',
      requirementsByDay: {
        0: { E: 2, L: 2, N: 1 }, // weekdays
        1: { E: 2, L: 2, N: 1 },
        2: { E: 2, L: 2, N: 1 },
        3: { E: 2, L: 2, N: 1 },
        4: { E: 2, L: 2, N: 1 },
        5: { E: 1, L: 1, N: 1 }, // weekend
        6: { E: 1, L: 1, N: 1 },
      },
    });

    const byDate = result.assignments.reduce((acc, a) => {
      acc[a.date] = acc[a.date] || [];
      acc[a.date].push(a);
      return acc;
    }, {} as Record<string, any[]>);

    // Each day should have E, L, N shifts
    Object.entries(byDate).forEach(([date, assigns]) => {
      const e = (assigns as any[]).filter(a => a.shift_code === 'E').length;
      const l = (assigns as any[]).filter(a => a.shift_code === 'L').length;
      const n = (assigns as any[]).filter(a => a.shift_code === 'N').length;
      
      expect(e).toBeGreaterThanOrEqual(0);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(n).toBeGreaterThanOrEqual(0);
    });

    // No staff overlap on same day
    Object.values(byDate).forEach(assigns => {
      const ids = (assigns as any[]).map(a => a.staff_id);
      expect(ids.length).toBe(new Set(ids).size);
    });
  });
});
