import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import LegacyCreateRoster from "@/pages/LegacyCreateRoster";

// Mock supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }))
};

jest.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("LegacyCreateRoster UI", () => {
  test("renders pattern selector, name input, and pattern cards container", async () => {
    renderWithRouter(<LegacyCreateRoster />);
    
    // Wait for async loading to complete
    await screen.findByText("Create Roster");
    
    // Check for required UI elements
    expect(screen.getByTestId("pattern-selector")).toBeInTheDocument();
    expect(screen.getByTestId("pattern-name-input")).toBeInTheDocument();
    
    // Pattern cards container should exist (even if empty)
    expect(screen.getByText("Available Patterns")).toBeInTheDocument();
  });

  test("shows loading state initially", () => {
    renderWithRouter(<LegacyCreateRoster />);
    
    expect(screen.getByText("Loading patterns...")).toBeInTheDocument();
  });

  test("shows empty state when no patterns available", async () => {
    renderWithRouter(<LegacyCreateRoster />);
    
    // Wait for loading to complete
    await screen.findByText("No Patterns Available");
    
    expect(screen.getByText("Configure site patterns to get started")).toBeInTheDocument();
  });
});