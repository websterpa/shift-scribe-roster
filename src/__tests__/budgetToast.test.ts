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

    const toast = budgetVarianceToastData(result, 0); // Using 0 threshold to match old behavior
    expect(toast).toEqual({
      title: "Budget Warning",
      description: "Over budget by £1,234",
      variant: "destructive"
    });
  });

  test("returns destructive toast when over budget and exceeds threshold", () => {
    const result: GenerateRosterResult = {
      ok: true,
      summary: {
        budget: 5000,
        budgetVariance: 600, // Over budget by £600
        totalCost: 5600,
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

    const toast = budgetVarianceToastData(result, 500); // Threshold of £500
    expect(toast).toEqual({
      title: "Budget Warning",
      description: "Over budget by £600",
      variant: "destructive"
    });
  });

  test("returns null when over budget but within threshold", () => {
    const result: GenerateRosterResult = {
      ok: true,
      summary: {
        budget: 5000,
        budgetVariance: 300, // Over budget by £300
        totalCost: 5300,
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

    const toast = budgetVarianceToastData(result, 500); // Threshold of £500
    expect(toast).toBeNull();
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

    const toast = budgetVarianceToastData(result, 0); // Using 0 threshold
    expect(toast?.description).toContain("£12,345");
  });

  test("uses default threshold of 0 when not provided", () => {
    const result: GenerateRosterResult = {
      ok: true,
      summary: {
        budget: 5000,
        budgetVariance: 1, // Over budget by £1
        totalCost: 5001,
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

    const toast = budgetVarianceToastData(result); // No threshold provided
    expect(toast).toEqual({
      title: "Budget Warning",
      description: "Over budget by £1",
      variant: "destructive"
    });
  });
});