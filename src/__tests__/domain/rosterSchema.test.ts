import { describe, it, expect } from 'vitest';
import { RosterBuilderInput, DEFAULT_STAFFING_8H, DEFAULT_STAFFING_12H } from '@/domain/rosterSchema';

describe('RosterBuilderInput schema', () => {
  it('accepts valid 8h configuration', () => {
    const input = {
      system: "8h" as const,
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      pattern: "EELLNNRRRR",
      staffing: DEFAULT_STAFFING_8H,
      rates: {
        staff: 18,
        supervisor: 24,
        roleMixByShift: { D: 0, E: 10, L: 10, N: 20, R: 0, S: 0 },
        budgetWarn: null
      },
      allowSupervisorNights: false
    };

    const result = RosterBuilderInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts valid 12h configuration', () => {
    const input = {
      system: "12h" as const,
      tz: "Europe/London", 
      siteStartHour: 6,
      horizonWeeks: 17,
      pattern: "DDNNRRRR",
      staffing: DEFAULT_STAFFING_12H,
      rates: {
        staff: 18,
        supervisor: 24,
        roleMixByShift: { D: 15, E: 0, L: 0, N: 20, R: 0, S: 0 },
        budgetWarn: 50000
      },
      allowSupervisorNights: true
    };

    const result = RosterBuilderInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid shift system', () => {
    const input = {
      system: "invalid" as any,
      pattern: "DDNN",
      staffing: DEFAULT_STAFFING_12H,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    const result = RosterBuilderInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects empty pattern', () => {
    const input = {
      system: "12h" as const,
      pattern: "",
      staffing: DEFAULT_STAFFING_12H,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    const result = RosterBuilderInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid site start hour', () => {
    const input = {
      system: "12h" as const,
      siteStartHour: 25, // Invalid hour
      pattern: "DDNN",
      staffing: DEFAULT_STAFFING_12H,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    const result = RosterBuilderInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('applies default values', () => {
    const input = {
      system: "8h" as const,
      pattern: "EELLN",
      staffing: DEFAULT_STAFFING_8H
    };

    const result = RosterBuilderInput.parse(input);
    expect(result.tz).toBe("Europe/London");
    expect(result.siteStartHour).toBe(6);
    expect(result.horizonWeeks).toBe(17);
    expect(result.allowSupervisorNights).toBe(false);
    expect(result.rates.staff).toBe(18);
    expect(result.rates.supervisor).toBe(24);
  });
});