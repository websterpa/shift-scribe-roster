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

test("coverage grid is horizontally scrollable and inputs are fluid", () => {
  renderWithRouter(<RosterWizard />);
  
  // Step 1 -> Step 2 -> Step 3
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));

  // overflow-x-auto container exists
  const scroller = screen.getByText("Sun").closest("div")?.parentElement?.parentElement;
  expect(scroller).toHaveClass("overflow-x-auto");

  // inputs under coverage should be full width inside their containers
  const anyNumberInput = screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
  expect(anyNumberInput.className).toMatch(/w-full/);
});