import React, { useMemo, useState } from "react";
import {
  ShiftSystem, Coverage, parseOrDefault, serialiseCoverage,
  applyPreset, defaultCoverage, copyWeekdaysToWeekend, applyToAllDays, clamp,
  computeWeeklyTotals, computeEstimatedWeeklyHours, computeEstimatedWeeklyWageCost
} from "@/utils/coveragePresets";

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export interface CoverageBuilderProps {
  open: boolean;
  onClose: () => void;
  shiftSystem: ShiftSystem;
  initialJSON: string;
  onSaveJSON: (json: string) => void;
}

export default function CoverageBuilderModal({
  open, onClose, shiftSystem, initialJSON, onSaveJSON
}: CoverageBuilderProps) {
  const [tabDay, setTabDay] = useState(1); // default Monday
  const [coverage, setCoverage] = useState<Coverage>(() => parseOrDefault(initialJSON, shiftSystem));
  const [avgHourlyRate, setAvgHourlyRate] = useState<number>(18.0);

  // Reset when system changes or modal opens
  React.useEffect(() => {
    if (open) setCoverage(parseOrDefault(initialJSON, shiftSystem));
  }, [open, initialJSON, shiftSystem]);

  const keys = useMemo(() => shiftSystem === "8h" ? (["E","L","N"] as const) : (["D","N"] as const), [shiftSystem]);
  const totals = useMemo(() => computeWeeklyTotals(shiftSystem, coverage), [shiftSystem, coverage]);
  const estHours = useMemo(() => computeEstimatedWeeklyHours(shiftSystem, coverage), [shiftSystem, coverage]);
  const estCost = useMemo(() => computeEstimatedWeeklyWageCost(estHours, avgHourlyRate), [estHours, avgHourlyRate]);

  function setDayShift(d: number, k: string, v: number) {
    setCoverage(prev => {
      const next = structuredClone(prev);
      (next[d as 0|1|2|3|4|5|6] as any)[k] = clamp(v);
      return next;
    });
  }

  function preset(size: "Small"|"Standard"|"Large") {
    setCoverage(applyPreset(shiftSystem, size));
  }
  function copyWeekdays() { setCoverage(prev => copyWeekdaysToWeekend(prev, shiftSystem)); }
  function applyAll() {
    // Read current tab's values as a template
    const t = coverage[tabDay as 0|1|2|3|4|5|6];
    setCoverage(prev => applyToAllDays(prev, shiftSystem, t));
  }
  function clearAll() { setCoverage(defaultCoverage(shiftSystem)); }
  function save() { onSaveJSON(serialiseCoverage(coverage)); onClose(); }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30">
      <div className="w-full md:max-w-3xl bg-white rounded-t-2xl md:rounded-2xl shadow-lg">
        <div className="p-4 md:p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-semibold">Preset Coverage Builder</h3>
            <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>✕</button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            System: {shiftSystem === "8h" ? "8h (E/L/N)" : "12h (D/N)"} — set headcount per shift.
          </p>
        </div>

        <div className="p-4 md:p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {DAY_LABELS.map((d, i) => (
              <button
                key={i}
                onClick={() => setTabDay(i)}
                className={`px-3 py-1 rounded-full border text-sm ${tabDay===i ? "bg-black text-white" : "bg-white hover:bg-slate-50"}`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="rounded-xl border p-3 md:p-4">
            <h4 className="font-semibold mb-3">{DAY_LABELS[tabDay]} coverage</h4>
            <div className="grid grid-cols-1 md:grid-cols-keys gap-4"
                 style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0,1fr))` }}>
              {keys.map(k => (
                <div key={k} className="rounded-lg border p-3">
                  <div className="text-sm text-slate-600 mb-2">Shift {k}</div>
                  <input
                    type="range" min={0} max={20}
                    value={Number((coverage[tabDay as 0|1|2|3|4|5|6] as any)[k] ?? 0)}
                    onChange={e => setDayShift(tabDay, k, Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number" min={0} max={20}
                      value={Number((coverage[tabDay as 0|1|2|3|4|5|6] as any)[k] ?? 0)}
                      onChange={e => setDayShift(tabDay, k, Number(e.target.value))}
                      className="w-20 input"
                    />
                    <span className="text-xs text-slate-500">staff</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn" onClick={() => preset("Small")}>Preset: Small</button>
            <button className="btn" onClick={() => preset("Standard")}>Preset: Standard</button>
            <button className="btn" onClick={() => preset("Large")}>Preset: Large</button>
            <span className="mx-2 hidden md:inline text-slate-400">|</span>
            <button className="btn" onClick={copyWeekdays}>Copy Mon–Fri → Weekend</button>
            <button className="btn" onClick={applyAll}>Apply this day → All days</button>
            <button className="btn" onClick={clearAll}>Clear all</button>
            <span className="mx-2 hidden md:inline text-slate-300">|</span>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Avg hourly rate (£/hr)
              <input
                className="input w-28"
                type="number" min={0} step="0.01"
                value={avgHourlyRate}
                onChange={(e) => setAvgHourlyRate(Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        {/* Weekly totals preview */}
        <div className="px-4 md:px-6 pb-4">
          <div className="rounded-xl border bg-slate-50 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-700">Preview weekly totals</h4>
              <span className="text-sm text-slate-500">Sun–Sat</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {keys.map(k => (
                <div key={k} className="rounded-lg bg-white border p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Shift {k}</div>
                  <div className="text-lg font-semibold">{totals.byShift[k]}</div>
                </div>
              ))}
              <div className="rounded-lg bg-white border p-3 md:col-span-2">
                <div className="text-xs uppercase tracking-wide text-slate-500">Overall</div>
                <div className="text-lg font-semibold">{totals.overall}</div>
              </div>
            </div>
            
            {/* Estimated weekly hours */}
            <div className="mt-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-medium">Estimated weekly hours:</span>
                {keys.map(k => (
                  <span key={k} className="inline-flex items-center gap-1">
                    <span className="text-slate-500">Shift {k}:</span>
                    <span className="font-semibold">{estHours.byShift[k]}h</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1">
                  <span className="text-slate-500">Overall:</span>
                  <span className="font-semibold">{estHours.overall}h</span>
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Calculated as {shiftSystem === "8h" ? "8h per E/L/N" : "12h per D/N"} across Sun–Sat coverage.
              </div>
            </div>
            
            {/* Rough weekly wage cost (estimate) */}
            <div className="mt-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-medium">Estimated weekly wage cost (rough):</span>
                {keys.map(k => (
                  <span key={k} className="inline-flex items-center gap-1">
                    <span className="text-slate-500">Shift {k}:</span>
                    <span className="font-semibold">£{estCost.byShift[k]?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1">
                  <span className="text-slate-500">Overall:</span>
                  <span className="font-semibold">£{estCost.overall.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Estimate only — uses coverage × average hourly rate. Excludes OT multipliers, PH premia, role differentials, and allowances.
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 border-t flex items-center justify-end gap-2">
          <button className="px-4 py-2 rounded-lg border" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90" onClick={save}>Save to JSON</button>
        </div>
      </div>
    </div>
  );
}