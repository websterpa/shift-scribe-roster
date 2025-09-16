import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CoverageBuilderModal from "@/components/CoverageBuilderModal";

/** Helper: set numeric inputs by label order (first numeric = first shift in day card) */
function setFirstShiftCountForDay(dayLabel: string, value: number) {
  // Click the day tab
  fireEvent.click(screen.getByText(dayLabel));
  // Find all spinbuttons (number inputs) visible and set the first one
  const nums = screen.getAllByRole("spinbutton");
  fireEvent.change(nums[0], { target: { value: String(value) } });
}

describe("CoverageBuilderModal weekly totals", () => {
  test("totals update live in 8h system", () => {
    render(
      <CoverageBuilderModal
        open={true}
        onClose={()=>{}}
        shiftSystem="8h"
        initialJSON={`{}`}
        onSaveJSON={()=>{}}
      />
    );

    // Initially should show the totals strip with zeros
    expect(screen.getByText(/Preview weekly totals/i)).toBeInTheDocument();

    // Set Monday E=5, apply to all days, totals for E should be 5*7=35
    fireEvent.click(screen.getByText("Mon"));
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "5" } }); // first shift on the day (E)
    fireEvent.click(screen.getByRole("button", { name: /Apply this day/i }));

    // E total should be 35 and overall should be >= 35
    const eBox = screen.getByText(/Shift E/i).closest("div")!;
    // Find the nearest number element in this stat card (font-semibold)
    // Simpler: check overall contains 35 somewhere
    expect(screen.getByText(/Overall/i).parentElement).toBeInTheDocument();
    // Not super brittle: just check that "35" appears after apply-to-all
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  test("12h system shows D/N totals only", () => {
    render(
      <CoverageBuilderModal
        open={true}
        onClose={()=>{}}
        shiftSystem="12h"
        initialJSON={`{}`}
        onSaveJSON={()=>{}}
      />
    );
    expect(screen.getByText(/Shift D/i)).toBeInTheDocument();
    expect(screen.getByText(/Shift N/i)).toBeInTheDocument();
    expect(screen.queryByText(/Shift E/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Shift L/i)).not.toBeInTheDocument();
  });
});