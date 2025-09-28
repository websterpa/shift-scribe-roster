import { describe, it, expect } from 'vitest';
import { validateShiftSetConsistency, validateRestRulesPreview, validateNightEligibility } from '@/domain/invariants';
import { DEFAULT_STAFFING_8H, DEFAULT_STAFFING_12H } from '@/domain/rosterSchema';

describe('validateShiftSetConsistency', () => {
  it('allows 8h system with E/L/N shifts', () => {
    const input = {
      system: "8h" as const,
      staffing: DEFAULT_STAFFING_8H,
      pattern: "EELN",
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    expect(() => validateShiftSetConsistency(input)).not.toThrow();
  });

  it('allows 12h system with D/N shifts', () => {
    const input = {
      system: "12h" as const,
      staffing: DEFAULT_STAFFING_12H,
      pattern: "DDNN",
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    expect(() => validateShiftSetConsistency(input)).not.toThrow();
  });

  it('rejects 8h system with D shifts', () => {
    const input = {
      system: "8h" as const,
      staffing: [
        { dow: 0, need: { D: 2, E: 0, L: 0, N: 0, R: 0, S: 0 } },
        ...DEFAULT_STAFFING_8H.slice(1)
      ],
      pattern: "DDNN",
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    expect(() => validateShiftSetConsistency(input)).toThrow(/Inconsistent shift-set.*D.*not allowed for 8h/);
  });

  it('rejects 12h system with E/L shifts', () => {
    const input = {
      system: "12h" as const,
      staffing: [
        { dow: 0, need: { E: 2, L: 1, D: 0, N: 0, R: 0, S: 0 } },
        ...DEFAULT_STAFFING_12H.slice(1)
      ],
      pattern: "EELN",
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    expect(() => validateShiftSetConsistency(input)).toThrow(/Inconsistent shift-set.*E,L.*not allowed for 12h/);
  });
});

describe('validateRestRulesPreview', () => {
  it('detects potential day-to-night violations', () => {
    const input = {
      system: "12h" as const,
      pattern: "DN", // Day immediately followed by Night
      staffing: DEFAULT_STAFFING_12H,
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    const result = validateRestRulesPreview(input);
    expect(result.warnings).toContain(expect.stringContaining("D→N may violate 11h rest"));
  });

  it('allows patterns with rest days', () => {
    const input = {
      system: "12h" as const,
      pattern: "DRNR", // Rest days between work
      staffing: DEFAULT_STAFFING_12H,
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    const result = validateRestRulesPreview(input);
    expect(result.warnings).toHaveLength(0);
  });

  it('detects 8h early-to-night violations', () => {
    const input = {
      system: "8h" as const,
      pattern: "EN", // Early followed by Night
      staffing: DEFAULT_STAFFING_8H,
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    const result = validateRestRulesPreview(input);
    expect(result.warnings).toContain(expect.stringContaining("E→N may violate 11h rest"));
  });
});

describe('validateNightEligibility', () => {
  it('returns eligible when no nights required', () => {
    const input = {
      system: "8h" as const,
      pattern: "ELR", // No nights
      staffing: [{ dow: 0, need: { E: 2, L: 2, N: 0, D: 0, R: 0, S: 0 } }],
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    const staffList = [{ role: "Supervisor" }];
    const result = validateNightEligibility(input, staffList);
    expect(result.eligible).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('detects when nights required but no eligible staff', () => {
    const input = {
      system: "12h" as const,
      pattern: "DN",
      staffing: DEFAULT_STAFFING_12H,
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    const staffList = [{ role: "Supervisor" }, { role: "Supervisor" }]; // All supervisors
    const result = validateNightEligibility(input, staffList);
    expect(result.eligible).toBe(false);
    expect(result.warnings).toContain(expect.stringContaining("No staff eligible for Night shifts"));
  });

  it('allows supervisors when setting enabled', () => {
    const input = {
      system: "12h" as const,
      pattern: "DN",
      staffing: DEFAULT_STAFFING_12H,
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: true // Enabled
    };

    const staffList = [{ role: "Supervisor" }, { role: "Supervisor" }];
    const result = validateNightEligibility(input, staffList);
    expect(result.eligible).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('detects nights from pattern', () => {
    const input = {
      system: "8h" as const,
      pattern: "EELNRR", // Contains N
      staffing: [{ dow: 0, need: { E: 2, L: 2, N: 0, D: 0, R: 0, S: 0 } }], // No N in staffing
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      rates: { staff: 18, supervisor: 24, roleMixByShift: {}, budgetWarn: null },
      allowSupervisorNights: false
    };

    const staffList = [{ role: "Supervisor" }];
    const result = validateNightEligibility(input, staffList);
    expect(result.eligible).toBe(false); // Pattern has N but no eligible staff
  });
});