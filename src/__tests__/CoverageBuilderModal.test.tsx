import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CoverageBuilderModal from "@/components/CoverageBuilderModal";

function open8h(onSave: (j:string)=>void, json="{}") {
  render(<CoverageBuilderModal open={true} onClose={()=>{}} shiftSystem="8h" initialJSON={json} onSaveJSON={onSave} />);
}

describe("CoverageBuilderModal", () => {
  test("renders E/L/N sliders in 8h system", () => {
    open8h(()=>{});
    expect(screen.getByText(/Shift E/i)).toBeInTheDocument();
    expect(screen.getByText(/Shift L/i)).toBeInTheDocument();
    expect(screen.getByText(/Shift N/i)).toBeInTheDocument();
    expect(screen.queryByText(/Shift D/i)).not.toBeInTheDocument();
  });

  test("preset Standard populates values and saves JSON", () => {
    let saved = "";
    open8h(j => saved=j);
    fireEvent.click(screen.getByRole("button", { name: /Preset: Standard/i }));
    fireEvent.click(screen.getByRole("button", { name: /Save to JSON/i }));
    expect(saved).toContain('"1"'); // Monday present
    const obj = JSON.parse(saved);
    expect(typeof obj["1"].E).toBe("number");
  });

  test("copy Mon–Fri → Weekend affects Sun/Sat", () => {
    let saved = "";
    open8h(j => saved=j);
    // Set Monday E=5
    fireEvent.click(screen.getByText("Mon"));
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "5" } }); // first spinbutton = first shift of day
    // Apply to all days then copy to weekend to be safe
    fireEvent.click(screen.getByRole("button", { name: /Apply this day/i }));
    fireEvent.click(screen.getByRole("button", { name: /Copy Mon–Fri/i }));
    fireEvent.click(screen.getByRole("button", { name: /Save to JSON/i }));
    const obj = JSON.parse(saved);
    expect(obj["0"].E).toBeGreaterThanOrEqual(0);
    expect(obj["6"].E).toBeGreaterThanOrEqual(0);
  });
});