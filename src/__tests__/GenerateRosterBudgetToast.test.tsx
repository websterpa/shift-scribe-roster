import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import GenerateRosterPanel from "@/components/GenerateRosterPanel";
import type { GenerateRosterResult } from "@/types/managerUI";

// Mock the toast function
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  toast: mockToast
}));

// Mock the roster generator hook
const mockUseRosterGenerator = jest.fn();
jest.mock("@/hooks/useRosterGenerator", () => ({
  useRosterGenerator: mockUseRosterGenerator
}));

// Mock the roster generation services
jest.mock("@/utils/roster/rosterGeneration", () => ({
  generateAndSaveRoster: jest.fn(),
  fetchStaffMembers: jest.fn().mockResolvedValue([])
}));

beforeEach(() => {
  mockToast.mockClear();
  mockUseRosterGenerator.mockReturnValue({
    optimising: false,
    result: null,
    error: null,
    run: jest.fn()
  });
});

test("shows budget warning toast when over budget", async () => {
  const overBudgetResult: GenerateRosterResult = {
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

  mockUseRosterGenerator.mockReturnValue({
    optimising: false,
    result: overBudgetResult,
    error: null,
    run: jest.fn()
  });

  render(<GenerateRosterPanel />);

  await waitFor(() => {
    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "Roster Generated Successfully",
      description: "Your roster has been optimized and is ready for review 🎉",
      variant: "default"
    });
    
    // Verify budget warning toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "Budget Warning",
      description: "Over budget by £1,234",
      variant: "destructive"
    });
  });
});

test("shows budget success toast when under budget", async () => {
  const underBudgetResult: GenerateRosterResult = {
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

  mockUseRosterGenerator.mockReturnValue({
    optimising: false,
    result: underBudgetResult,
    error: null,
    run: jest.fn()
  });

  render(<GenerateRosterPanel />);

  await waitFor(() => {
    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "Roster Generated Successfully",
      description: "Your roster has been optimized and is ready for review 🎉",
      variant: "default"
    });
    
    // Verify budget success toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "Great News!",
      description: "Under budget by £500",
      variant: "default"
    });
  });
});

test("shows no budget toast when exactly on budget", async () => {
  const onBudgetResult: GenerateRosterResult = {
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

  mockUseRosterGenerator.mockReturnValue({
    optimising: false,
    result: onBudgetResult,
    error: null,
    run: jest.fn()
  });

  render(<GenerateRosterPanel />);

  await waitFor(() => {
    // Verify only success toast, no budget toast
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Roster Generated Successfully",
      description: "Your roster has been optimized and is ready for review 🎉",
      variant: "default"
    });
  });
});

test("shows no budget toast when no budget is set", async () => {
  const noBudgetResult: GenerateRosterResult = {
    ok: true,
    summary: {
      budget: null,
      budgetVariance: null,
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

  mockUseRosterGenerator.mockReturnValue({
    optimising: false,
    result: noBudgetResult,
    error: null,
    run: jest.fn()
  });

  render(<GenerateRosterPanel />);

  await waitFor(() => {
    // Verify only success toast, no budget toast
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Roster Generated Successfully",
      description: "Your roster has been optimized and is ready for review 🎉",
      variant: "default"
    });
  });
});