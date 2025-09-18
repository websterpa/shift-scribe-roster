import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import HelpSupport from "@/pages/HelpSupport";

function renderWithRouter(initialEntries: string[] = ["/help"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <HelpSupport />
    </MemoryRouter>
  );
}

describe("HelpSupport page", () => {
  test("renders the main title and all section headings", () => {
    renderWithRouter();

    // Main title
    expect(screen.getByRole("heading", { name: /Help & Support/i })).toBeInTheDocument();

    // Section headings (accordion headers)
    expect(screen.getByRole("button", { name: /Welcome to Shift Craft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Core Features/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Patterns vs Configurations/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cost & Budget Features/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Site Settings/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Real-time Previews/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Toast Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Extra Features/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shift tokens cheat-sheet/i })).toBeInTheDocument();
  });

  test("accordion expand/collapse toggles corresponding panel content", () => {
    renderWithRouter();

    const coreBtn = screen.getByRole("button", { name: /Core Features/i });

    // Core may be open by default (openIds: ["intro", "core"]). Collapse it first.
    fireEvent.click(coreBtn);
    // After collapse, the body content shouldn't be visible
    expect(screen.queryByText(/Roster Generation/i)).not.toBeInTheDocument();

    // Expand it again
    fireEvent.click(coreBtn);
    expect(screen.getByText(/Roster Generation/i)).toBeInTheDocument();
  });

  test("search filters topics by title/tags/body text", () => {
    renderWithRouter();

    const search = screen.getByPlaceholderText(/Search help topics/i);

    // Search for a unique term from the Cost & Budget section
    fireEvent.change(search, { target: { value: "variance" } });

    // Should include Cost & Budget Features, exclude unrelated ones
    expect(screen.getByRole("button", { name: /Cost & Budget Features/i })).toBeInTheDocument();

    // Some others should be filtered out of the list (not rendered at all)
    expect(screen.queryByRole("button", { name: /Extra Features/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Toast Notifications/i })).not.toBeInTheDocument();

    // Clear search shows all again
    fireEvent.change(search, { target: { value: "" } });
    expect(screen.getByRole("button", { name: /Extra Features/i })).toBeInTheDocument();
  });

  test("Back to Dashboard is a link to '/'", () => {
    renderWithRouter();
    const back = screen.getByRole("link", { name: /Back to Dashboard/i });
    expect(back).toHaveAttribute("href", "/");
  });

  test("renders Patterns vs Configurations section and shows body text when expanded", () => {
    renderWithRouter();
    
    const patternsConfigButton = screen.getByRole("button", { name: /Patterns vs Configurations/i });
    expect(patternsConfigButton).toBeInTheDocument();
    
    fireEvent.click(patternsConfigButton);
    
    expect(screen.getByText(/rota template or repeating cycle/i)).toBeInTheDocument();
    expect(screen.getByText(/site-specific setup and constraints/i)).toBeInTheDocument();
  });

  test("finds Patterns vs Configurations section via search", () => {
    renderWithRouter();
    
    const searchInput = screen.getByPlaceholderText(/Search help topics/i);
    fireEvent.change(searchInput, { target: { value: "patterns" } });
    
    expect(screen.getByRole("button", { name: /Patterns vs Configurations/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Extra Features/i })).not.toBeInTheDocument();
    
    // Also test "configurations" search
    fireEvent.change(searchInput, { target: { value: "configurations" } });
    expect(screen.getByRole("button", { name: /Patterns vs Configurations/i })).toBeInTheDocument();
  });

  test("token cheat-sheet section shows shift token explanations", () => {
    renderWithRouter();
    
    const tokenButton = screen.getByRole("button", { name: /Shift tokens cheat-sheet/i });
    expect(tokenButton).toBeInTheDocument();
    
    fireEvent.click(tokenButton);
    
    // Check for token explanations
    expect(screen.getByText(/E.*Early.*8h/i)).toBeInTheDocument();
    expect(screen.getByText(/L.*Late.*8h/i)).toBeInTheDocument();
    expect(screen.getByText(/N.*Night.*8h\/12h/i)).toBeInTheDocument();
    expect(screen.getByText(/D.*Day.*12h/i)).toBeInTheDocument();
    expect(screen.getByText(/R.*Rest Day/i)).toBeInTheDocument();
    expect(screen.getByText(/Use.*R.*Rest Day.*to create recovery time/i)).toBeInTheDocument();
  });

  test("finds token cheat-sheet via search", () => {
    renderWithRouter();
    
    const searchInput = screen.getByPlaceholderText(/Search help topics/i);
    fireEvent.change(searchInput, { target: { value: "tokens" } });
    
    expect(screen.getByRole("button", { name: /Shift tokens cheat-sheet/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Extra Features/i })).not.toBeInTheDocument();
    
    // Also test "Rest Day" search
    fireEvent.change(searchInput, { target: { value: "Rest Day" } });
    expect(screen.getByRole("button", { name: /Shift tokens cheat-sheet/i })).toBeInTheDocument();
  });

  test("help page documents R = Rest Day", () => {
    renderWithRouter();
    // Expand Core Features or search if needed
    expect(screen.getByText(/R \(Rest Day\)/i)).toBeInTheDocument();
  });
});
