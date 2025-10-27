/**
 * Distribution Targets Test Suite
 * Tests night and weekend distribution caps to ensure fair allocation
 */

import { describe, it, expect } from 'vitest';
import { generateCorrectiveRoster, DEFAULT_CORRECTIVE_POLICY } from '@/engine2/generators/correctiveRosterGenerator';

describe('Distribution Targets', () => {
  // Helper to create staff pool
  const createStaff = (count: number, nightEligibleAll: boolean = true) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `staff-${i}`,
      name: `Staff ${i}`,
      availability: {} as Record<string, boolean>,
      isNightEligible: nightEligibleAll || i < Math.floor(count / 2),
    }));
  };

  // Helper to mark all dates as available for all staff
  const markAllAvailable = (staff: any[], days: string[]) => {
    staff.forEach(s => {
      days.forEach(d => {
        s.availability[d] = true;
      });
    });
  };

  describe('Night Shift Distribution', () => {
    it('should not exceed maxNightsPerCycle cap for any staff', () => {
      // Setup: 28 days, 10 staff, 2 nights per day
      const days = Array.from({ length: 28 }, (_, i) => {
        const date = new Date(2024, 0, 1 + i);
        return date.toISOString().split('T')[0];
      });

      const staff = createStaff(10, true);
      markAllAvailable(staff, days);

      const requirements = days.reduce((acc, day) => {
        acc[day] = { N: 2 }; // 2 night shifts per day
        return acc;
      }, {} as any);

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          maxNightsPerCycle: 8,
          maxWeekendsPerCycle: 6,
        },
      });

      // Check distribution stats
      const { distributionStats } = result.diagnostics;
      
      // Verify no staff exceeds night cap
      Object.entries(distributionStats).forEach(([staffId, stats]) => {
        expect(stats.nights).toBeLessThanOrEqual(8);
        console.log(`${staffId}: ${stats.nights} nights, ${stats.weekendDays} weekends, ${stats.totalHours}h`);
      });

      // Verify nights are distributed (not all to one person)
      const nightCounts = Object.values(distributionStats).map(s => s.nights);
      const maxNights = Math.max(...nightCounts);
      const minNights = Math.min(...nightCounts);
      const variance = maxNights - minNights;
      
      console.log(`Night distribution variance: ${variance} (min: ${minNights}, max: ${maxNights})`);
      expect(variance).toBeLessThanOrEqual(4); // Reasonable spread
    });

    it('should spread nights evenly when cap allows', () => {
      // Setup: 14 days, 5 staff, 2 nights per day
      const days = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(2024, 0, 1 + i);
        return date.toISOString().split('T')[0];
      });

      const staff = createStaff(5, true);
      markAllAvailable(staff, days);

      const requirements = days.reduce((acc, day) => {
        acc[day] = { N: 2 }; // 2 nights per day = 28 total nights
        return acc;
      }, {} as any);

      // Cap of 8 nights means all staff can participate fairly
      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          maxNightsPerCycle: 8,
        },
      });

      const { distributionStats } = result.diagnostics;
      const nightCounts = Object.values(distributionStats).map(s => s.nights);
      
      // All staff should have similar night counts (28 nights / 5 staff ≈ 5-6 each)
      const avg = nightCounts.reduce((a, b) => a + b, 0) / nightCounts.length;
      console.log(`Average nights per staff: ${avg.toFixed(1)}`);
      
      nightCounts.forEach(count => {
        // Each staff should be within 2 of the average
        expect(Math.abs(count - avg)).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Weekend Distribution', () => {
    it('should not exceed maxWeekendsPerCycle cap for any staff', () => {
      // Setup: 4 weeks (28 days), including 8 weekend days
      const days = Array.from({ length: 28 }, (_, i) => {
        const date = new Date(2024, 0, 6 + i); // Start on Saturday
        return date.toISOString().split('T')[0];
      });

      const staff = createStaff(10, false);
      markAllAvailable(staff, days);

      // 2 shifts on each weekend day (early + late)
      const requirements = days.reduce((acc, day) => {
        const date = new Date(day);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        if (isWeekend) {
          acc[day] = { E: 2, L: 2 }; // 4 shifts on weekend days
        } else {
          acc[day] = { E: 1, L: 1 }; // 2 shifts on weekdays
        }
        return acc;
      }, {} as any);

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          maxWeekendsPerCycle: 6,
        },
        framework: '8h',
      });

      const { distributionStats } = result.diagnostics;
      
      // Verify no staff exceeds weekend cap
      Object.entries(distributionStats).forEach(([staffId, stats]) => {
        expect(stats.weekendDays).toBeLessThanOrEqual(6);
        console.log(`${staffId}: ${stats.weekendDays} weekend days, ${stats.totalHours}h`);
      });

      // Verify weekends are distributed
      const weekendCounts = Object.values(distributionStats).map(s => s.weekendDays);
      const maxWeekends = Math.max(...weekendCounts);
      const minWeekends = Math.min(...weekendCounts);
      const variance = maxWeekends - minWeekends;
      
      console.log(`Weekend distribution variance: ${variance} (min: ${minWeekends}, max: ${maxWeekends})`);
      expect(variance).toBeLessThanOrEqual(3); // Reasonable spread
    });
  });

  describe('Combined Distribution', () => {
    it('should balance both nights and weekends fairly', () => {
      // Setup: 28 days including nights and weekends
      const days = Array.from({ length: 28 }, (_, i) => {
        const date = new Date(2024, 0, 1 + i); // Start on Monday
        return date.toISOString().split('T')[0];
      });

      const staff = createStaff(8, true);
      markAllAvailable(staff, days);

      // Mix of weekday/weekend, day/night shifts
      const requirements = days.reduce((acc, day) => {
        const date = new Date(day);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        if (isWeekend) {
          acc[day] = { E: 1, L: 1, N: 2 }; // More coverage on weekends
        } else {
          acc[day] = { E: 1, L: 1, N: 1 }; // Standard weekday coverage
        }
        return acc;
      }, {} as any);

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          maxNightsPerCycle: 8,
          maxWeekendsPerCycle: 6,
          distributionPenalty: 0.5,
        },
        framework: '8h',
      });

      const { distributionStats } = result.diagnostics;
      
      // Verify caps respected
      Object.entries(distributionStats).forEach(([staffId, stats]) => {
        expect(stats.nights).toBeLessThanOrEqual(8);
        expect(stats.weekendDays).toBeLessThanOrEqual(6);
        console.log(`${staffId}: ${stats.nights}N, ${stats.weekendDays}W, ${stats.totalHours}h`);
      });

      // Verify reasonable fairness in hours
      const hoursArray = Object.values(distributionStats).map(s => s.totalHours);
      const maxHours = Math.max(...hoursArray);
      const minHours = Math.min(...hoursArray);
      const hoursVariance = maxHours - minHours;
      
      console.log(`Hours variance: ${hoursVariance}h (min: ${minHours}h, max: ${maxHours}h)`);
      expect(hoursVariance).toBeLessThanOrEqual(40); // Reasonable given constraints
    });

    it('should log distribution diagnostics', () => {
      const days = ['2024-01-01', '2024-01-02', '2024-01-03'];
      const staff = createStaff(3, true);
      markAllAvailable(staff, days);

      const requirements = {
        '2024-01-01': { N: 1 }, // Monday night
        '2024-01-02': { E: 1 }, // Tuesday early
        '2024-01-03': { L: 1 }, // Wednesday late
      };

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
        framework: '8h',
      });

      // Should have distribution stats for all staff
      expect(result.diagnostics.distributionStats).toBeDefined();
      expect(Object.keys(result.diagnostics.distributionStats).length).toBe(3);

      // Each staff should have their counts
      Object.values(result.diagnostics.distributionStats).forEach(stats => {
        expect(stats.nights).toBeGreaterThanOrEqual(0);
        expect(stats.weekendDays).toBeGreaterThanOrEqual(0);
        expect(stats.totalHours).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Tunable Distribution Penalty', () => {
    it('should respect higher distributionPenalty for stricter balance', () => {
      const days = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(2024, 0, 1 + i);
        return date.toISOString().split('T')[0];
      });

      const staff = createStaff(5, true);
      markAllAvailable(staff, days);

      const requirements = days.reduce((acc, day) => {
        acc[day] = { N: 2 }; // 2 nights per day
        return acc;
      }, {} as any);

      // Test with stricter penalty
      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          maxNightsPerCycle: 8,
          distributionPenalty: 1.0, // Higher penalty = stricter balance
        },
      });

      const nightCounts = Object.values(result.diagnostics.distributionStats).map(s => s.nights);
      const variance = Math.max(...nightCounts) - Math.min(...nightCounts);
      
      console.log(`With high penalty, night variance: ${variance}`);
      expect(variance).toBeLessThanOrEqual(3); // Very tight distribution
    });
  });
});
