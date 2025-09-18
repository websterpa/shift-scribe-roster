import { describe, it, expect } from 'vitest';
import { computeRestRiskBetweenDays } from '@/components/RosterWizard';

describe('Rest Risk Calculator', () => {
  it('calculates rest between 8h shifts correctly', () => {
    const result = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00",
      sequence: ["E", "L", "N"]  // E: 06-14, L: 14-22, N: 22-06
    });

    expect(result).toHaveLength(2);
    
    // E→L: ends 14:00, next starts 14:00+24h = should be 24h rest (next day)
    expect(result[0]).toMatchObject({
      prev: "E",
      next: "L", 
      restHours: 24,
      severity: "ok"
    });

    // L→N: ends 22:00, next starts 22:00+24h = should be 24h rest (next day)
    expect(result[1]).toMatchObject({
      prev: "L",
      next: "N",
      restHours: 24, 
      severity: "ok"
    });
  });

  it('detects rest violations with consecutive shifts', () => {
    const result = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00",
      sequence: ["N", "E"]  // N: 22-06, E: 06-14 next day = 0h rest!
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      prev: "N",
      next: "E",
      restHours: 0,
      severity: "risk"
    });
    expect(result[0].message).toContain("<11h");
  });

  it('handles 12h shifts correctly', () => {
    const result = computeRestRiskBetweenDays({
      system: "12h", 
      siteStartLocalTime: "07:00",
      sequence: ["D", "N"]  // D: 07-19, N: 19-07 next day = 12h rest
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      prev: "D",
      next: "N",
      restHours: 12,
      severity: "warn"  // 12h is in warn range (11-13h)
    });
  });

  it('treats off days as safe rest', () => {
    const result = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00", 
      sequence: ["N", "O", "E"]
    });

    expect(result).toHaveLength(2);
    
    // N→O should be safe
    expect(result[0]).toMatchObject({
      prev: "N",
      next: "O",
      restHours: 24,
      severity: "ok"
    });

    // O→E should be safe  
    expect(result[1]).toMatchObject({
      prev: "O", 
      next: "E",
      restHours: 24,
      severity: "ok"
    });
  });

  it('handles different site start times', () => {
    const result = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "22:00",  // Night start
      sequence: ["E", "L"]  // E: 22-06, L: 06-14 next day = 16h rest
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      prev: "E",
      next: "L",
      restHours: 16,
      severity: "ok"  // 16h > 13h = ok
    });
  });

  it('returns empty array for insufficient sequence', () => {
    const result = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00",
      sequence: ["E"]  // Single day
    });

    expect(result).toHaveLength(0);
  });

  it('classifies severity levels correctly', () => {
    // Test all three severity levels
    const risk = computeRestRiskBetweenDays({
      system: "8h", 
      siteStartLocalTime: "06:00",
      sequence: ["N", "E"]  // 0h rest = risk
    });
    expect(risk[0].severity).toBe("risk");

    const warn = computeRestRiskBetweenDays({
      system: "12h",
      siteStartLocalTime: "06:00", 
      sequence: ["D", "N"]  // 12h rest = warn
    });
    expect(warn[0].severity).toBe("warn");

    const ok = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00",
      sequence: ["E", "N"]  // 8h rest gap + 24h = ok
    });
    expect(ok[0].severity).toBe("ok");
  });
});