import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function RosterSummary() {
  const [params] = useSearchParams();
  const versionId = params.get("version") || "";

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!versionId) throw new Error("Missing roster version id.");
        
        // Fetch version details and aggregated metrics in parallel
        const [versionResult, metricsResult] = await Promise.all([
          supabase
            .from("roster_versions")
            .select("id, config_id, version_number, version_name, generated_at")
            .eq("id", versionId)
            .single(),
          supabase
            .from("roster_assignments")
            .select("cost, hours, date")
            .eq("version_id", versionId)
        ]);

        if (versionResult.error) throw new Error(versionResult.error.message);
        if (metricsResult.error) throw new Error(metricsResult.error.message);

        const assignments = metricsResult.data || [];
        const totalCost = assignments.reduce((sum, a) => sum + (a.cost || 0), 0);
        const totalHours = assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
        const totalAssignments = assignments.length;

        // Calculate coverage percentage (simplified based on assignments vs expected)
        const expectedAssignments = totalHours > 0 ? Math.ceil(totalHours / 8) : totalAssignments;
        const coveragePercentage = expectedAssignments > 0 ? Math.min((totalAssignments / expectedAssignments) * 100, 100) : 0;

        // Mock budget for variance calculation (you can enhance this later)
        const estimatedBudget = 50000; // £50k baseline
        const budgetVariance = totalCost - estimatedBudget;

        if (active) {
          setData({
            ...versionResult.data,
            metrics: {
              totalCost: totalCost,
              totalHours: totalHours,
              totalAssignments: totalAssignments,
              coveragePercentage: Math.round(coveragePercentage),
              budgetVariance: budgetVariance
            }
          });
        }
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load roster version.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [versionId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Roster Summary</h1>
          <Link to="/wizard" className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50">← Back to Wizard</Link>
        </div>

        {loading && <div className="rounded-xl border bg-white p-4">Loading…</div>}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm text-slate-500">Version</div>
              <div className="text-lg font-semibold break-all">{data.id}</div>
              <div className="text-sm text-slate-600">
                Created: {new Date(data.generated_at).toLocaleString()}
              </div>
              {data.version_name && <div className="text-sm">Name: {data.version_name}</div>}
              <div className="text-sm">Version Number: {data.version_number}</div>
            </div>

            {/* Real KPI data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs uppercase text-slate-500">Coverage</div>
                <div className="text-lg font-semibold">{data.metrics?.coveragePercentage ?? 0}%</div>
                <div className="text-sm text-slate-600">{data.metrics?.totalAssignments ?? 0} assignments</div>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs uppercase text-slate-500">Estimated Cost</div>
                <div className="text-lg font-semibold">£{(data.metrics?.totalCost ?? 0).toLocaleString()}</div>
                <div className="text-sm text-slate-600">{data.metrics?.totalHours ?? 0} total hours</div>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs uppercase text-slate-500">Budget Variance</div>
                <div className={`text-lg font-semibold ${(data.metrics?.budgetVariance ?? 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {(data.metrics?.budgetVariance ?? 0) >= 0 ? '+' : ''}£{(data.metrics?.budgetVariance ?? 0).toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">
                  {(data.metrics?.budgetVariance ?? 0) >= 0 ? 'Over budget' : 'Under budget'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}