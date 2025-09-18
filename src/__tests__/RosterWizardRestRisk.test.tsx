import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import RosterWizard, { computeRestRiskBetweenDays } from "@/components/RosterWizard";

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

describe("computeRestRiskBetweenDays", () => {
  it("8h: L→E next day yields 8h rest (risk)", () => {
    const edges = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00",
      sequence: ["L","E"] as any
    });
    expect(edges[0].restHours).toBe(8);
    expect(edges[0].severity).toBe("risk");
  });

  it("8h: N→E next day yields 0h rest (risk)", () => {
    const edges = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00",
      sequence: ["N","E"] as any
    });
    expect(edges[0].restHours).toBe(0);
    expect(edges[0].severity).toBe("risk");
  });

  it("8h: E→O next day is safe (24h)", () => {
    const edges = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00",
      sequence: ["E","O"] as any
    });
    expect(edges[0].restHours).toBe(24);
    expect(edges[0].severity).toBe("ok");
  });

  it("12h: D→N next day yields 12h rest (warn)", () => {
    const edges = computeRestRiskBetweenDays({
      system: "12h",
      siteStartLocalTime: "06:00",
      sequence: ["D","N"] as any
    });
    // D ends at T+12, next N starts at next day T+12 -> rest = 24h - 12h = 12h
    expect(edges[0].restHours).toBe(12);
    expect(edges[0].severity).toBe("warn");
  });

  it("handles empty sequence", () => {
    const edges = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00",
      sequence: []
    });
    expect(edges).toHaveLength(0);
  });

  it("handles single token sequence", () => {
    const edges = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00",
      sequence: ["E"]
    });
    expect(edges).toHaveLength(0);
  });

  it("correctly classifies rest hours into severity levels", () => {
    // Test risk level (<11h)
    const riskEdges = computeRestRiskBetweenDays({
      system: "8h",
      siteStartLocalTime: "06:00",
      sequence: ["N","E"]
    });
    expect(riskEdges[0].severity).toBe("risk");
    expect(riskEdges[0].restHours).toBeLessThan(11);

    // Test warn level (11-13h)
    const warnEdges = computeRestRiskBetweenDays({
      system: "12h",
      siteStartLocalTime: "06:00",
      sequence: ["D","N"]
    });
    expect(warnEdges[0].severity).toBe("warn");
    expect(warnEdges[0].restHours).toBeGreaterThanOrEqual(11);
    expect(warnEdges[0].restHours).toBeLessThan(13);
  });
});

describe("RosterWizard Step 2 heatmap smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heatmap squares when building a custom sequence", () => {
    renderWithRouter(<RosterWizard />);
    
    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    
    // Click custom token buttons to build a risky pair (N then E)
    fireEvent.click(screen.getByRole("button", { name: "N" }));
    fireEvent.click(screen.getByRole("button", { name: "E" }));
    
    // Heatmap appears (at least one square with aria-label)
    expect(screen.getAllByLabelText(/to .*: Rest .*h/).length).toBeGreaterThan(0);
  });

  it("shows rest risk messaging", () => {
    renderWithRouter(<RosterWizard />);
    
    // Navigate to step 2
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    
    // Add tokens that create a rest risk
    fireEvent.click(screen.getByRole("button", { name: "N" }));
    fireEvent.click(screen.getByRole("button", { name: "E" }));
    
    // Should show rest risk analysis
    expect(screen.getByText(/Rest risk across the sequence/i)).toBeInTheDocument();
  });

  it("updates heatmap when sequence changes", () => {
    renderWithRouter(<RosterWizard />);
    
    // Navigate to step 2
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    
    // Add safe sequence first
    fireEvent.click(screen.getByRole("button", { name: "E" }));
    fireEvent.click(screen.getByRole("button", { name: "O" }));
    
    // Should show safe message
    expect(screen.getByText(/All adjacent days have ≥13h rest/i)).toBeInTheDocument();
    
    // Now add risky token
    fireEvent.click(screen.getByRole("button", { name: "N" }));
    
    // Should no longer show safe message
    expect(screen.queryByText(/All adjacent days have ≥13h rest/i)).not.toBeInTheDocument();
  });
});