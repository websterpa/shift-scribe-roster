import { describe, it, expect } from 'vitest';
import { generateCorrectiveRoster, CorrectiveStaffMember, CoverageRequirements, DEFAULT_CORRECTIVE_POLICY } from '../../engine2/generators/correctiveRosterGenerator';
import { DEFAULT_SHIFT_TIMES } from '../../engine2/constraints/wtdRules';

describe('Corrective Generator - Rest Constraints', () => {
  
  // Helper to create staff
  const createStaff = (count: number): CorrectiveStaffMember[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `S${i + 1}`,
      name: `Staff ${i + 1}`,
      availability: {},
      isNightEligible: i % 2 === 0, // Half eligible for nights
    }));
  };

  // Helper to set availability for all staff on all days
  const setAllAvailable = (staff: CorrectiveStaffMember[], days: string[]) => {
    staff.forEach(s => {
      days.forEach(d => {
        s.availability[d] = true;
      });
    });
  };

  describe('MIN_REST_HOURS enforcement', () => {
    it('prevents illegal L->E transitions (< 11h rest)', () => {
      const staff = createStaff(3);
      const days = ['2025-01-01', '2025-01-02', '2025-01-03'];
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {
        '2025-01-01': { L: 1 },
        '2025-01-02': { E: 1 }, // Would violate if same staff
        '2025-01-03': { L: 1 },
      };

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
      });

      // Check that staff assigned to L on day 1 is NOT assigned to E on day 2
      const day1Late = result.assignments.find(a => a.dateISO === '2025-01-01' && a.shiftType === 'L');
      const day2Early = result.assignments.find(a => a.dateISO === '2025-01-02' && a.shiftType === 'E');

      if (day1Late && day2Early) {
        expect(day1Late.staffId).not.toBe(day2Early.staffId);
      }
    });

    it('prevents illegal N->E transitions (< 11h rest)', () => {
      const staff = createStaff(4);
      const days = ['2025-01-01', '2025-01-02'];
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {
        '2025-01-01': { N: 1 },
        '2025-01-02': { E: 1 }, // Would violate if same staff
      };

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
      });

      const day1Night = result.assignments.find(a => a.dateISO === '2025-01-01' && a.shiftType === 'N');
      const day2Early = result.assignments.find(a => a.dateISO === '2025-01-02' && a.shiftType === 'E');

      if (day1Night && day2Early) {
        expect(day1Night.staffId).not.toBe(day2Early.staffId);
      }
    });

    it('allows valid E->E transitions (24h rest)', () => {
      const staff = createStaff(2);
      const days = ['2025-01-01', '2025-01-02'];
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {
        '2025-01-01': { E: 1 },
        '2025-01-02': { E: 1 },
      };

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
      });

      // Same staff CAN do E->E (enough rest)
      expect(result.assignments.length).toBe(2);
    });
  });

  describe('MAX_CONSECUTIVE_DAYS enforcement', () => {
    it('enforces rest after 6 consecutive working days', () => {
      const staff = createStaff(3);
      const days = Array.from({ length: 8 }, (_, i) => 
        `2025-01-${String(i + 1).padStart(2, '0')}`
      );
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {};
      days.forEach(d => {
        requirements[d] = { E: 1 };
      });

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          maxConsecDays: 6,
        },
      });

      // Check that no staff member works more than 6 consecutive days
      for (const staffMember of staff) {
        let consecDays = 0;
        let maxConsecDays = 0;

        for (const day of days) {
          const shift = result.roster[staffMember.id]?.[day];
          if (shift && shift !== 'R') {
            consecDays++;
            maxConsecDays = Math.max(maxConsecDays, consecDays);
          } else {
            consecDays = 0;
          }
        }

        expect(maxConsecDays).toBeLessThanOrEqual(6);
      }
    });

    it('inserts REST days when consecutive limit violated', () => {
      const staff = createStaff(2);
      const days = Array.from({ length: 10 }, (_, i) => 
        `2025-01-${String(i + 1).padStart(2, '0')}`
      );
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {};
      days.slice(0, 8).forEach(d => {
        requirements[d] = { E: 1 };
      });

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          maxConsecDays: 6,
          minDaysOffAfterBlock: 2,
        },
      });

      // Verify at least one staff member has REST days inserted
      let restDaysFound = false;
      for (const staffMember of staff) {
        for (const day of days) {
          if (result.roster[staffMember.id]?.[day] === 'R') {
            restDaysFound = true;
            break;
          }
        }
      }

      expect(restDaysFound).toBe(true);
    });
  });

  describe('MAX_CONSECUTIVE_NIGHTS enforcement', () => {
    it('enforces rest after consecutive night shifts', () => {
      const staff = createStaff(4);
      const days = Array.from({ length: 6 }, (_, i) => 
        `2025-01-${String(i + 1).padStart(2, '0')}`
      );
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {};
      days.forEach(d => {
        requirements[d] = { N: 1 };
      });

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          maxConsecNights: 3,
          preferRestAfterNights: true,
        },
      });

      // Check that no night-eligible staff works more than 3 consecutive nights
      for (const staffMember of staff.filter(s => s.isNightEligible)) {
        let consecNights = 0;
        let maxConsecNights = 0;

        for (const day of days) {
          const shift = result.roster[staffMember.id]?.[day];
          if (shift === 'N') {
            consecNights++;
            maxConsecNights = Math.max(maxConsecNights, consecNights);
          } else {
            consecNights = 0;
          }
        }

        expect(maxConsecNights).toBeLessThanOrEqual(3);
      }
    });

    it('inserts REST after night block when policy enabled', () => {
      const staff = createStaff(3);
      const days = Array.from({ length: 5 }, (_, i) => 
        `2025-01-${String(i + 1).padStart(2, '0')}`
      );
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {
        '2025-01-01': { N: 1 },
        '2025-01-02': { N: 1 },
        '2025-01-03': { N: 1 },
        '2025-01-04': { E: 1 }, // Should not be same staff who did nights
      };

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          maxConsecNights: 3,
          preferRestAfterNights: true,
        },
      });

      // Find staff who worked 3 consecutive nights
      for (const staffMember of staff) {
        let nightStreak = 0;
        for (let i = 0; i < 3; i++) {
          if (result.roster[staffMember.id]?.[days[i]] === 'N') {
            nightStreak++;
          }
        }

        if (nightStreak === 3) {
          // They should have REST on day 4
          const day4Shift = result.roster[staffMember.id]?.[days[3]];
          expect(day4Shift).toBe('R');
        }
      }
    });
  });

  describe('Corrective pass integration', () => {
    it('generates roster with explicit REST assignments', () => {
      const staff = createStaff(5);
      const days = Array.from({ length: 7 }, (_, i) => 
        `2025-01-${String(i + 1).padStart(2, '0')}`
      );
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {};
      days.forEach(d => {
        requirements[d] = { E: 2, L: 1 };
      });

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
      });

      // Every staff member should have assignments for every day (either work or REST)
      for (const staffMember of staff) {
        for (const day of days) {
          const shift = result.roster[staffMember.id]?.[day];
          expect(shift).toBeDefined();
          expect(['E', 'L', 'N', 'R']).toContain(shift);
        }
      }
    });

    it('validates no overlapping assignments per day', () => {
      const staff = createStaff(4);
      const days = Array.from({ length: 5 }, (_, i) => 
        `2025-01-${String(i + 1).padStart(2, '0')}`
      );
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {};
      days.forEach(d => {
        requirements[d] = { E: 1, L: 1 };
      });

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
      });

      // Each staff member should have at most one working shift per day
      for (const staffMember of staff) {
        for (const day of days) {
          const shift = result.roster[staffMember.id]?.[day];
          // Just one shift code per day
          expect(shift).toMatch(/^[ELNR]$/);
        }
      }
    });
  });

  describe('Custom shift times', () => {
    it('respects custom shift times for rest calculation', () => {
      const customShiftTimes = {
        E: { start: '07:00', end: '15:00' },
        L: { start: '15:00', end: '23:00' },
        N: { start: '23:00', end: '07:00' },
      };

      const staff = createStaff(3);
      const days = ['2025-01-01', '2025-01-02'];
      setAllAvailable(staff, days);

      const requirements: CoverageRequirements = {
        '2025-01-01': { L: 1 },
        '2025-01-02': { E: 1 },
      };

      const result = generateCorrectiveRoster({
        days,
        staff,
        requirements,
        policy: {
          ...DEFAULT_CORRECTIVE_POLICY,
          shiftTimes: customShiftTimes,
        },
      });

      // L ends 23:00, E starts 07:00 = 8h rest (< 11h)
      // So same staff should NOT do both
      const day1Late = result.assignments.find(a => a.dateISO === '2025-01-01' && a.shiftType === 'L');
      const day2Early = result.assignments.find(a => a.dateISO === '2025-01-02' && a.shiftType === 'E');

      if (day1Late && day2Early) {
        expect(day1Late.staffId).not.toBe(day2Early.staffId);
      }
    });
  });
});
