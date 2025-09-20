import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Section = {
  id: string;
  title: string;
  tags: string[];
  body: React.ReactNode;
  plainText: string;
};

export default function HelpSupport() {
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>(["intro", "core"]);

  const toggle = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const sections = useMemo<Section[]>(
    () => [
      {
        id: "intro",
        title: "Welcome to Shift Craft",
        tags: ["help", "guide", "overview"],
        body: (
          <p>
            Shift Craft is your smart rostering and workforce planning tool.
            This guide explains features and how to get the most from the app.
          </p>
        ),
        plainText: "Shift Craft smart rostering workforce planning guide help",
      },
      {
        id: "core",
        title: "Core Features",
        tags: ["roster", "staffing", "leave", "overtime", "fairness"],
        body: (
          <div className="space-y-3">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Roster Generation</strong>: Build 17-week rosters in 8h
                (E/L/N) or 12h (D/N) systems with compliance rules (11h rest,
                supervisor/night policy).
              </li>
              <li>
                <strong>Staffing Levels (Required staffing per shift)</strong>: Configure daily shift needs,
                apply patterns, and preview weekly totals, hours, and costs.
              </li>
              <li>
                <strong>Leave & Absence Codes</strong>: Use A/L, S, SP, CL to
                mark staff leave.
              </li>
              <li>
                <strong>Overtime</strong>: Fill staffing gaps with 4h+ top-ups at
                correct cost multipliers.
              </li>
              <li>
                <strong>Fairness Rules</strong>: Balance nights, weekends, and PHs
                across staff.
              </li>
            </ul>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>8h system tokens</strong>: E (Early), L (Late), N (Night), <strong>R (Rest Day)</strong></li>
                <li><strong>12h system tokens</strong>: D (Day), N (Night), <strong>R (Rest Day)</strong></li>
              </ul>
              <p className="text-sm text-slate-600 mt-2">
                <strong>R = Rest Day</strong>. Include Rest Days in patterns to ensure compliant recovery time (≥ 11h between shifts).
              </p>
            </div>
          </div>
        ),
        plainText:
          "Roster generation staffing levels builder leave absence overtime fairness",
      },
      {
        id: "patterns-config",
        title: "Patterns vs Configurations",
        tags: ["patterns", "configurations", "templates", "setup", "constraints"],
        body: (
          <div className="space-y-3">
            <p>
              <strong>Pattern</strong>: The rota template or repeating cycle that defines when staff work.
              Examples: "4D–4<strong>R</strong>–4N–4<strong>R</strong>" (12h), "2E–2L–2N–4<strong>R</strong>" (8h), or custom shift sequences.
            </p>
            <p>
              <strong>Configuration</strong>: The site-specific setup and constraints applied to patterns.
              Examples: minimum staffing levels, overtime rules, handover requirements, budget thresholds, or compliance settings.
            </p>
            <p>
              <strong>In simple terms</strong>: A pattern is <em>what</em> the schedule looks like, 
              while a configuration is <em>how</em> the rules and constraints shape that schedule for your specific workplace.
            </p>
          </div>
        ),
        plainText: "patterns configurations templates setup constraints rota cycle staff work schedule rules",
      },
      {
        id: "budget",
        title: "Cost & Budget Features",
        tags: ["costs", "budget", "variance", "threshold"],
        body: (
          <ul className="list-disc list-inside space-y-1">
            <li>
              Estimate weekly costs with staff vs supervisor rates, blended per
              shift.
            </li>
            <li>Budget variance reporting (under/over budget).</li>
            <li>
              Configurable over-budget warning threshold (e.g., £500 site
              setting).
            </li>
          </ul>
        ),
        plainText:
          "cost budget variance threshold staff supervisor rates weekly wage",
      },
      {
        id: "settings",
        title: "Site Settings",
        tags: ["supabase", "site defaults", "autosave"],
        body: (
          <ul className="list-disc list-inside space-y-1">
            <li>
              Store defaults (rates, mixes, threshold) in Supabase per site.
            </li>
            <li>Auto-load settings when panel opens.</li>
            <li>
              Save defaults with a toggle or autosave threshold (debounced).
            </li>
          </ul>
        ),
        plainText: "site settings supabase defaults save autosave",
      },
      {
        id: "previews",
        title: "Real-time Previews",
        tags: ["preview", "live updates"],
        body: (
          <p>
            Totals, hours, costs, and variance all update live as you edit
            staffing levels, rates, or mixes, giving visibility before saving.
          </p>
        ),
        plainText: "real time previews totals hours costs variance",
      },
      {
        id: "toasts",
        title: "Toast Notifications",
        tags: ["toast", "feedback", "alerts"],
        body: (
          <ul className="list-disc list-inside space-y-1">
            <li>Roster generated successfully 🎉</li>
            <li>Defaults saved ✅</li>
            <li>Threshold saved ✅</li>
            <li>Warning: Over budget ⚠️</li>
            <li>Error saving ❌</li>
          </ul>
        ),
        plainText: "toast notifications success error budget defaults roster",
      },
      {
        id: "extra",
        title: "Extra Features",
        tags: ["role mix", "presets", "accessibility"],
        body: (
          <ul className="list-disc list-inside space-y-1">
            <li>Role mix sliders: set % Supervisors vs Staff per shift.</li>
            <li>Preset staffing patterns for quick setup.</li>
            <li>Optimisation progress indicator (up to 5s).</li>
            <li>Accessible labels, error states, keyboard support.</li>
          </ul>
        ),
        plainText: "role mix presets optimisation progress accessibility",
      },
      {
        id: "token-cheatsheet",
        title: "Shift tokens cheat-sheet",
        tags: ["tokens", "legend", "rest"],
        body: (
          <div className="text-slate-700 space-y-2">
            <div><strong>E</strong> Early (8h), <strong>L</strong> Late (8h), <strong>N</strong> Night (8h/12h)</div>
            <div><strong>D</strong> Day (12h), <strong>R</strong> Rest Day</div>
            <p className="text-sm text-slate-600">
              Use <strong>R (Rest Day)</strong> to create recovery time and avoid rest-risk warnings.
            </p>
          </div>
        ),
        plainText: "tokens legend E L N D R Rest Day cheat sheet"
      }
    ],
    []
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return sections;
    const q = query.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.plainText.toLowerCase().includes(q)
    );
  }, [query, sections]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Help & Support</h1>

      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          placeholder="Search help topics..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input flex-1 mr-4"
        />
        <Link to="/" className="btn">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="space-y-4">
        {filtered.map((s) => (
          <div key={s.id} className="border rounded-xl">
            <button
              className="w-full flex justify-between items-center p-4 text-left font-semibold"
              onClick={() => toggle(s.id)}
            >
              {s.title}
              <span>{openIds.includes(s.id) ? "−" : "+"}</span>
            </button>
            {openIds.includes(s.id) && (
              <div className="p-4 border-t text-slate-700">{s.body}</div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-slate-500">No help topics found.</p>
        )}
      </div>
    </div>
  );
}