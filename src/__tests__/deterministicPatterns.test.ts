/**
 * Tests for deterministic pattern positioning using team_index and cycle_anchor_date
 */

import { describe, it, expect } from 'vitest';
import { calculateExpectedToken, getCycleAnchorDate } from '@/engine/teamIndexAssignment';

describe('Deterministic Pattern Positioning', () => {
  const sequence = ['E', 'E', 'L', 'L', 'N', 'N', 'R', 'R']; // 8-day cycle
  const teamsRequired = 4;
  const framework = '8h' as const;

  describe('calculateExpectedToken', () => {
    it('should calculate correct token for team_index 0 on anchor date', () => {
      const anchorDate = new Date('2025-01-01');
      const targetDate = new Date('2025-01-01');
      const teamIndex = 0;

      const token = calculateExpectedToken(
        targetDate,
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      // team_index 0, staffStart = 0, anchorOffset = 0, idx = 0
      expect(token).toBe('E');
    });

    it('should calculate correct token for team_index 2 on anchor date', () => {
      const anchorDate = new Date('2025-01-01');
      const targetDate = new Date('2025-01-01');
      const teamIndex = 2;

      const token = calculateExpectedToken(
        targetDate,
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      // team_index 2, staffStart = floor(2/4 * 8) = 4, anchorOffset = 0, idx = 4
      expect(token).toBe('N');
    });

    it('should advance pattern on next day', () => {
      const anchorDate = new Date('2025-01-01');
      const targetDate = new Date('2025-01-02');
      const teamIndex = 0;

      const token = calculateExpectedToken(
        targetDate,
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      // anchorOffset = 1, staffStart = 0, idx = 1
      expect(token).toBe('E');
    });

    it('should wrap around cycle correctly', () => {
      const anchorDate = new Date('2025-01-01');
      const targetDate = new Date('2025-01-09'); // 8 days later
      const teamIndex = 0;

      const token = calculateExpectedToken(
        targetDate,
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      // anchorOffset = 8 % 8 = 0, staffStart = 0, idx = 0
      expect(token).toBe('E');
    });

    it('should handle negative date differences (before anchor)', () => {
      const anchorDate = new Date('2025-01-10');
      const targetDate = new Date('2025-01-09'); // 1 day before
      const teamIndex = 0;

      const token = calculateExpectedToken(
        targetDate,
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      // anchorOffset = ((-1 % 8) + 8) % 8 = 7, staffStart = 0, idx = 7
      expect(token).toBe('R');
    });

    it('should distribute teams evenly across cycle', () => {
      const anchorDate = new Date('2025-01-01');
      const targetDate = new Date('2025-01-01');

      const tokens = [0, 1, 2, 3].map(teamIndex =>
        calculateExpectedToken(
          targetDate,
          anchorDate,
          teamIndex,
          teamsRequired,
          sequence,
          framework
        )
      );

      // team 0: staffStart=0, idx=0 → 'E'
      // team 1: staffStart=2, idx=2 → 'L'
      // team 2: staffStart=4, idx=4 → 'N'
      // team 3: staffStart=6, idx=6 → 'R'
      expect(tokens).toEqual(['E', 'L', 'N', 'R']);
    });

    it('should remap E/L to D for 12h framework', () => {
      const anchorDate = new Date('2025-01-01');
      const targetDate = new Date('2025-01-01');
      const teamIndex = 0;
      const framework12h = '12h' as const;

      const token = calculateExpectedToken(
        targetDate,
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework12h
      );

      // Expected 'E' but should be remapped to 'D' for 12h
      expect(token).toBe('D');
    });

    it('should maintain N token for 12h framework', () => {
      const anchorDate = new Date('2025-01-01');
      const targetDate = new Date('2025-01-01');
      const teamIndex = 2; // staffStart = 4 → 'N'
      const framework12h = '12h' as const;

      const token = calculateExpectedToken(
        targetDate,
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework12h
      );

      // 'N' should not be remapped
      expect(token).toBe('N');
    });

    it('should produce consistent results across multiple calls', () => {
      const anchorDate = new Date('2025-01-01');
      const targetDate = new Date('2025-01-05');
      const teamIndex = 1;

      const token1 = calculateExpectedToken(
        targetDate,
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      const token2 = calculateExpectedToken(
        targetDate,
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      expect(token1).toBe(token2);
    });
  });

  describe('getCycleAnchorDate', () => {
    it('should use cycle_anchor_date when provided', () => {
      const config = {
        cycle_anchor_date: '2025-01-15',
        start_date: '2025-02-01'
      };

      const anchor = getCycleAnchorDate(config);
      expect(anchor.toISOString().split('T')[0]).toBe('2025-01-15');
    });

    it('should default to start_date when cycle_anchor_date is null', () => {
      const config = {
        cycle_anchor_date: null,
        start_date: '2025-02-01'
      };

      const anchor = getCycleAnchorDate(config);
      expect(anchor.toISOString().split('T')[0]).toBe('2025-02-01');
    });

    it('should default to start_date when cycle_anchor_date is undefined', () => {
      const config = {
        start_date: '2025-02-01'
      };

      const anchor = getCycleAnchorDate(config);
      expect(anchor.toISOString().split('T')[0]).toBe('2025-02-01');
    });
  });

  describe('Pattern Consistency Across Months', () => {
    it('should maintain same token for same day-of-cycle across months', () => {
      const anchorDate = new Date('2025-01-01');
      const teamIndex = 0;

      // First occurrence: Jan 1 (day 0)
      const jan1Token = calculateExpectedToken(
        new Date('2025-01-01'),
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      // Second occurrence: Jan 9 (day 8, should wrap to day 0)
      const jan9Token = calculateExpectedToken(
        new Date('2025-01-09'),
        anchorDate,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      expect(jan1Token).toBe(jan9Token);
    });

    it('should shift all staff by one day when anchor moves forward', () => {
      const teamIndex = 0;
      const date = new Date('2025-01-15');

      // Original anchor
      const anchor1 = new Date('2025-01-01');
      const token1 = calculateExpectedToken(
        date,
        anchor1,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      // Anchor shifted forward by 1 day
      const anchor2 = new Date('2025-01-02');
      const token2 = calculateExpectedToken(
        date,
        anchor2,
        teamIndex,
        teamsRequired,
        sequence,
        framework
      );

      // daysBetween(anchor1, date) = 14
      // daysBetween(anchor2, date) = 13
      // So token2 should be one position earlier in the cycle
      const idx1 = 14 % 8; // = 6 → 'R'
      const idx2 = 13 % 8; // = 5 → 'N'
      
      expect(token1).toBe('R');
      expect(token2).toBe('N');
    });
  });
});
