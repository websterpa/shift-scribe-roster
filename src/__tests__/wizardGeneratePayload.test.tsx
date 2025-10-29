// TODO: Migrate to @/services/roster by 2025-11-15
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import RosterWizard from "@/components/RosterWizard";

// Mock hook to verify payload
vi.mock("@/hooks/useRosterGenerator", () => {
  return {
    useRosterGenerator: () => {
      return {
        optimising: false,
        result: null,
        error: null,
        run: vi.fn().mockImplementation(async (payload) => {
          if (!Array.isArray(payload.patternSequence)) {
            throw new Error("patternSequence not array");
          }
          return { ok: true };
        })
      };
    }
  };
});

// Mock toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

test("Wizard passes patternSequence array to generator", async () => {
  render(<RosterWizard />);

  // to Step 5 quickly
  fireEvent.click(screen.getByRole("button", { name: /Next/i })); // Pattern
  fireEvent.click(screen.getByRole("button", { name: /Next/i })); // Coverage
  fireEvent.click(screen.getByRole("button", { name: /Next/i })); // Rates
  fireEvent.click(screen.getByRole("button", { name: /Next/i })); // Review

  // Generate should not throw
  fireEvent.click(screen.getByRole("button", { name: /Generate roster/i }));
  expect(await screen.findByText(/Generation complete|Roster generated successfully/i, {}, { timeout: 1500 })).toBeTruthy();
});