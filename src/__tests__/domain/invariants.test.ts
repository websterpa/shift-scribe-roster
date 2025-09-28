import { describe, it, expect } from 'vitest';
import { validateShiftSetConsistency, validateRestRulesPreview, validateNightEligibility } from '@/domain/invariants';
import { DEFAULT_STAFFING_8H, DEFAULT_STAFFING_12H } from '@/domain/rosterSchema';

describe("validateShiftSetConsistency", () => {
  test("passes for 8h system with E/L/N shifts", () => {
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

    const issues = validateShiftSetConsistency(input);
    expect(issues).toHaveLength(0);
  });

  test("fails for 8h system with D shifts", () => {
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

    const issues = validateShiftSetConsistency(input);
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe("fatal");
    expect(issues[0].message).toContain("D not allowed for 8h");
  });

  test("passes for 12h system with D/N shifts", () => {
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

    const issues = validateShiftSetConsistency(input);
    expect(issues).toHaveLength(0);
  });

  test("fails for 12h system with E/L shifts", () => {
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

    const issues = validateShiftSetConsistency(input);
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe("fatal");
    expect(issues[0].message).toContain("E,L not allowed for 12h");
  });
});

describe("validateRestRulesPreview", () => {
  test("returns no issues for safe pattern", () => {
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

    const issues = validateRestRulesPreview(input);
    expect(issues).toHaveLength(0);
  });

  test("returns warning for D→N pattern", () => {
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

    const issues = validateRestRulesPreview(input);
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe("warning");
    expect(issues[0].message).toContain("D→N may violate 11h rest");
  });

  test("returns warning for E→N pattern", () => {
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

    const issues = validateRestRulesPreview(input);
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe("warning");
    expect(issues[0].message).toContain("E→N may violate 11h rest");
  });
});

describe("validateNightEligibility", () => {
  test("returns no issues when no nights required", () => {
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
    const issues = validateNightEligibility(input, staffList);
    expect(issues).toHaveLength(0);
  });

  test("returns fatal error when nights required but no eligible staff", () => {
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
    const issues = validateNightEligibility(input, staffList);
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe("fatal");
    expect(issues[0].message).toContain("No staff eligible for Night shifts");
  });

  test("returns no issues when nights required and eligible staff available", () => {
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

    const staffList = [{ role: "Supervisor" }, { role: "Staff" }];
    const issues = validateNightEligibility(input, staffList);
    expect(issues).toHaveLength(0);
  });

  test("returns no issues when supervisor nights allowed", () => {
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
    const issues = validateNightEligibility(input, staffList);
    expect(issues).toHaveLength(0);
  });

  test("detects nights from pattern", () => {
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
    const issues = validateNightEligibility(input, staffList);
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe("fatal");
    expect(issues[0].message).toContain("No staff eligible for Night shifts");
  });
});