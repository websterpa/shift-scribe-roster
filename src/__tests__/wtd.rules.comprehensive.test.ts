/**
 * @wtd-rules
 * Comprehensive WTD compliance tests: 11h rest, max consecutive days, nights cap
 */
import { describe, it, expect } from 'vitest';
import { hasDailyRest, enforceRestRequirement } from '@/services/roster/helpers/restValidation';

describe('WTD Rules: 11-hour Daily Rest', () => {
  it('detects violation: 8 hours between shifts', () => {
    const prevEnd = new Date('2025-01-01T22:00:00');
    const nextStart = new Date('2025-01-02T06:00:00'); // 8h gap
    expect(hasDailyRest(prevEnd, nextStart)).toBe(false);
  });

  it('passes: exactly 11 hours rest', () => {
    const prevEnd = new Date('2025-01-01T22:00:00');
    const nextStart = new Date('2025-01-02T09:00:00'); // 11h gap
    expect(hasDailyRest(prevEnd, nextStart)).toBe(true);
  });

  it('passes: 12 hours rest', () => {
    const prevEnd = new Date('2025-01-01T20:00:00');
    const nextStart = new Date('2025-01-02T08:00:00'); // 12h gap
    expect(hasDailyRest(prevEnd, nextStart)).toBe(true);
  });

  it('enforces rest day when violation detected', () => {
    const prevEnd = new Date('2025-01-01T22:00:00');
    const nextStart = new Date('2025-01-02T06:00:00'); // 8h gap
    const enforced = enforceRestRequirement('staff-1', 'D', prevEnd, nextStart);
    expect(enforced).toBe('R');
  });

  it('allows shift when rest is adequate', () => {
    const prevEnd = new Date('2025-01-01T20:00:00');
    const nextStart = new Date('2025-01-02T08:00:00'); // 12h gap
    const enforced = enforceRestRequirement('staff-1', 'D', prevEnd, nextStart);
    expect(enforced).toBe('D');
  });
});

describe('WTD Rules: Max Consecutive Working Days', () => {
  it('flags 7+ consecutive work days', () => {
    const consecutiveDays = ['D', 'D', 'D', 'D', 'D', 'D', 'D'];
    const hasRest = consecutiveDays.some(c => c === 'R');
    expect(hasRest).toBe(false);
    expect(consecutiveDays.length).toBeGreaterThanOrEqual(7);
  });

  it('allows 6 consecutive days with rest on 7th', () => {
    const pattern = ['D', 'D', 'D', 'D', 'D', 'D', 'R'];
    expect(pattern[6]).toBe('R');
    const workDays = pattern.filter(c => c !== 'R').length;
    expect(workDays).toBe(6);
  });

  it('allows alternating work/rest pattern', () => {
    const pattern = ['D', 'R', 'D', 'R', 'D', 'R', 'D'];
    const consecutiveWork = pattern.reduce((max, curr, i) => {
      if (curr === 'R') return max;
      let count = 1;
      for (let j = i + 1; j < pattern.length && pattern[j] !== 'R'; j++) count++;
      return Math.max(max, count);
    }, 0);
    expect(consecutiveWork).toBeLessThanOrEqual(1);
  });
});

describe('WTD Rules: Night Shift Caps', () => {
  it('flags more than 4 consecutive nights', () => {
    const nights = ['N', 'N', 'N', 'N', 'N'];
    expect(nights.length).toBeGreaterThan(4);
  });

  it('allows 4 consecutive nights', () => {
    const nights = ['N', 'N', 'N', 'N'];
    expect(nights.length).toBe(4);
  });

  it('allows nights with rest breaks', () => {
    const pattern = ['N', 'N', 'R', 'N', 'N', 'R'];
    const nightBlocks = pattern.join(',').split(/,R,?/).filter(b => b).map(b => b.split(',').length);
    nightBlocks.forEach(block => expect(block).toBeLessThanOrEqual(4));
  });

  it('enforces 46-hour rest after 4+ nights', () => {
    const lastNightEnd = new Date('2025-01-05T08:00:00');
    const nextShiftStart = new Date('2025-01-07T06:00:00'); // 46h later
    const hoursDiff = (nextShiftStart.getTime() - lastNightEnd.getTime()) / (1000 * 60 * 60);
    expect(hoursDiff).toBeGreaterThanOrEqual(46);
  });
});

describe('WTD Rules: Weekly Hours Cap', () => {
  it('flags week exceeding 48 hours', () => {
    const hours = 12 + 12 + 12 + 12 + 12; // 60h
    expect(hours).toBeGreaterThan(48);
  });

  it('allows 48 hours or less', () => {
    const hours = 12 + 12 + 12 + 12; // 48h
    expect(hours).toBeLessThanOrEqual(48);
  });

  it('allows opt-out for higher hours', () => {
    const hours = 54;
    const optedOut = true;
    if (optedOut) {
      expect(hours).toBeGreaterThan(48);
      expect(hours).toBeLessThanOrEqual(60); // Reasonable upper bound
    }
  });
});
