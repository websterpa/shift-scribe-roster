import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useRosterSummary } from "@/hooks/useRosterSummary";
import MonthlyScheduleTab from "@/components/MonthlyScheduleTab";
import { CoverageStrip } from "@/components/roster/CoverageStrip";
import { TeamLaneRoster } from "@/components/roster/TeamLaneRoster";

// Formatting helpers
function fmtPounds(n: number | null) { return n==null ? "—" : `£${Math.round(n).toLocaleString()}`; }
function fmtPct(n: number | null)    { return n==null ? "—" : `${Math.round(n)}%`; }
function fmtHours(n: number | null)  { return n==null ? "—" : `${Math.round(n).toLocaleString()}h`; }

export default function RosterSummary() {
  const [params] = useSearchParams();
  const versionId = params.get("version") || "";
  const [activeTab, setActiveTab] = useState<"summary" | "coverage" | "teams" | "month">("summary");

  const { loading, error, version, kpis, matrix, tours, budget, diag } = useRosterSummary(versionId);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Roster Summary</h1>
          <Link to="/wizard" className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50">← Back to Wizard</Link>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("summary")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "summary"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab("coverage")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "coverage"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Coverage
            </button>
            <button
              onClick={() => setActiveTab("teams")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "teams"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Team Lanes
            </button>
            <button
              onClick={() => setActiveTab("month")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "month"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Monthly Schedule
            </button>
          </nav>
        </div>

        {/* Diagnostics banner for debugging */}
        {(diag.fallbackUsed || !diag.kpis.ok || !diag.budget.ok || !diag.matrix.ok || !diag.tours.ok) && (
          <div className="mb-3 rounded-lg border bg-amber-50 text-amber-900 p-2 text-xs">
            <strong>Diagnostics:</strong> version={String(diag.version.ok)} • 
            kpis={String(diag.kpis.ok)}{diag.kpis.msg ? ` (${diag.kpis.msg})` : ""} • 
            matrix={String(diag.matrix.ok)}{diag.matrix.msg ? ` (${diag.matrix.msg})` : ""} • 
            tours={String(diag.tours.ok)}{diag.tours.msg ? ` (${diag.tours.msg})` : ""} • 
            budget={String(diag.budget.ok)}{diag.budget.msg ? ` (${diag.budget.msg})` : ""} • 
            fallbackUsed={String(diag.fallbackUsed)}
          </div>
        )}

        {loading && <div className="rounded-xl border bg-white p-4">Loading…</div>}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "summary" && version && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm text-slate-500">Version</div>
              <div className="text-lg font-semibold break-all">{version.id}</div>
              <div className="text-sm text-slate-600">
                Created: {new Date(version.generated_at).toLocaleString()}
              </div>
              {version.version_name && <div className="text-sm">Name: {version.version_name}</div>}
              <div className="text-sm">Version Number: {version.version_number}</div>
            </div>

            {/* Real KPI data with fallbacks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs uppercase text-slate-500">Coverage</div>
                <div className="text-lg font-semibold">{fmtPct(kpis?.coverageFillPct ?? null)}</div>
                <div className="text-sm text-slate-600">{fmtHours(kpis?.totalHours ?? null)} total</div>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs uppercase text-slate-500">Estimated Cost</div>
                <div className="text-lg font-semibold">{fmtPounds(kpis?.budgetEstimated ?? budget?.estimated ?? null)}</div>
                <div className="text-sm text-slate-600">{fmtHours(kpis?.totalHours ?? null)} scheduled</div>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs uppercase text-slate-500">Budget Variance</div>
                <div className={`text-lg font-semibold ${(kpis?.budgetVariance ?? budget?.variance ?? 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmtPounds(kpis?.budgetVariance ?? budget?.variance ?? null)}
                </div>
                <div className="text-sm text-slate-600">
                  {(kpis?.budgetVariance ?? budget?.variance ?? 0) >= 0 ? 'Over budget' : 'Under budget'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "coverage" && (
          <CoverageStrip versionId={versionId} />
        )}

        {activeTab === "teams" && (
          <TeamLaneRoster versionId={versionId} />
        )}

        {activeTab === "month" && (
          <MonthlyScheduleTab
            versionId={versionId}
            siteTz={version?.timezone ?? "Europe/London"}
          />
        )}
      </div>
    </div>
  );
}