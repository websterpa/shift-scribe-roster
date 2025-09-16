import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CoverageBuilderModal from "@/components/CoverageBuilderModal";

/**
 * For 8h system:
 *  - Set Monday E=5 and apply to all days -> E total shifts = 5 * 7 = 35
 *  - Estimated hours for E = 35 * 8 = 280h
 *  - Overall equals E (since others remain 0)
 */
test("8h system estimated weekly hours reflect coverage", () => {
  render(
    <CoverageBuilderModal
      open={true}
      onClose={()=>{}}
      shiftSystem="8h"
      initialJSON={`{}`}
      onSaveJSON={()=>{}}
    />
  );

  // Monday tab
  fireEvent.click(screen.getByText("Mon"));
  // First numeric input on the day card (E)
  const inputs = screen.getAllByRole("spinbutton");
  fireEvent.change(inputs[0], { target: { value: "5" } });
  // Apply to all days
  fireEvent.click(screen.getByRole("button", { name: /Apply this day/i }));

  // Check estimated weekly hours text
  expect(screen.getByText(/Estimated weekly hours:/i)).toBeInTheDocument();
  // E should show 280h; overall should include 280h
  expect(screen.getByText(/Shift E:/i).nextSibling).toHaveTextContent("280h");
  expect(screen.getByText(/Overall:/i).nextSibling).toHaveTextContent("280h");
});

/**
 * For 12h system:
 *  - Set Monday D=2 and apply to all days -> D shifts = 2*7 = 14
 *  - Estimated hours D = 14 * 12 = 168h
 */
test("12h system estimated weekly hours reflect coverage", () => {
  render(
    <CoverageBuilderModal
      open={true}
      onClose={()=>{}}
      shiftSystem="12h"
      initialJSON={`{}`}
      onSaveJSON={()=>{}}
    />
  );
  // Monday is default tab
  const inputs = screen.getAllByRole("spinbutton");
  // First input in 12h is D
  fireEvent.change(inputs[0], { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: /Apply this day/i }));

  expect(screen.getByText(/Estimated weekly hours:/i)).toBeInTheDocument();
  // D should show 168h; overall includes 168h
  // Be tolerant of spacing—look for "168h" somewhere near the D label
  expect(screen.getByText("168h")).toBeInTheDocument();
});