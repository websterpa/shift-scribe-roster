import { describe, it, expect } from 'vitest';
import { 
  generateCorrectiveRoster, 
  CorrectiveStaffMember,
  CorrectiveInput,
  DEFAULT_CORRECTIVE_POLICY,
} from '../engine2/generators/correctiveRosterGenerator';
import type { ShiftCode } from '../utils/constraints';

/**
 * Guardrail Tests for Fairness and Rest Compliance
 * 
 * Purpose: Catch regressions where:
 * - Only a small subset of eligible staff are used
 * - Rest rules are violated
 * - Rotation/fairness degrades
 */

describe('Roster Fairness and Rest Guardrails', () => {
  // Helper: Create deterministic staff pool
  const createStaffPool = (count: number): CorrectiveStaffMember[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `staff-${i + 1}`,
      name: `Staff ${i + 1}`,
      availability: {}, // All days available by default
      isNightEligible: true,
    }));
  };

  // Helper: Check unique staff usage from roster structure
  const countUniqueStaffUsed = (roster: Record<string, Record<string, ShiftCode>>): number => {
    return Object.keys(roster).length;
  };

  // Helper: Check max consecutive days from roster
  const findMaxConsecutiveDays = (
    roster: Record<string, Record<string, ShiftCode>>,
    staffId: string,
    dates: string[]
  ): number => {
    if (!roster[staffId]) return 0;
    
    let maxConsec = 0;
    let currentConsec = 0;

    for (const date of dates.sort()) {
      const shift = roster[staffId][date];
      if (shift && shift !== 'R' && shift !== 'A/L') {
        currentConsec++;
        maxConsec = Math.max(maxConsec, currentConsec);
      } else {
        currentConsec = 0;
      }
    }

    return maxConsec;
  };

  // Helper: Calculate night distribution variance from diagnostics
  const calculateNightVariance = (
    distributionStats: Record<string, { nights: number; weekendDays: number; totalHours: number }>
  ): number => {
    const nightCounts = Object.values(distributionStats).map(s => s.nights);
    
    if (nightCounts.length === 0) return 0;
    
    const avg = nightCounts.reduce((sum, c) => sum + c, 0) / nightCounts.length;
    const variance = nightCounts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / nightCounts.length;
    return variance;
  };

  // Helper: Check rest hours between consecutive shifts from roster
  const checkMinRestHours = (
    roster: Record<string, Record<string, ShiftCode>>,
    staffId: string,
    dates: string[],
    minRestHours: number
  ): boolean => {
    if (!roster[staffId]) return true;
    
    const shiftEndTimes: Record<string, number> = {
      'E': 15, // Early ends at 15:00
      'L': 23, // Late ends at 23:00
      'D': 19, // Day ends at 19:00
      'N': 7,  // Night ends at 07:00 next day
    };

    const shiftStartTimes: Record<string, number> = {
      'E': 7,  // Early starts at 07:00
      'L': 15, // Late starts at 15:00
      'D': 11, // Day starts at 11:00
      'N': 23, // Night starts at 23:00
    };

    const sortedDates = dates.sort();
    
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const currentShift = roster[staffId][sortedDates[i]];
      const nextShift = roster[staffId][sortedDates[i + 1]];

      if (!currentShift || !nextShift || 
          currentShift === 'R' || currentShift === 'A/L' ||
          nextShift === 'R' || nextShift === 'A/L') {
        continue;
      }

      const endTime = shiftEndTimes[currentShift as keyof typeof shiftEndTimes];
      const startTime = shiftStartTimes[nextShift as keyof typeof shiftStartTimes];

      if (!endTime || !startTime) continue;

      let restHours = 0;
      if (currentShift === 'N') {
        // Night ends next morning at 07:00
        restHours = startTime >= 7 ? startTime - 7 : 24 - 7 + startTime;
      } else {
        // Normal shift
        restHours = startTime > endTime ? startTime - endTime : 24 - endTime + startTime;
      }

      if (restHours < minRestHours) {
        console.log(`Rest violation for ${staffId}: ${currentShift} -> ${nextShift}, only ${restHours}h rest`);
        return false;
      }
    }

    return true;
  };

  it('should use at least 60% of eligible staff in a 7-day schedule (20 staff available)', () => {
    console.log('✓ Fairness Test: Staff utilization breadth');
    
    const staff = createStaffPool(20);
    const startDate = new Date('2025-01-06'); // Monday
    const dates: string[] = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const requirements: Record<string, { E?: number; L?: number; N?: number; D?: number }> = {};
    dates.forEach(date => {
      requirements[date] = { E: 2, L: 2, N: 1 };
    });

    const input: CorrectiveInput = {
      days: dates,
      staff,
      requirements,
      policy: {
        ...DEFAULT_CORRECTIVE_POLICY,
        maxConsecDays: 6,
        minGapHoursBetweenShifts: 11,
        maxNightsPerCycle: 3,
        maxWeekendsPerCycle: 2,
        distributionPenalty: 500,
      },
      framework: '8h',
    };

    const result = generateCorrectiveRoster(input);
    const uniqueStaffUsed = countUniqueStaffUsed(result.roster);
    
    console.log(`  → Unique staff used: ${uniqueStaffUsed}/20`);
    expect(uniqueStaffUsed).toBeGreaterThanOrEqual(12); // At least 60%
  });

  it('should enforce MAX_CONSECUTIVE_DAYS across all staff', () => {
    console.log('✓ Rest Test: Max consecutive days enforcement');
    
    const staff = createStaffPool(10);
    const startDate = new Date('2025-01-06');
    const dates: string[] = [];
    
    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const requirements: Record<string, { E?: number; L?: number; N?: number; D?: number }> = {};
    dates.forEach(date => {
      requirements[date] = { E: 2 };
    });

    const MAX_CONSECUTIVE = 5;
    const input: CorrectiveInput = {
      days: dates,
      staff,
      requirements,
      policy: {
        ...DEFAULT_CORRECTIVE_POLICY,
        maxConsecDays: MAX_CONSECUTIVE,
        minGapHoursBetweenShifts: 11,
        maxNightsPerCycle: 5,
        maxWeekendsPerCycle: 3,
        distributionPenalty: 300,
      },
      framework: '8h',
    };

    const result = generateCorrectiveRoster(input);

    let violations = 0;
    for (const member of staff) {
      const maxConsec = findMaxConsecutiveDays(result.roster, member.id, dates);
      if (maxConsec > MAX_CONSECUTIVE) {
        console.log(`  ✗ ${member.id} worked ${maxConsec} consecutive days (max: ${MAX_CONSECUTIVE})`);
        violations++;
      }
    }

    expect(violations).toBe(0);
    console.log(`  → All staff respect ${MAX_CONSECUTIVE}-day limit`);
  });

  it('should respect minimum rest hours between consecutive shifts', () => {
    console.log('✓ Rest Test: Minimum rest hours between shifts');
    
    const staff = createStaffPool(8);
    const startDate = new Date('2025-01-06');
    const dates: string[] = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const requirements: Record<string, { E?: number; L?: number; N?: number; D?: number }> = {};
    dates.forEach(date => {
      requirements[date] = { E: 1, L: 1, N: 1 };
    });

    const MIN_REST_HOURS = 11;
    const input: CorrectiveInput = {
      days: dates,
      staff,
      requirements,
      policy: {
        ...DEFAULT_CORRECTIVE_POLICY,
        maxConsecDays: 6,
        minGapHoursBetweenShifts: MIN_REST_HOURS,
        maxNightsPerCycle: 3,
        maxWeekendsPerCycle: 2,
        distributionPenalty: 300,
      },
      framework: '8h',
    };

    const result = generateCorrectiveRoster(input);

    let violations = 0;
    for (const member of staff) {
      const hasViolation = !checkMinRestHours(result.roster, member.id, dates, MIN_REST_HOURS);
      if (hasViolation) {
        violations++;
      }
    }

    expect(violations).toBe(0);
    console.log(`  → All staff have ${MIN_REST_HOURS}h minimum rest`);
  });

  it('should distribute nights with low variance when demand is high', () => {
    console.log('✓ Fairness Test: Night shift distribution');
    
    const staff = createStaffPool(15);
    const startDate = new Date('2025-01-06');
    const dates: string[] = [];
    
    for (let i = 0; i < 28; i++) { // 4 weeks
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const requirements: Record<string, { E?: number; L?: number; N?: number; D?: number }> = {};
    dates.forEach(date => {
      requirements[date] = { E: 2, N: 2 }; // 2 nights per day = 56 night shifts total
    });

    const input: CorrectiveInput = {
      days: dates,
      staff,
      requirements,
      policy: {
        ...DEFAULT_CORRECTIVE_POLICY,
        maxConsecDays: 6,
        minGapHoursBetweenShifts: 11,
        maxNightsPerCycle: 6,
        maxWeekendsPerCycle: 3,
        distributionPenalty: 800, // High penalty for better distribution
      },
      framework: '8h',
    };

    const result = generateCorrectiveRoster(input);
    const variance = calculateNightVariance(result.diagnostics.distributionStats);
    
    console.log(`  → Night variance: ${variance.toFixed(2)} (lower is better)`);
    // With 56 night shifts across 15 staff, avg ~3.7 per person
    // Variance should be reasonably low (< 4.0 means std dev < 2)
    expect(variance).toBeLessThan(4.0);
  });

  it('should catch regression: use diverse staff, not just first 5', () => {
    console.log('✓ Regression Guard: Diverse staff usage');
    
    const staff = createStaffPool(25);
    const startDate = new Date('2025-01-06');
    const dates: string[] = [];
    
    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const requirements: Record<string, { E?: number; L?: number; N?: number; D?: number }> = {};
    dates.forEach(date => {
      requirements[date] = { E: 3, L: 3 };
    });

    const input: CorrectiveInput = {
      days: dates,
      staff,
      requirements,
      policy: {
        ...DEFAULT_CORRECTIVE_POLICY,
        maxConsecDays: 5,
        minGapHoursBetweenShifts: 11,
        maxNightsPerCycle: 4,
        maxWeekendsPerCycle: 3,
        distributionPenalty: 600,
      },
      framework: '8h',
    };

    const result = generateCorrectiveRoster(input);
    const uniqueStaffUsed = countUniqueStaffUsed(result.roster);
    
    console.log(`  → Staff used: ${uniqueStaffUsed}/25`);
    // With 14 days × 6 shifts/day = 84 shifts, we expect broad usage
    expect(uniqueStaffUsed).toBeGreaterThan(10); // Not just first 5-10 staff
  });
});
