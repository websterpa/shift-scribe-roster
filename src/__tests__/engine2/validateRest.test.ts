import { validateRest } from "../../engine2/rules/validateRest";
import type { Assignment, RestRules } from "../../engine2/types";

function d(s: string) { return new Date(s); }

describe("validateRest", () => {
  const rules: RestRules = { minDailyRestHours: 11, minWeeklyRestHours: 24, maxWeeklyHours: 60 };

  it("flags daily rest shortfall", () => {
    const assigns: Assignment[] = [
      { staffId: "A", shift: { start: d("2025-01-10T08:00:00"), end: d("2025-01-10T16:00:00") } },
      { staffId: "A", shift: { start: d("2025-01-11T00:00:00"), end: d("2025-01-11T08:00:00") } }
    ];
    const lines = validateRest(assigns, rules);
    expect(lines.some(l => l.code === "REST_DAILY")).toBe(true);
  });

  it("detects overlaps", () => {
    const assigns: Assignment[] = [
      { staffId: "A", shift: { start: d("2025-01-10T08:00:00"), end: d("2025-01-10T12:00:00") } },
      { staffId: "A", shift: { start: d("2025-01-10T11:00:00"), end: d("2025-01-10T16:00:00") } }
    ];
    const lines = validateRest(assigns, rules);
    expect(lines.some(l => l.code === "OVERLAP")).toBe(true);
  });

  it("validates weekly hours limit", () => {
    const assigns: Assignment[] = [
      { staffId: "A", shift: { start: d("2025-01-10T08:00:00"), end: d("2025-01-10T20:00:00") } }, // 12h
      { staffId: "A", shift: { start: d("2025-01-11T08:00:00"), end: d("2025-01-11T20:00:00") } }, // 12h  
      { staffId: "A", shift: { start: d("2025-01-12T08:00:00"), end: d("2025-01-12T20:00:00") } }, // 12h
      { staffId: "A", shift: { start: d("2025-01-13T08:00:00"), end: d("2025-01-13T20:00:00") } }, // 12h
      { staffId: "A", shift: { start: d("2025-01-14T08:00:00"), end: d("2025-01-14T20:00:00") } }, // 12h
      { staffId: "A", shift: { start: d("2025-01-15T08:00:00"), end: d("2025-01-15T20:00:00") } }  // 12h = 72h total
    ];
    const lines = validateRest(assigns, rules);
    expect(lines.some(l => l.code === "MAX_WEEKLY")).toBe(true);
  });

  it("passes with adequate rest", () => {
    const assigns: Assignment[] = [
      { staffId: "A", shift: { start: d("2025-01-10T08:00:00"), end: d("2025-01-10T16:00:00") } },
      { staffId: "A", shift: { start: d("2025-01-12T08:00:00"), end: d("2025-01-12T16:00:00") } } // 40h gap
    ];
    const lines = validateRest(assigns, rules);
    expect(lines.length).toBe(0);
  });
});