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

beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear();
});

test("inline tips toggle shows and hides tips", () => {
  renderWithRouter(<RosterWizard />);

  // Initially off
  expect(screen.queryByRole("note")).not.toBeInTheDocument();

  // Turn on
  fireEvent.click(screen.getByLabelText(/Toggle inline tips/i));
  expect(screen.getAllByRole("note").length).toBeGreaterThan(0);

  // Turn off again
  fireEvent.click(screen.getByLabelText(/Toggle inline tips/i));
  expect(screen.queryByRole("note")).not.toBeInTheDocument();
});

test("inline tips persist via localStorage", () => {
  // Turn on
  const { unmount } = renderWithRouter(<RosterWizard />);
  fireEvent.click(screen.getByLabelText(/Toggle inline tips/i));
  unmount();

  // Remount - should still be on
  renderWithRouter(<RosterWizard />);
  expect(screen.getByLabelText(/Toggle inline tips/i)).toBeChecked();
  expect(screen.getAllByRole("note").length).toBeGreaterThan(0);
});

test("inline tips show step-specific content", () => {
  renderWithRouter(<RosterWizard />);
  fireEvent.click(screen.getByLabelText(/Toggle inline tips/i));

  // Step 1 should show basics content
  expect(screen.getByText(/Choose.*8h.*or.*12h/i)).toBeInTheDocument();

  // Navigate to step 2
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));
  expect(screen.getByText(/R = Rest Day/i)).toBeInTheDocument();

  // Navigate to step 3 
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));
  expect(screen.getByText(/Start with a preset/i)).toBeInTheDocument();
});