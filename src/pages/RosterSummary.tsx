import React, { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useRosterSummary } from "@/hooks/useRosterSummary";
import { useNightPresence } from "@/hooks/useNightPresence";
import { useNightRequirements } from "@/hooks/useNightRequirements";
import { NightDiagnosticBanner } from "@/components/roster/NightDiagnosticBanner";
import MonthlyScheduleTab from "@/components/MonthlyScheduleTab";
import CoverageStrip from "@/components/roster/CoverageStrip";
import TeamLaneRoster from "@/components/roster/TeamLaneRoster";
import NightCallout from "@/components/NightCallout";
import RosterDebugDrawer from "@/components/debug/RosterDebugDrawer";
import { toast } from "sonner";

// Formatting helpers
function fmtPounds(n: number | null) { return n==null ? "—" : `£${Math.round(n).toLocaleString()}`; }
function fmtPct(n: number | null)    { return n==null ? "—" : `${Math.round(n)}%`; }
function fmtHours(n: number | null)  { return n==null ? "—" : `${Math.round(n).toLocaleString()}h`; }

export default function RosterSummary() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const versionId = params.get("version") || "";
  const [activeTab, setActiveTab] = useState<"summary" | "coverage" | "teams" | "month">("summary");

  const { loading, error, version, kpis, matrix, tours, budget, diag } = useRosterSummary(versionId);
  
  // Check for Night presence
  const { 
    loading: npLoading, 
    error: npError, 
    hasNight, 
    tokenCounts 
  } = useNightPresence(versionId, {
    expectNights: version?.shift_type === "12h" || version?.config_name?.includes("Night"),
    coverageRequiresNights: false
  });

  const { 
    loading: nrLoading, 
    error: nrError, 
    requirementsCount 
  } = useNightRequirements(versionId);

  function handleRegenerateWithNights() {
    console.log("Regenerating roster with Nights enabled for version:", versionId);
    toast.info("Night shift regeneration would be triggered here");
  }

  function openWizard() {
    console.log("Opening wizard with Night preset for version:", versionId);
    navigate(`/wizard?version=${versionId}&preset=dn`);
  }

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

        {/* Debug Drawer */}
        <RosterDebugDrawer versionId={versionId} />

        {/* Night Diagnostic Banner */}
        <NightDiagnosticBanner
          requirementsCount={requirementsCount}
          assignmentsCount={tokenCounts["N"] ?? 0} 
          hasUI={hasNight}
          loading={npLoading || nrLoading}
        />

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

            {/* Real KPI data with error handling */}
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
          <div className="space-y-4">
            <CoverageStrip versionId={versionId} />
          </div>
        )}

        {activeTab === "teams" && (
          <div className="space-y-4">
            <TeamLaneRoster versionId={versionId} />
          </div>
        )}

        {activeTab === "month" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-blue-50 p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-900">New Monthly View Available</div>
                  <div className="text-xs text-blue-700">Try the improved monthly schedule with version picker and better filtering</div>
                </div>
                <Link 
                  to={`/roster/monthly?version=${versionId}&month=${new Date().toISOString().slice(0,7)}`}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Open New View
                </Link>
              </div>
            </div>
            <MonthlyScheduleTab
              versionId={versionId}
              siteTz={version?.timezone ?? "Europe/London"}
            />
          </div>
        )}
      </div>
    </div>
  );
}