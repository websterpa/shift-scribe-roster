import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import GenerateRosterPanel from "@/components/GenerateRosterPanel";

// Mock the toast function
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  toast: mockToast
}));

// Mock the roster generator hook
const mockRun = jest.fn();
const mockUseRosterGenerator = jest.fn();

jest.mock("@/hooks/useRosterGenerator", () => ({
  useRosterGenerator: mockUseRosterGenerator
}));

// Mock the roster generation service
jest.mock("@/services/roster/generation", () => ({
  generateAndSaveRoster: jest.fn().mockResolvedValue({
    versionId: "test-version-123",
    totalAssignments: 50,
    costResult: { totalCost: 5000 }
  }),
  fetchStaffMembers: jest.fn().mockResolvedValue([
    { id: "1", first_name: "John", last_name: "Doe", email: "john@test.com" }
  ])
}));

beforeEach(() => {
  mockToast.mockClear();
  mockRun.mockClear();
  
  // Default mock implementation - not optimising, no result, no error
  mockUseRosterGenerator.mockReturnValue({
    optimising: false,
    result: null,
    error: null,
    run: mockRun
  });
});

test("shows success toast when roster generation succeeds", async () => {
  // Mock successful generation result
  mockUseRosterGenerator.mockReturnValue({
    optimising: false,
    result: { ok: true, summary: { totalCost: 5000 } },
    error: null,
    run: mockRun
  });

  render(<GenerateRosterPanel />);

  // Verify success toast was called
  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith({
      title: "Roster Generated Successfully",
      description: "Your roster has been optimized and is ready for review 🎉",
      variant: "default"
    });
  });
});

test("shows error toast when roster generation fails", async () => {
  // Mock failed generation
  mockUseRosterGenerator.mockReturnValue({
    optimising: false,
    result: null,
    error: "Failed to generate roster - insufficient staff",
    run: mockRun
  });

  render(<GenerateRosterPanel />);

  // Verify error toast was called
  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith({
      title: "Generation Failed",
      description: "Error: Failed to generate roster - insufficient staff ❌",
      variant: "destructive"
    });
  });
});

test("shows no toast when generation is still optimising", async () => {
  // Mock optimising state
  mockUseRosterGenerator.mockReturnValue({
    optimising: true,
    result: null,
    error: null,
    run: mockRun
  });

  render(<GenerateRosterPanel />);

  // Verify no toast was called
  expect(mockToast).not.toHaveBeenCalled();
});

test("clicking generate button triggers roster generation", async () => {
  mockUseRosterGenerator.mockReturnValue({
    optimising: false,
    result: null,
    error: null,
    run: mockRun
  });

  render(<GenerateRosterPanel />);

  // Find and click the generate button
  const generateButton = screen.getByRole("button", { name: /Generate roster/i });
  fireEvent.click(generateButton);

  // Verify the run function was called
  await waitFor(() => {
    expect(mockRun).toHaveBeenCalled();
  });
});