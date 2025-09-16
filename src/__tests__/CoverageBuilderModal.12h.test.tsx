import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CoverageBuilderModal from "@/components/CoverageBuilderModal";

test("12h system shows D/N, not E/L", () => {
  render(<CoverageBuilderModal open={true} onClose={()=>{}} shiftSystem="12h" initialJSON="{}" onSaveJSON={()=>{}} />);
  expect(screen.getByText(/Shift D/i)).toBeInTheDocument();
  expect(screen.getByText(/Shift N/i)).toBeInTheDocument();
  expect(screen.queryByText(/Shift E/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Shift L/i)).not.toBeInTheDocument();
});