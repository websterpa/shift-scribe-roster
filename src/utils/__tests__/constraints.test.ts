import { describe, it, expect } from 'vitest';
import { respectsRestRules } from "../restValidation";
import { ensureShiftSystemConsistency } from "../constraints";

describe("Constraints and Rest Validation", () => {
  it("requires 11h rest between worked shifts", () => {
    const prevEnd = new Date("2025-01-02T18:00:00Z");
    const nextStartOK = new Date("2025-01-03T06:59:59Z");
    const nextStartGood = new Date("2025-01-03T07:00:00Z");
    expect((nextStartOK.getTime()-prevEnd.getTime())/3600000).toBeCloseTo(11, 0);
    // Minimal resolver just to satisfy signature
    const resolve = () => ({ start: nextStartOK, end: new Date(nextStartOK.getTime()+8*3600000) });
    const resolveGood = () => ({ start: nextStartGood, end: new Date(nextStartGood.getTime()+8*3600000) });
    // Prev date used only for same-day ban in this test
    expect(respectsRestRules(prevEnd, "2025-01-02", "D", "2025-01-03", "E" as any, resolve)).toBe(false);
    expect(respectsRestRules(prevEnd, "2025-01-02", "D", "2025-01-03", "E" as any, resolveGood)).toBe(true);
  });

  it("prevents mixing 8h and 12h systems", () => {
    expect(ensureShiftSystemConsistency("E" as any, "8h")).toBe(true);
    expect(ensureShiftSystemConsistency("D" as any, "8h")).toBe(false);
    expect(ensureShiftSystemConsistency("D" as any, "12h")).toBe(true);
    expect(ensureShiftSystemConsistency("L" as any, "12h")).toBe(false);
  });
});