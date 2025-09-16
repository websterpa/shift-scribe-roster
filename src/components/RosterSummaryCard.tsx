import React from "react";
import type { RosterSummary } from "@/types/managerUI";

export function RosterSummaryCard({ summary }: { summary: RosterSummary }) {
  const varianceStr = summary.budget != null && summary.budgetVariance != null
    ? (summary.budgetVariance > 0 ? `Over by £${summary.budgetVariance.toLocaleString()}` :
       summary.budgetVariance < 0 ? `Under by £${Math.abs(summary.budgetVariance).toLocaleString()}` :
       "On budget")
    : "—";

  return (
    <div className="rounded-2xl shadow p-4 md:p-6 bg-white">
      <h3 className="text-xl font-semibold mb-4">Roster Summary</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Stat label="Coverage achieved" value={`${summary.coverageAchievedPct.toFixed(1)}%`} />
        <Stat label="Total cost" value={`£${summary.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <Stat label="Budget" value={summary.budget != null ? `£${summary.budget.toLocaleString()}` : "—"} />
        <Stat label="Budget variance" value={varianceStr} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Fairness title="Nights" x={summary.fairness.nights} />
        <Fairness title="Weekends" x={summary.fairness.weekends} />
        <Fairness title="Public Holidays" x={summary.fairness.publicHolidays} cap={summary.fairness.publicHolidays.cap} />
      </div>

      {summary.violations.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h4 className="font-semibold text-red-800 mb-2">Compliance Violations</h4>
          <ul className="list-disc list-inside text-sm text-red-900 space-y-1">
            {summary.violations.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        </div>
      )}

      {summary.notes && summary.notes.length > 0 && (
        <div className="mt-3 text-sm text-slate-600">
          {summary.notes.map((n, i) => <p key={i} className="mb-1">{n}</p>)}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Fairness({ title, x, cap }: { title: string; x: { min: number; avg: number; max: number }; cap?: number }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
        {typeof cap === "number" && <div className="text-[11px] text-slate-500">Cap: {cap}</div>}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div><span className="text-slate-500">Min</span><div className="font-semibold">{x.min}</div></div>
        <div><span className="text-slate-500">Avg</span><div className="font-semibold">{x.avg}</div></div>
        <div><span className="text-slate-500">Max</span><div className="font-semibold">{x.max}</div></div>
      </div>
    </div>
  );
}