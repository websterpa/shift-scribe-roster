import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { vi } from 'vitest';
import RosterWizard from "@/components/RosterWizard";

// Mock the hook to simulate success result
vi.mock("@/hooks/useRosterGenerator", () => ({
  useRosterGenerator: () => ({
    // simulate success result from generator
    result: { ok: true, versionId: "550e8400-e29b-41d4-a716-446655440000" },
    optimising: false,
    error: null,
    run: vi.fn(),
  })
}));

test("shows Open Roster Summary button with versionId", () => {
  render(
    <BrowserRouter>
      <RosterWizard />
    </BrowserRouter>
  );
  
  const btn = screen.getByRole("link", { name: /Open Roster Summary/i });
  expect(btn).toBeInTheDocument();
  expect(btn).toHaveAttribute("href", expect.stringContaining("version=550e8400-e29b-41d4-a716-446655440000"));
});