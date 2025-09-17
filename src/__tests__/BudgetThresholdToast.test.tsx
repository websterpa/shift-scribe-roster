import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import GenerateRosterPanel from "@/components/GenerateRosterPanel";
import { vi } from "vitest";

// Mock site defaults to threshold = 500
vi.mock("@/services/siteSettings", () => ({
  fetchSiteRateDefaults: () => Promise.resolve({
    avgStaffRate: 18,
    avgSupervisorRate: 24, 
    roleMixByShift: {},
    budgetWarnThreshold: 500
  }),
  saveSiteRateDefaults: () => Promise.resolve(true)
}));

// Mock the toast function
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: mockToast
}));

// Spy on useRosterGenerator to inject a fake run(result)
vi.mock("@/hooks/useRosterGenerator", () => {
  return {
    useRosterGenerator: () => ({
      optimising: false,
      error: null,
      result: null,
      run: async () => {
        // no-op; we will simulate the post-run state via UI since the real code shows toasts after result
      }
    })
  };
});

beforeEach(() => {
  mockToast.mockClear();
});

test("loads threshold from site settings and allows modification", async () => {
  render(<GenerateRosterPanel />);

  // Threshold should load to 500
  const threshInput = await waitFor(() => 
    screen.getByDisplayValue("500")
  );
  
  expect(threshInput).toBeInTheDocument();
  expect((threshInput as HTMLInputElement).value).toBe("500");

  // Should be able to change the threshold
  fireEvent.change(threshInput, { target: { value: "1000" } });
  expect((threshInput as HTMLInputElement).value).toBe("1000");
});

test("threshold input has correct attributes", async () => {
  render(<GenerateRosterPanel />);

  const threshInput = await waitFor(() => 
    screen.getByDisplayValue("500")
  );

  expect(threshInput).toHaveAttribute("type", "number");
  expect(threshInput).toHaveAttribute("min", "0");
  expect(threshInput).toHaveAttribute("step", "1");
});

test("displays threshold explanation text", async () => {
  render(<GenerateRosterPanel />);

  const explanationText = await screen.findByText(/We'll only warn if variance exceeds this amount/);
  expect(explanationText).toBeInTheDocument();
  expect(explanationText).toHaveTextContent("We'll only warn if variance exceeds this amount (e.g., 500 ⇒ warn when over budget by more than £500).");
});