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

test("staffing levels grid is horizontally scrollable and inputs are fluid", () => {
  renderWithRouter(<RosterWizard />);
  
  // Step 1 -> Step 2 -> Step 3 (Staffing Levels)
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));

  // overflow-x-auto container exists
  const scroller = screen.getByText("Sun").closest("div")?.parentElement?.parentElement;
  expect(scroller).toHaveClass("overflow-x-auto");

  // inputs under staffing levels should be full width inside their containers
  const anyNumberInput = screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
  expect(anyNumberInput.className).toMatch(/w-full/);
});

test("displays help button and panel functionality", () => {
  renderWithRouter(<RosterWizard />);
  
  // Help button should be visible
  const helpButton = screen.getByText("Show Help");
  expect(helpButton).toBeInTheDocument();
  
  // Click to show help
  fireEvent.click(helpButton);
  expect(screen.getByText("Hide Help")).toBeInTheDocument();
  expect(screen.getByText("Wizard Help")).toBeInTheDocument();
  
  // Close help panel
  fireEvent.click(screen.getByLabelText("Close help"));
  expect(screen.getByText("Show Help")).toBeInTheDocument();
});

test("shows contextual help content for different steps", () => {
  renderWithRouter(<RosterWizard />);
  
  // Show help and check Step 1 content
  fireEvent.click(screen.getByText("Show Help"));
  expect(screen.getByText(/Basics.*sets your shift system/)).toBeInTheDocument();
  
  // Go to Step 2 and check content updates
  fireEvent.click(screen.getByText("Hide Help"));
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));
  fireEvent.click(screen.getByText("Show Help"));
  expect(screen.getByText(/Pattern.*is the rota template/)).toBeInTheDocument();
  
  // Go to Step 3 and check content updates  
  fireEvent.click(screen.getByText("Hide Help"));
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));
  fireEvent.click(screen.getByText("Show Help"));
  expect(screen.getByText(/Staffing Levels.*define how many people/)).toBeInTheDocument();
});