import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CoverageBuilderModal from "@/components/CoverageBuilderModal";

// Mock Supabase defaults to known rates and mixes
jest.mock("@/services/siteSettings", () => ({
  fetchSiteRateDefaults: () => Promise.resolve({
    avgStaffRate: 10, avgSupervisorRate: 20, roleMixByShift: { E: 50, L: 0, N: 100, D: 50 }
  })
}));

/**
 * 8h scenario:
 *  - Set Monday E=5 → Apply to all days = 35 E-shifts → 35*8 = 280h (E).
 *  - With Staff £10, Supervisor £20, and E mix 50%:
 *    blended(E) = 0.5*20 + 0.5*10 = £15/hr.
 *    cost(E) = 280h * £15 = £4,200.
 */
test("8h blended cost uses role rates and per-shift mix", async () => {
  render(
    <CoverageBuilderModal
      open={true}
      onClose={()=>{}}
      shiftSystem="8h"
      initialJSON={`{}`}
      onSaveJSON={()=>{}}
    />
  );

  // Wait for defaults to apply
  await waitFor(() => expect(screen.getByDisplayValue("10")).toBeInTheDocument()); // staff rate input value

  // Set Monday E=5 and apply to all
  fireEvent.click(screen.getByText("Mon"));
  const nums = screen.getAllByRole("spinbutton");
  fireEvent.change(nums[0], { target: { value: "5" } }); // first numeric = first shift (E)
  fireEvent.click(screen.getByRole("button", { name: /Apply this day/i }));

  // We expect blended E cost ≈ £4,200
  // The line shows: "Estimated weekly wage cost (rough, blended by role): ... Shift E: £4,200.00 ..."
  expect(await screen.findByText(/Estimated weekly wage cost \(rough, blended by role\):/i)).toBeInTheDocument();
  // Allow for locale: look for 4,200
  expect(screen.getByText(/£\s*4,?200(\.00)?/)).toBeInTheDocument();
});

/**
 * 12h scenario:
 *  - Monday D=2 → Apply to all = 14 D-shifts → 14*12 = 168h.
 *  - Rates: Staff £10, Supervisor £20, D mix 50% → blended £15/hr.
 *  - cost(D) = 168 * 15 = £2,520
 */
test("12h blended cost respects system keys and sliders", async () => {
  render(
    <CoverageBuilderModal
      open={true}
      onClose={()=>{}}
      shiftSystem="12h"
      initialJSON={`{}`}
      onSaveJSON={()=>{}}
    />
  );

  await waitFor(() => expect(screen.getByDisplayValue("10")).toBeInTheDocument());

  // Monday D=2 then apply
  const nums = screen.getAllByRole("spinbutton");
  fireEvent.change(nums[0], { target: { value: "2" } }); // D
  fireEvent.click(screen.getByRole("button", { name: /Apply this day/i }));

  // Expect D cost ~ £2,520
  expect(await screen.findByText(/Estimated weekly wage cost \(rough, blended by role\):/i)).toBeInTheDocument();
  expect(screen.getByText(/£\s*2,?520(\.00)?/)).toBeInTheDocument();
});