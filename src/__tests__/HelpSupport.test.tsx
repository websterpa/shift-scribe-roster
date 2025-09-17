import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import HelpSupport from "@/pages/HelpSupport";

// Mock router for testing
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe("HelpSupport", () => {
  it("renders all sections", () => {
    renderWithRouter(<HelpSupport />);
    
    // Check main elements
    expect(screen.getByText("Help & Support")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search help topics...")).toBeInTheDocument();
    expect(screen.getByText("← Back to Dashboard")).toBeInTheDocument();
    
    // Check that default sections are present
    expect(screen.getByText("Welcome to Shift Craft")).toBeInTheDocument();
    expect(screen.getByText("Core Features")).toBeInTheDocument();
    expect(screen.getByText("Cost & Budget Features")).toBeInTheDocument();
    expect(screen.getByText("Site Settings")).toBeInTheDocument();
    expect(screen.getByText("Real-time Previews")).toBeInTheDocument();
    expect(screen.getByText("Toast Notifications")).toBeInTheDocument();
    expect(screen.getByText("Extra Features")).toBeInTheDocument();
  });

  it("has correct default expanded sections", () => {
    renderWithRouter(<HelpSupport />);
    
    // Welcome and Core Features should be expanded by default
    expect(screen.getByText(/Shift Craft is your smart rostering/)).toBeInTheDocument();
    expect(screen.getByText(/Roster Generation.*Build 17-week rosters/)).toBeInTheDocument();
    
    // Other sections should be collapsed by default (content not visible)
    expect(screen.queryByText(/Estimate weekly costs with staff/)).not.toBeInTheDocument();
  });

  it("toggles accordion expand/collapse on click", () => {
    renderWithRouter(<HelpSupport />);
    
    const budgetSection = screen.getByText("Cost & Budget Features");
    
    // Initially collapsed - content not visible
    expect(screen.queryByText(/Estimate weekly costs with staff/)).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(budgetSection);
    expect(screen.getByText(/Estimate weekly costs with staff/)).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(budgetSection);
    expect(screen.queryByText(/Estimate weekly costs with staff/)).not.toBeInTheDocument();
  });

  it("shows correct expand/collapse icons", () => {
    renderWithRouter(<HelpSupport />);
    
    // Welcome section should show "−" (expanded)
    const welcomeButton = screen.getByRole("button", { name: /Welcome to Shift Craft/ });
    expect(within(welcomeButton).getByText("−")).toBeInTheDocument();
    
    // Budget section should show "+" (collapsed)
    const budgetButton = screen.getByRole("button", { name: /Cost & Budget Features/ });
    expect(within(budgetButton).getByText("+")).toBeInTheDocument();
    
    // Click budget to expand - should change to "−"
    fireEvent.click(budgetButton);
    expect(within(budgetButton).getByText("−")).toBeInTheDocument();
  });

  it("filters sections by search query", () => {
    renderWithRouter(<HelpSupport />);
    
    const searchInput = screen.getByPlaceholderText("Search help topics...");
    
    // Search for "budget"
    fireEvent.change(searchInput, { target: { value: "budget" } });
    
    // Should show budget-related sections
    expect(screen.getByText("Cost & Budget Features")).toBeInTheDocument();
    
    // Should hide unrelated sections
    expect(screen.queryByText("Welcome to Shift Craft")).not.toBeInTheDocument();
    expect(screen.queryByText("Core Features")).not.toBeInTheDocument();
    expect(screen.queryByText("Real-time Previews")).not.toBeInTheDocument();
  });

  it("filters by section tags", () => {
    renderWithRouter(<HelpSupport />);
    
    const searchInput = screen.getByPlaceholderText("Search help topics...");
    
    // Search for "toast" (tag in Toast Notifications section)
    fireEvent.change(searchInput, { target: { value: "toast" } });
    
    // Should show Toast Notifications section
    expect(screen.getByText("Toast Notifications")).toBeInTheDocument();
    
    // Should hide other sections
    expect(screen.queryByText("Welcome to Shift Craft")).not.toBeInTheDocument();
    expect(screen.queryByText("Core Features")).not.toBeInTheDocument();
  });

  it("filters by plain text content", () => {
    renderWithRouter(<HelpSupport />);
    
    const searchInput = screen.getByPlaceholderText("Search help topics...");
    
    // Search for "rostering" (in plain text of welcome section)
    fireEvent.change(searchInput, { target: { value: "rostering" } });
    
    // Should show Welcome section
    expect(screen.getByText("Welcome to Shift Craft")).toBeInTheDocument();
    
    // Should hide other sections
    expect(screen.queryByText("Cost & Budget Features")).not.toBeInTheDocument();
    expect(screen.queryByText("Toast Notifications")).not.toBeInTheDocument();
  });

  it("shows 'no results' message when search has no matches", () => {
    renderWithRouter(<HelpSupport />);
    
    const searchInput = screen.getByPlaceholderText("Search help topics...");
    
    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });
    
    expect(screen.getByText("No help topics found.")).toBeInTheDocument();
    expect(screen.queryByText("Welcome to Shift Craft")).not.toBeInTheDocument();
  });

  it("clears search and shows all sections", () => {
    renderWithRouter(<HelpSupport />);
    
    const searchInput = screen.getByPlaceholderText("Search help topics...");
    
    // Search for something specific
    fireEvent.change(searchInput, { target: { value: "budget" } });
    expect(screen.queryByText("Welcome to Shift Craft")).not.toBeInTheDocument();
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });
    
    // All sections should be visible again
    expect(screen.getByText("Welcome to Shift Craft")).toBeInTheDocument();
    expect(screen.getByText("Core Features")).toBeInTheDocument();
    expect(screen.getByText("Cost & Budget Features")).toBeInTheDocument();
  });

  it("has correct link to dashboard", () => {
    renderWithRouter(<HelpSupport />);
    
    const backLink = screen.getByText("← Back to Dashboard");
    expect(backLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("search is case insensitive", () => {
    renderWithRouter(<HelpSupport />);
    
    const searchInput = screen.getByPlaceholderText("Search help topics...");
    
    // Search with different cases
    fireEvent.change(searchInput, { target: { value: "BUDGET" } });
    expect(screen.getByText("Cost & Budget Features")).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: "Budget" } });
    expect(screen.getByText("Cost & Budget Features")).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: "budget" } });
    expect(screen.getByText("Cost & Budget Features")).toBeInTheDocument();
  });

  it("maintains accordion state during search", () => {
    renderWithRouter(<HelpSupport />);
    
    // Expand budget section
    const budgetButton = screen.getByRole("button", { name: /Cost & Budget Features/ });
    fireEvent.click(budgetButton);
    expect(screen.getByText(/Estimate weekly costs with staff/)).toBeInTheDocument();
    
    // Search for budget
    const searchInput = screen.getByPlaceholderText("Search help topics...");
    fireEvent.change(searchInput, { target: { value: "budget" } });
    
    // Budget section should still be expanded
    expect(screen.getByText(/Estimate weekly costs with staff/)).toBeInTheDocument();
    expect(within(budgetButton).getByText("−")).toBeInTheDocument();
  });
});
