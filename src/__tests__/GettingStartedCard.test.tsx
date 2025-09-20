import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import RosterWizard from "@/components/RosterWizard";

// Mock useRosterGenerator hook
jest.mock("@/hooks/useRosterGenerator", () => ({
  useRosterGenerator: () => ({
    optimising: false,
    result: null,
    error: null,
    run: jest.fn()
  })
}));

// Mock useToast hook
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock services/patterns
jest.mock("@/services/patterns", () => ({
  listPatterns: jest.fn().mockResolvedValue([]),
  savePattern: jest.fn(),
  deletePattern: jest.fn()
}));

function resetLS() {
  try { localStorage.removeItem("wizard:hideIntro"); } catch {}
}

const RosterWizardWrapper = () => (
  <BrowserRouter>
    <RosterWizard />
  </BrowserRouter>
);

describe("Getting Started card", () => {
  beforeEach(() => {
    resetLS();
    jest.clearAllMocks();
  });

  test("shows by default for first-time users and can collapse", () => {
    render(<RosterWizardWrapper />);
    expect(screen.getByRole("heading", { name: /Getting Started/i })).toBeInTheDocument();
    
    // Collapse
    fireEvent.click(screen.getByRole("button", { name: /Collapse/i }));
    expect(screen.queryByText(/Welcome to the Roster Wizard/i)).not.toBeInTheDocument();
    
    // Expand
    fireEvent.click(screen.getByRole("button", { name: /Expand/i }));
    expect(screen.getByText(/Welcome to the Roster Wizard/i)).toBeInTheDocument();
  });

  test("Don't show again persists via localStorage", () => {
    const { unmount } = render(<RosterWizardWrapper />);
    fireEvent.click(screen.getByRole("button", { name: /Don't show again/i }));
    
    // Unmount/remount
    unmount();
    render(<RosterWizardWrapper />);
    
    // Card should be hidden now
    expect(screen.queryByRole("heading", { name: /Getting Started/i })).not.toBeInTheDocument();
  });

  test("contains expected content and links", () => {
    render(<RosterWizardWrapper />);
    
    expect(screen.getByText(/Welcome to the Roster Wizard/i)).toBeInTheDocument();
    expect(screen.getByText(/How it works/i)).toBeInTheDocument();
    expect(screen.getByText(/Key terms/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Help & Support/i })).toBeInTheDocument();
  });
});