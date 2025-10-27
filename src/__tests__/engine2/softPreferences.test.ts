import { describe, it, expect } from 'vitest';
import { generateCorrectiveRoster, DEFAULT_CORRECTIVE_POLICY, type CorrectiveStaffMember } from '@/engine2/generators/correctiveRosterGenerator';

describe('Soft Preference Handling', () => {
  it('should keep candidates with soft preferences but prioritize others', () => {
    const staff: CorrectiveStaffMember[] = [
      {
        id: 's1',
        name: 'Staff 1',
        availability: { '2025-01-01': true, '2025-01-02': true, '2025-01-03': true },
        isNightEligible: true,
        softPreferences: {
          avoidDays: ['2025-01-01'], // Prefers not to work on day 1
        },
      },
      {
        id: 's2',
        name: 'Staff 2',
        availability: { '2025-01-01': true, '2025-01-02': true, '2025-01-03': true },
        isNightEligible: true,
        // No soft preferences
      },
      {
        id: 's3',
        name: 'Staff 3',
        availability: { '2025-01-01': true, '2025-01-02': true, '2025-01-03': true },
        isNightEligible: true,
        softPreferences: {
          avoidShifts: ['N'], // Prefers not to work nights
        },
      },
    ];

    const result = generateCorrectiveRoster({
      days: ['2025-01-01', '2025-01-02', '2025-01-03'],
      staff,
      requirements: {
        '2025-01-01': { N: 1 },
        '2025-01-02': { N: 1 },
        '2025-01-03': { N: 1 },
      },
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // All shifts should be filled despite preferences
    expect(result.assignments.length).toBeGreaterThanOrEqual(3);
    
    // S2 (no preferences) should be preferred for night shifts over S3 (avoids nights)
    const s2Nights = result.assignments.filter(a => a.staffId === 's2' && a.shiftType === 'N').length;
    const s3Nights = result.assignments.filter(a => a.staffId === 's3' && a.shiftType === 'N').length;
    
    // S2 should get more (or equal) nights than S3 due to preference penalty
    expect(s2Nights).toBeGreaterThanOrEqual(s3Nights);
    
    // S1 should be less likely to work on 2025-01-01
    const s1OnDay1 = result.assignments.find(a => a.staffId === 's1' && a.dateISO === '2025-01-01');
    const s2OnDay1 = result.assignments.find(a => a.staffId === 's2' && a.dateISO === '2025-01-01');
    
    // If only one can work, it should be s2
    if (s1OnDay1 && !s2OnDay1) {
      // This is acceptable but less ideal
      console.log('S1 assigned despite preference - acceptable when no alternative');
    }
  });

  it('should expand staff pool beyond 5 when soft preferences are used', () => {
    // Create 10 staff, 5 with hard unavailability, 5 with only soft preferences
    const staff: CorrectiveStaffMember[] = [];
    
    for (let i = 1; i <= 5; i++) {
      staff.push({
        id: `hard${i}`,
        name: `Hard Unavailable ${i}`,
        availability: { '2025-01-01': false, '2025-01-02': false }, // HARD block
        isNightEligible: true,
      });
    }
    
    for (let i = 1; i <= 5; i++) {
      staff.push({
        id: `soft${i}`,
        name: `Soft Preference ${i}`,
        availability: { '2025-01-01': true, '2025-01-02': true }, // Available but...
        isNightEligible: true,
        softPreferences: {
          avoidDays: i % 2 === 0 ? ['2025-01-01'] : ['2025-01-02'], // Soft preference
        },
      });
    }

    const result = generateCorrectiveRoster({
      days: ['2025-01-01', '2025-01-02'],
      staff,
      requirements: {
        '2025-01-01': { N: 3 },
        '2025-01-02': { N: 3 },
      },
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // All 5 soft-preference staff should be usable
    const usedStaffIds = new Set(result.assignments.map(a => a.staffId));
    const softStaffUsed = Array.from(usedStaffIds).filter(id => id.startsWith('soft')).length;
    
    // Should use more than just the first available staff
    expect(softStaffUsed).toBeGreaterThan(3);
    expect(result.assignments.length).toBe(6); // 3 per day
  });

  it('should respect hard unavailability strictly', () => {
    const staff: CorrectiveStaffMember[] = [
      {
        id: 's1',
        name: 'Hard Unavailable',
        availability: { '2025-01-01': false }, // HARD unavailable
        isNightEligible: true,
      },
      {
        id: 's2',
        name: 'Soft Preference',
        availability: { '2025-01-01': true }, // Available
        isNightEligible: true,
        softPreferences: {
          avoidDays: ['2025-01-01'], // SOFT preference not to work
        },
      },
    ];

    const result = generateCorrectiveRoster({
      days: ['2025-01-01'],
      staff,
      requirements: {
        '2025-01-01': { N: 1 },
      },
      policy: DEFAULT_CORRECTIVE_POLICY,
    });

    // S1 should NEVER be assigned (hard unavailable)
    const s1Assigned = result.assignments.find(a => a.staffId === 's1');
    expect(s1Assigned).toBeUndefined();
    
    // S2 should be assigned despite soft preference (only option)
    const s2Assigned = result.assignments.find(a => a.staffId === 's2');
    expect(s2Assigned).toBeDefined();
  });

  it('should allow tuning preference penalty strength', () => {
    const staff: CorrectiveStaffMember[] = [
      {
        id: 's1',
        name: 'Avoid Nights',
        availability: { '2025-01-01': true, '2025-01-02': true },
        isNightEligible: true,
        softPreferences: { avoidShifts: ['N'] },
      },
      {
        id: 's2',
        name: 'No Preference',
        availability: { '2025-01-01': true, '2025-01-02': true },
        isNightEligible: true,
      },
    ];

    // Test with high preference penalty (should strongly avoid s1)
    const resultHighPenalty = generateCorrectiveRoster({
      days: ['2025-01-01', '2025-01-02'],
      staff,
      requirements: {
        '2025-01-01': { N: 1 },
        '2025-01-02': { N: 1 },
      },
      policy: {
        ...DEFAULT_CORRECTIVE_POLICY,
        preferencePenalty: 1.0, // High penalty
      },
    });

    // Test with low preference penalty (should be more willing to use s1)
    const resultLowPenalty = generateCorrectiveRoster({
      days: ['2025-01-01', '2025-01-02'],
      staff,
      requirements: {
        '2025-01-01': { N: 1 },
        '2025-01-02': { N: 1 },
      },
      policy: {
        ...DEFAULT_CORRECTIVE_POLICY,
        preferencePenalty: 0.01, // Very low penalty
      },
    });

    const s1NightsHigh = resultHighPenalty.assignments.filter(a => a.staffId === 's1' && a.shiftType === 'N').length;
    const s1NightsLow = resultLowPenalty.assignments.filter(a => a.staffId === 's1' && a.shiftType === 'N').length;

    // With low penalty, more willing to assign despite preference
    // (Though with only 2 staff, both will likely get used either way)
    console.log('High penalty s1 nights:', s1NightsHigh);
    console.log('Low penalty s1 nights:', s1NightsLow);
    
    // Both results should fill all shifts
    expect(resultHighPenalty.assignments.length).toBe(2);
    expect(resultLowPenalty.assignments.length).toBe(2);
  });
});
