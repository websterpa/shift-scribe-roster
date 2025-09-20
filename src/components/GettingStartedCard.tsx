import React from "react";
import { Link } from "react-router-dom";

type Props = {
  open: boolean;
  onToggle: (open: boolean) => void;
  onNeverShowAgain: () => void;
};

export default function GettingStartedCard({ open, onToggle, onNeverShowAgain }: Props) {
  return (
    <section
      className="rounded-2xl border bg-card text-card-foreground shadow-sm mb-4"
      aria-labelledby="gs-title"
    >
      <header className="flex items-center justify-between p-4">
        <h2 id="gs-title" className="text-base font-semibold">Getting Started</h2>
        <button
          className="px-3 py-2 rounded-lg border bg-background hover:bg-accent hover:text-accent-foreground text-sm"
          aria-expanded={open}
          aria-controls="gs-panel"
          onClick={() => onToggle(!open)}
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </header>

      {open && (
        <div id="gs-panel" className="p-4 pt-0 text-sm text-muted-foreground space-y-4">
          <p><b>Welcome to the Roster Wizard.</b> This tool guides you step-by-step to build a fair, compliant roster that fits your staffing needs and budget.</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-3">
              <h3 className="font-medium mb-1 text-foreground">How it works</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li><b>Basics</b> — choose 8h/12h, site start time, timezone, horizon.</li>
                <li><b>Pattern</b> — define the repeating sequence (E/L/N/D) and <b>R</b> (Rest Day).</li>
                <li><b>Staffing Levels</b> — how many people per shift per day.</li>
                <li><b>Rates & Budget</b> — set rates, role mix %, and warning threshold.</li>
                <li><b>Review & Generate</b> — check totals and generate (short optimisation).</li>
              </ol>
            </div>

            <div className="rounded-xl border p-3">
              <h3 className="font-medium mb-1 text-foreground">Key terms</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><b>8h</b>: E (Early), L (Late), N (Night)</li>
                <li><b>12h</b>: D (Day), N (Night)</li>
                <li><b>R (Rest Day)</b>: a scheduled day off; ensure ≥ 11h between shifts.</li>
                <li><b>Staffing Levels</b>: required people per shift per day.</li>
                <li><b>Heatmap</b>: 🟢 ≥13h, 🟡 11–13h, 🔴 &lt;11h rest between adjacent days.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link 
              to="/help" 
              className="px-3 py-2 rounded-lg border bg-background hover:bg-accent hover:text-accent-foreground text-sm"
            >
              Open Help & Support
            </Link>
            <button
              className="px-3 py-2 rounded-lg border bg-background hover:bg-accent hover:text-accent-foreground text-sm"
              onClick={onNeverShowAgain}
              aria-label="Don't show Getting Started again"
            >
              Don't show again
            </button>
          </div>
        </div>
      )}
    </section>
  );
}