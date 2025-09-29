import { validateRest } from "../../engine2/rules/validateRest";
import type { Assignment, RestRules } from "../../engine2/types";

function d(s: string) { return new Date(s); }

describe("engine2: weekly rest & max weekly hours", () => {
  const rules: RestRules = { minDailyRestHours: 11, minWeeklyRestHours: 24, maxWeeklyHours: 60 };

  it("flags REST_WEEKLY when no 24h continuous rest exists", () => {
    const assigns: Assignment[] = [
      { staffId: "S1", shift: { start: d("2025-03-03T08:00:00"), end: d("2025-03-03T16:00:00") } },
      { staffId: "S1", shift: { start: d("2025-03-04T08:00:00"), end: d("2025-03-04T16:00:00") } },
      { staffId: "S1", shift: { start: d("2025-03-05T08:00:00"), end: d("2025-03-05T16:00:00") } },
      { staffId: "S1", shift: { start: d("2025-03-06T08:00:00"), end: d("2025-03-06T16:00:00") } },
      { staffId: "S1", shift: { start: d("2025-03-07T08:00:00"), end: d("2025-03-07T16:00:00") } },
      { staffId: "S1", shift: { start: d("2025-03-08T08:00:00"), end: d("2025-03-08T16:00:00") } },
      { staffId: "S1", shift: { start: d("2025-03-09T08:00:00"), end: d("2025-03-09T12:00:00") } },
    ];
    const lines = validateRest(assigns, rules);
    expect(lines.some(l => l.code === "REST_WEEKLY")).toBe(true);
  });

  it("flags MAX_WEEKLY when total hours exceed cap", () => {
    const assigns: Assignment[] = Array.from({ length: 6 }).map((_, i) => ({
      staffId: "S1",
      shift: { 
        start: d(`2025-03-${String(10 + i).padStart(2,"0")}T08:00:00`), 
        end: d(`2025-03-${String(10 + i).padStart(2,"0")}T19:00:00`) 
      }
    })); // 6 x 11h = 66h
    const lines = validateRest(assigns, rules);
    expect(lines.some(l => l.code === "MAX_WEEKLY")).toBe(true);
  });

  it("passes when rest rules are satisfied", () => {
    const assigns: Assignment[] = [
      { staffId: "S1", shift: { start: d("2025-03-03T08:00:00"), end: d("2025-03-03T16:00:00") } },
      { staffId: "S1", shift: { start: d("2025-03-05T08:00:00"), end: d("2025-03-05T16:00:00") } }, // 40h gap
    ];
    const lines = validateRest(assigns, rules);
    expect(lines.length).toBe(0);
  });
});