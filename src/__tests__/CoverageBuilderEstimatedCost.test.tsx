import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CoverageBuilderModal from "@/components/CoverageBuilderModal";

/**
 * 8h system sanity:
 *  - Set Monday E=5, apply to all days → E shifts = 35; hours = 35*8 = 280h.
 *  - With £20/hr average, E cost = £5,600; overall = £5,600.
 */
test("8h system rough weekly wage cost reflects rate × hours", () => {
  render(
    <CoverageBuilderModal
      open={true}
      onClose={()=>{}}
      shiftSystem="8h"
      initialJSON={`{}`}
      onSaveJSON={()=>{}}
    />
  );

  // Set average hourly rate to £20.00
  const rateInput = screen.getByLabelText(/Avg hourly rate/i) as HTMLInputElement;
  fireEvent.change(rateInput, { target: { value: "20" } });

  // Monday E=5 then apply to all
  fireEvent.click(screen.getByText("Mon"));
  const inputs = screen.getAllByRole("spinbutton");
  fireEvent.change(inputs[0], { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: /Apply this day/i }));

  // Expect overall cost £5,600
  expect(screen.getByText(/Estimated weekly wage cost \(rough\):/i)).toBeInTheDocument();
  expect(screen.getByText(/Overall:/i).nextSibling?.textContent?.replace(/[\s,£]/g,"")).toContain("5600");
});

/**
 * 12h system sanity:
 *  - Set Monday D=2, apply to all days → D shifts = 14; hours = 14*12 = 168h.
 *  - With £15/hr, D cost = 168*15 = £2,520.
 */
test("12h system rough weekly wage cost reflects rate × hours", () => {
  render(
    <CoverageBuilderModal
      open={true}
      onClose={()=>{}}
      shiftSystem="12h"
      initialJSON={`{}`}
      onSaveJSON={()=>{}}
    />
  );

  const rateInput = screen.getByLabelText(/Avg hourly rate/i) as HTMLInputElement;
  fireEvent.change(rateInput, { target: { value: "15" } });

  // Monday D=2 then apply
  const nums = screen.getAllByRole("spinbutton");
  fireEvent.change(nums[0], { target: { value: "2" } }); // D
  fireEvent.click(screen.getByRole("button", { name: /Apply this day/i }));

  // Expect Shift D cost ~ £2,520
  expect(screen.getByText("£2,520")).toBeInTheDocument();
});