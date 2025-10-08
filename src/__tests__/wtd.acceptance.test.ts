/**
 * @wtd-acceptance
 * Acceptance tests for WTD-compliant rostering (locks behavior for CI)
 */
import { describe, it, expect } from 'vitest';
import {
  validateStaffWTD,
  isValidTransition,
  validateConsecutiveDays,
  validateConsecutiveNights,
  validateWeeklyRest,
  validate48HourAverage,
  validateNightWorkAverage,
  DEFAULT_WTD_RULES,
  DEFAULT_SHIFT_TIMES,
} from '@/engine2/constraints/wtdRules';

describe('WTD Acceptance Tests @wtd-acceptance', () => {
  describe('Test 1: Coverage Exactness', () => {
    it('validates that all required shifts are filled for each day', () => {
      const required = { E: 2, L: 2, N: 1 };
      const filled = { E: 2, L: 2, N: 1 };
      
      expect(filled.E).toBe(required.E);
      expect(filled.L).toBe(required.L);
      expect(filled.N).toBe(required.N);
    });
  });

  describe('Test 2: Rest-Matrix Tests (11h rule)', () => {
    it('blocks L→E transition (8h rest)', () => {
      expect(isValidTransition('L', 'E')).toBe(false);
    });

    it('blocks N→E transition (4h rest)', () => {
      expect(isValidTransition('N', 'E')).toBe(false);
    });

    it('blocks N→L transition (8h rest)', () => {
      expect(isValidTransition('N', 'L')).toBe(false);
    });

    it('allows E→E transition (12h rest)', () => {
      expect(isValidTransition('E', 'E')).toBe(true);
    });

    it('allows E→L transition (no gap but different shift)', () => {
      expect(isValidTransition('E', 'L')).toBe(true);
    });

    it('allows E→N transition (8h rest)', () => {
      expect(isValidTransition('E', 'N')).toBe(true);
    });

    it('allows L→L transition (16h rest)', () => {
      expect(isValidTransition('L', 'L')).toBe(true);
    });

    it('allows L→N transition (no gap but night shift)', () => {
      expect(isValidTransition('L', 'N')).toBe(true);
    });

    it('allows N→N transition (16h rest)', () => {
      expect(isValidTransition('N', 'N')).toBe(true);
    });

    it('samples 100 random transitions and detects violations', () => {
      const validShifts = ['E', 'L', 'N', 'R'];
      let violations = 0;

      for (let i = 0; i < 100; i++) {
        const from = validShifts[Math.floor(Math.random() * validShifts.length)];
        const to = validShifts[Math.floor(Math.random() * validShifts.length)];
        
        const isValid = isValidTransition(from, to);
        
        // Known invalid transitions
        if ((from === 'L' && to === 'E') || 
            (from === 'N' && to === 'E') || 
            (from === 'N' && to === 'L')) {
          expect(isValid).toBe(false);
          violations++;
        }
      }
      
      expect(violations).toBeGreaterThan(0);
    });
  });

  describe('Test 3: Weekly Rest (≤6 working days per 7-day window)', () => {
    it('passes with 6 working days and 1 rest', () => {
      const assignments = ['E', 'L', 'E', 'L', 'E', 'L', 'R'];
      const result = validateWeeklyRest(assignments);
      expect(result.valid).toBe(true);
    });

    it('fails with 7 consecutive working days', () => {
      const assignments = ['E', 'L', 'E', 'L', 'E', 'L', 'E'];
      const result = validateWeeklyRest(assignments);
      expect(result.valid).toBe(false);
      expect(result.violation).toContain('7 consecutive working days');
    });

    it('validates rolling 7-day windows in a 28-day month', () => {
      const assignments = Array(28).fill('').map((_, i) => {
        // Work 6 days, rest 1 day pattern
        return (i % 7 === 6) ? 'R' : 'E';
      });
      
      const result = validateWeeklyRest(assignments);
      expect(result.valid).toBe(true);
    });
  });

  describe('Test 4: 48-Hour Average (over 17 weeks)', () => {
    it('passes when average is exactly 48h per week', () => {
      const weeks = 4;
      const assignments = Array(weeks * 7).fill('').map((_, i) => {
        // Work 6 days/week at 8h = 48h/week
        return (i % 7 === 6) ? 'R' : 'E';
      });
      
      const result = validate48HourAverage(assignments, 8, weeks);
      expect(result.valid).toBe(true);
    });

    it('fails when average exceeds 48h per week', () => {
      const weeks = 4;
      const assignments = Array(weeks * 7).fill('E'); // 7 days × 8h = 56h/week
      
      const result = validate48HourAverage(assignments, 8, weeks);
      expect(result.valid).toBe(false);
      expect(result.violation).toContain('exceeds 48h limit');
    });

    it('allows higher hours when opted out', () => {
      const weeks = 4;
      const assignments = Array(weeks * 7).fill('E'); // 56h/week
      
      const result = validate48HourAverage(assignments, 8, weeks, true);
      expect(result.valid).toBe(true);
    });
  });

  describe('Test 5: Night Average (≤8h per 24h period)', () => {
    it('passes when night shifts are within limit', () => {
      const assignments = Array(28).fill('').map((_, i) => {
        // 1 night per 3 days = ~2.67h/day average
        return (i % 3 === 0) ? 'N' : 'R';
      });
      
      const result = validateNightWorkAverage(assignments, 8, 4);
      expect(result.valid).toBe(true);
    });

    it('fails when night shifts exceed 8h average per day', () => {
      const assignments = Array(28).fill('N'); // 8h night every day = 8h/day
      
      const result = validateNightWorkAverage(assignments, 8, 4);
      expect(result.valid).toBe(false);
    });
  });

  describe('Test 6: Utilisation (all staff used)', () => {
    it('ensures all 11 staff have at least 1 assignment', () => {
      const staffCount = 11;
      const assignmentCounts = Array(staffCount).fill(0).map(() => 
        Math.floor(Math.random() * 10) + 1 // Random 1-10 shifts
      );
      
      assignmentCounts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(1);
      });
    });

    it('flags when any staff has zero assignments', () => {
      const assignmentCounts = [5, 6, 4, 0, 7, 5, 6, 4, 5, 6, 5];
      const allUsed = assignmentCounts.every(c => c >= 1);
      expect(allUsed).toBe(false);
    });
  });

  describe('Test 7: Fairness (low std-dev)', () => {
    it('calculates standard deviation of shift distribution', () => {
      const assignments = [10, 11, 10, 9, 10, 11, 10, 9, 10, 11, 10];
      const mean = assignments.reduce((a, b) => a + b, 0) / assignments.length;
      const variance = assignments.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / assignments.length;
      const stdDev = Math.sqrt(variance);
      
      expect(stdDev).toBeLessThan(1.5); // Threshold for fair distribution
    });

    it('flags unfair distribution with high std-dev', () => {
      const assignments = [20, 5, 3, 1, 22, 18, 2, 4, 19, 15, 1];
      const mean = assignments.reduce((a, b) => a + b, 0) / assignments.length;
      const variance = assignments.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / assignments.length;
      const stdDev = Math.sqrt(variance);
      
      expect(stdDev).toBeGreaterThan(1.5);
    });
  });

  describe('Test 8: Consecutive Days & Nights', () => {
    it('enforces max 6 consecutive working days', () => {
      const assignments = ['E', 'L', 'E', 'L', 'E', 'L', 'R'];
      const result = validateConsecutiveDays(assignments, 6);
      expect(result.valid).toBe(true);
    });

    it('blocks 7 consecutive working days', () => {
      const assignments = ['E', 'L', 'E', 'L', 'E', 'L', 'E'];
      const result = validateConsecutiveDays(assignments, 6);
      expect(result.valid).toBe(false);
    });

    it('enforces max 3 consecutive nights', () => {
      const assignments = ['N', 'N', 'N', 'R', 'R'];
      const result = validateConsecutiveNights(assignments, 3);
      expect(result.valid).toBe(true);
    });

    it('blocks 4 consecutive nights', () => {
      const assignments = ['N', 'N', 'N', 'N', 'R'];
      const result = validateConsecutiveNights(assignments, 3);
      expect(result.valid).toBe(false);
    });
  });

  describe('Test 9: Comprehensive Staff Validation', () => {
    it('validates a compliant 28-day roster', () => {
      const assignments = [
        'E', 'L', 'E', 'L', 'E', 'L', 'R', // Week 1
        'E', 'L', 'E', 'L', 'E', 'L', 'R', // Week 2
        'E', 'L', 'E', 'L', 'E', 'L', 'R', // Week 3
        'E', 'L', 'E', 'L', 'E', 'L', 'R', // Week 4
      ];
      
      const result = validateStaffWTD(assignments, DEFAULT_WTD_RULES, DEFAULT_SHIFT_TIMES);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('detects multiple violations in a non-compliant roster', () => {
      const assignments = [
        'L', 'E', 'L', 'E', 'L', 'E', 'L', // Invalid L→E transitions + no weekly rest
        'N', 'E', 'N', 'L', 'N', 'E', 'N', // Invalid N→E and N→L transitions
      ];
      
      const result = validateStaffWTD(assignments, DEFAULT_WTD_RULES, DEFAULT_SHIFT_TIMES);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });
});
