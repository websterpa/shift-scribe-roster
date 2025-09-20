import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RosterWizard from "@/components/RosterWizard";

// Mock hooks
const mockToast = vi.fn();
const mockRun = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

vi.mock('@/hooks/useRosterGenerator', () => ({
  useRosterGenerator: () => ({
    optimising: false,
    result: null,
    error: null,
    run: mockRun
  })
}));

vi.mock('@/utils/coveragePresets', () => ({
  computeWeeklyTotals: vi.fn(() => ({
    byShift: { E: 10, L: 10, N: 5 },
    overall: 25
  })),
  computeEstimatedWeeklyHours: vi.fn(() => ({
    byShift: { E: 80, L: 80, N: 40 },
    overall: 200
  }))
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

test("help panel toggles and updates per step", () => {
  renderWithRouter(<RosterWizard />);
  fireEvent.click(screen.getByRole("button", { name: /Show Help/i }));
  expect(screen.getByRole("dialog", { name: /Wizard Help/i })).toBeInTheDocument();
  // Should mention Basics guidance initially
  expect(screen.getByText(/Basics sets your shift system/i)).toBeInTheDocument();

  // Go to Pattern and ensure content changes
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));
  expect(screen.getByText(/Pattern is the rota template/i)).toBeInTheDocument();
});

test("Staffing Levels label appears instead of Coverage", () => {
  renderWithRouter(<RosterWizard />);
  // Navigate to the third step
  fireEvent.click(screen.getByRole("button", { name: /Next/i })); // Pattern
  fireEvent.click(screen.getByRole("button", { name: /Next/i })); // Staffing Levels
  expect(screen.getByText(/Staffing Levels/i)).toBeInTheDocument();
});