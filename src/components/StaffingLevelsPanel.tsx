// src/components/StaffingLevelsPanel.tsx
// Shift Craft — Redesigned "Staffing Levels" step (single-file drop-in component)
// Clean grid, fluid inputs, clear labels, presets, responsive scrolling.

import * as React from "react";

export type ShiftSystem = "8h" | "12h";
type WeekdayIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type EightHourKey = "E" | "L" | "N";
type TwelveHourKey = "D" | "N";

export type CoverageShape8h = Record<WeekdayIdx, Partial<Record<EightHourKey, number>>>;
export type CoverageShape12h = Record<WeekdayIdx, Partial<Record<TwelveHourKey, number>>>;
export type CoverageShape = CoverageShape8h | CoverageShape12h;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const DEFAULT_8H: CoverageShape8h = {
  0: { E: 2, L: 2, N: 1 },
  1: { E: 3, L: 3, N: 1 },
  2: { E: 3, L: 3, N: 1 },
  3: { E: 3, L: 3, N: 1 },
  4: { E: 3, L: 3, N: 1 },
  5: { E: 3, L: 3, N: 1 },
  6: { E: 2, L: 2, N: 1 },
};
const DEFAULT_12H: CoverageShape12h = {
  0: { D: 3, N: 1 },
  1: { D: 4, N: 1 },
  2: { D: 4, N: 1 },
  3: { D: 4, N: 1 },
  4: { D: 4, N: 1 },
  5: { D: 4, N: 1 },
  6: { D: 3, N: 1 },
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function ensureInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function is8h(system: ShiftSystem) {
  return system === "8h";
}

export interface StaffingLevelsPanelProps {
  system: ShiftSystem;
  coverage: CoverageShape;
  onChange: (next: CoverageShape) => void;
  headingHelp?: React.ReactNode;
  dayLabels?: string[];
  className?: string;
}

export default function StaffingLevelsPanel(props: StaffingLevelsPanelProps) {
  const {
    system,
    coverage,
    onChange,
    headingHelp,
    dayLabels = DAY_LABELS as unknown as string[],
    className,
  } = props;

  function applyPreset(size: "Small" | "Standard" | "Large") {
    const base = deepClone(is8h(system) ? DEFAULT_8H : DEFAULT_12H) as CoverageShape;
    if (size === "Small") {
      Object.values(base as any).forEach((row: Record<string, number>) => {
        Object.keys(row).forEach((k) => (row[k] = Math.max(0, (row[k] ?? 0) - 1)));
      });
    } else if (size === "Large") {
      Object.values(base as any).forEach((row: Record<string, number>) => {
        Object.keys(row).forEach((k) => (row[k] = (row[k] ?? 0) + 1));
      });
    }
    onChange(base);
  }

  function setVal(dayIdx: WeekdayIdx, shiftKey: string, raw: number | string) {
    const n = ensureInt(typeof raw === "string" ? Number(raw) : raw);
    const next = deepClone(coverage);
    // @ts-ignore - indexing shape dynamically
    next[dayIdx] ||= {};
    // @ts-ignore
    next[dayIdx][shiftKey] = n;
    onChange(next);
  }

  const shiftKeys = is8h(system) ? (["E", "L", "N"] as const) : (["D", "N"] as const);
  const shiftLabels: Record<string, string> = is8h(system)
    ? { E: "Early (E)", L: "Late (L)", N: "Night (N)" }
    : { D: "Day (D)", N: "Night (N)" };

  return (
    <section className={className}>
      {headingHelp && (
        <div className="mb-3 rounded-xl border bg-blue-50 text-blue-900 px-3 py-2 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full border text-xs">
              ?
            </span>
            {headingHelp}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50"
          onClick={() => applyPreset("Small")}
        >
          Preset: Small
        </button>
        <button
          className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50"
          onClick={() => applyPreset("Standard")}
        >
          Preset: Standard
        </button>
        <button
          className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50"
          onClick={() => applyPreset("Large")}
        >
          Preset: Large
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px] md:min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-4">
          {dayLabels.map((d, idx) => (
            <article
              key={d}
              className="rounded-2xl border p-4 bg-white shadow-sm min-w-[220px] md:min-w-0"
              aria-label={`${d} staffing levels`}
            >
              <h3 className="font-semibold text-center mb-3">{d}</h3>

              {shiftKeys.map((k) => (
                <div key={k} className="mb-3">
                  <label className="block text-xs text-slate-500 mb-1">{shiftLabels[k]}</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full h-11 text-center rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    // @ts-ignore
                    value={ensureInt((coverage[idx as WeekdayIdx]?.[k] as number) ?? 0)}
                    onChange={(e) => setVal(idx as WeekdayIdx, k as string, e.target.value)}
                    aria-label={`${d} ${shiftLabels[k]} required headcount`}
                  />
                </div>
              ))}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}