import { budgetVarianceToastData } from "@/utils/budgetToast";
import type { GenerateRosterResult } from "@/types/managerUI";

describe("budgetVarianceToastData", () => {
  test("returns null when result is not ok", () => {
    const result: GenerateRosterResult = {
      ok: false,
      summary: {
        budget: 5000,
        budgetVariance: 1000,
        totalCost: 6000,
        coverageAchievedPct: 95,
        fairness: {
          nights: { min: 3, avg: 5, max: 7 },
          weekends: { min: 6, avg: 8, max: 10 },
          publicHolidays: { min: 0, avg: 1, max: 3, cap: 2 }
        },
        violations: [],
        notes: []
      }
    };

    expect(budgetVarianceToastData(result)).toBeNull();
  });

  test("returns null when summary is missing", () => {
    const result: GenerateRosterResult = {
      ok: true,
      summary: undefined
    };

    expect(budgetVarianceToastData(result)).toBeNull();
  });

  test("returns null when budget is not a number", () => {
    const result: GenerateRosterResult = {
      ok: true,
      summary: {
        budget: null,
        budgetVariance: 1000,
        totalCost: 6000,
        coverageAchievedPct: 95,
        fairness: {
          nights: { min: 3, avg: 5, max: 7 },
          weekends: { min: 6, avg: 8, max: 10 },
          publicHolidays: { min: 0, avg: 1, max: 3, cap: 2 }
        },
        violations: [],
        notes: []
      }
    };

    expect(budgetVarianceToastData(result)).toBeNull();
  });

  test("returns destructive toast when over budget", () => {
    const result: GenerateRosterResult = {
      ok: true,
      summary: {
        budget: 5000,
        budgetVariance: 1234,
        totalCost: 6234,
        coverageAchievedPct: 95,
        fairness: {
          nights: { min: 3, avg: 5, max: 7 },
          weekends: { min: 6, avg: 8, max: 10 },
          publicHolidays: { min: 0, avg: 1, max: 3, cap: 2 }
        },
        violations: [],
        notes: []
      }
    };

    const toast = budgetVarianceToastData(result);
    expect(toast).toEqual({
      title: "Budget Warning",
      description: "Over budget by £1,234",
      variant: "destructive"
    });
  });

  test("returns success toast when under budget", () => {
    const result: GenerateRosterResult = {
      ok: true,
      summary: {
        budget: 5000,
        budgetVariance: -500,
        totalCost: 4500,
        coverageAchievedPct: 95,
        fairness: {
          nights: { min: 3, avg: 5, max: 7 },
          weekends: { min: 6, avg: 8, max: 10 },
          publicHolidays: { min: 0, avg: 1, max: 3, cap: 2 }
        },
        violations: [],
        notes: []
      }
    };

    const toast = budgetVarianceToastData(result);
    expect(toast).toEqual({
      title: "Great News!",
      description: "Under budget by £500",
      variant: "default"
    });
  });

  test("returns null when exactly on budget", () => {
    const result: GenerateRosterResult = {
      ok: true,
      summary: {
        budget: 5000,
        budgetVariance: 0,
        totalCost: 5000,
        coverageAchievedPct: 95,
        fairness: {
          nights: { min: 3, avg: 5, max: 7 },
          weekends: { min: 6, avg: 8, max: 10 },
          publicHolidays: { min: 0, avg: 1, max: 3, cap: 2 }
        },
        violations: [],
        notes: []
      }
    };

    expect(budgetVarianceToastData(result)).toBeNull();
  });

  test("formats large numbers with commas", () => {
    const result: GenerateRosterResult = {
      ok: true,
      summary: {
        budget: 10000,
        budgetVariance: 12345,
        totalCost: 22345,
        coverageAchievedPct: 95,
        fairness: {
          nights: { min: 3, avg: 5, max: 7 },
          weekends: { min: 6, avg: 8, max: 10 },
          publicHolidays: { min: 0, avg: 1, max: 3, cap: 2 }
        },
        violations: [],
        notes: []
      }
    };

    const toast = budgetVarianceToastData(result);
    expect(toast?.description).toContain("£12,345");
  });
});