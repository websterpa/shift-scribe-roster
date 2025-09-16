import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import GenerateRosterPanel from "@/components/GenerateRosterPanel";

describe("GenerateRosterPanel", () => {
  test("renders form and triggers generation with progress banner", async () => {
    render(<GenerateRosterPanel />);

    expect(screen.getByText("Generate Roster")).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /Generate roster/i });
    fireEvent.click(btn);

    // Shows progress banner immediately (optimising)
    expect(await screen.findByText(/Optimising roster \(up to 5s\)…/i)).toBeInTheDocument();

    // Eventually summary appears (stubbed hook returns ok after ~800ms)
    await waitFor(() => {
      expect(screen.getByText(/Roster Summary/i)).toBeInTheDocument();
    });

    // Budget variance label renders even if no budget set
    expect(screen.getByText(/Budget variance/i)).toBeInTheDocument();
  });

  test("prevents mixing 8h coverage with 12h codes", async () => {
    render(<GenerateRosterPanel />);
    const select = screen.getByDisplayValue("8h (E/L/N)") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "12h" } });

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: `{ "1": { "E": 2, "L": 1, "N": 1 } }` } });

    const btn = screen.getByRole("button", { name: /Generate roster/i });
    // Alert is used to block submit; mock it to avoid error
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    fireEvent.click(btn);
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});