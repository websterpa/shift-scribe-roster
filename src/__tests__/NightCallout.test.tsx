import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import NightCallout from "@/components/NightCallout";

describe("NightCallout", () => {
  const mockTokenCounts = { D: 120, R: 60, N: 0 };
  
  test("renders night callout with token counts", () => {
    render(
      <NightCallout
        reason="not-generated"
        tokenCounts={mockTokenCounts}
      />
    );
    
    expect(screen.getByText("Night shifts aren't present in this roster version")).toBeInTheDocument();
    expect(screen.getByText(/Token counts: D:120 • R:60 • N:0/)).toBeInTheDocument();
  });

  test("shows action buttons when handlers provided", () => {
    const onRegenerate = jest.fn();
    const onOpenWizard = jest.fn();
    
    render(
      <NightCallout
        reason="not-generated"
        tokenCounts={mockTokenCounts}
        onRegenerateNights={onRegenerate}
        onOpenWizard={onOpenWizard}
      />
    );
    
    expect(screen.getByRole("button", { name: /Regenerate with Nights/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Wizard/ })).toBeInTheDocument();
  });

  test("calls regenerate handler when button clicked", () => {
    const onRegenerate = jest.fn();
    
    render(
      <NightCallout
        reason="not-generated"
        tokenCounts={mockTokenCounts}
        onRegenerateNights={onRegenerate}
      />
    );
    
    fireEvent.click(screen.getByRole("button", { name: /Regenerate with Nights/ }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  test("calls wizard handler when button clicked", () => {
    const onOpenWizard = jest.fn();
    
    render(
      <NightCallout
        reason="not-generated"
        tokenCounts={mockTokenCounts}
        onOpenWizard={onOpenWizard}
      />
    );
    
    fireEvent.click(screen.getByRole("button", { name: /Open Wizard/ }));
    expect(onOpenWizard).toHaveBeenCalledTimes(1);
  });

  test("handles empty token counts", () => {
    render(
      <NightCallout
        reason="not-generated"
        tokenCounts={{}}
      />
    );
    
    expect(screen.getByText("Night shifts aren't present in this roster version")).toBeInTheDocument();
    // Should not show token counts section when empty
    expect(screen.queryByText(/Token counts:/)).not.toBeInTheDocument();
  });
});