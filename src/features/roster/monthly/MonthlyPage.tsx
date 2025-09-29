import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchMonthlyAssignments } from "./useMonthlyAssignments";
import { MonthlyHeader } from "./MonthlyHeader";
import { MonthlyGrid } from "./MonthlyGrid";
import { StaffingOverview } from "./StaffingOverview";
import { resolveActiveRosterVersion } from "./useActiveRoster";

type Assignment = {
  id: string;
  date: string;
  shift_code: string;
  shift_start: string;
  shift_end: string;
  staff_id: string;
  staff_profiles: {
    id: string;
    first_name: string;
    last_name: string;
    name?: string;
    role?: string;
  };
};

const SHIFT_LABEL: Record<string,string> = { E:"Early (E)", L:"Late (L)", N:"Night (N)", D:"Day (D)" };

export function MonthlyPage({ siteName }: { siteName?: string } = {}) {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  
  const monthISO = sp.get("month") ?? new Date().toISOString().slice(0,7);
  const [versionId, setVersionId] = useState(sp.get("version") ?? "");
  const [humanLabel, setHumanLabel] = useState("");
  
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-resolve active roster if version not supplied
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (versionId) return;
      const active = await resolveActiveRosterVersion(supabase, monthISO, siteName);
      if (!mounted || !active) return;
      setVersionId(active.versionId);
      setHumanLabel(active.label);
      sp.set("version", active.versionId);
      sp.set("month", monthISO);
      navigate({ search: sp.toString() }, { replace: true });
    })();
    return () => { mounted = false; };
  }, [versionId, monthISO, siteName, navigate, sp]);

  useEffect(() => {
    if (!versionId) return;
    (async () => {
      setLoading(true);
      setError(null);
      
      // Set label if missing (e.g., direct link)
      if (!humanLabel) {
        const active = await resolveActiveRosterVersion(supabase, monthISO, siteName);
        if (active && active.versionId === versionId) setHumanLabel(active.label);
      }
      
      try {
        const data = await fetchMonthlyAssignments({ sb: supabase, versionId, monthISO, shiftCodeFilter: "ALL" });
        setRows(data);
      } catch (err: any) {
        console.error("Error fetching monthly assignments:", err);
        setError(err.message || "Failed to load assignments");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [versionId, monthISO, humanLabel, siteName]);

  function handleMonthChange(direction: 'prev' | 'next' | 'current') {
    const currentDate = new Date(monthISO + "-01");
    let newDate: Date;
    
    switch (direction) {
      case 'prev':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        break;
      case 'next':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        break;
      case 'current':
        newDate = new Date();
        break;
    }
    
    const newMonthISO = newDate.toISOString().slice(0, 7);
    // Reset version when changing months to trigger auto-selection
    setVersionId("");
    setHumanLabel("");
    sp.set("month", newMonthISO);
    sp.delete("version");
    navigate({ search: sp.toString() }, { replace: true });
  }

  const monthStart = new Date(monthISO + "-01");

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-shrink-0 p-6 border-b">
        <h1 className="text-2xl font-bold mb-4">Monthly Schedule</h1>
        
        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs text-muted-foreground">Month</label>
          <div className="flex items-center gap-1">
            <button 
              className="px-2 py-1 text-sm border rounded hover:bg-muted"
              onClick={() => handleMonthChange('prev')}
            >
              ←
            </button>
            <span className="px-3 py-1 text-sm font-medium min-w-[120px] text-center">
              {monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button 
              className="px-2 py-1 text-sm border rounded hover:bg-muted"
              onClick={() => handleMonthChange('next')}
            >
              →
            </button>
            <button 
              className="px-2 py-1 text-sm border rounded hover:bg-muted"
              onClick={() => handleMonthChange('current')}
            >
              Today
            </button>
          </div>
        </div>

        {versionId && <MonthlyHeader sb={supabase} versionId={versionId} monthISO={monthISO} humanLabel={humanLabel || "Loading…"} />}
        {versionId && <StaffingOverview sb={supabase} versionId={versionId} monthISO={monthISO} />}
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        {loading && (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 mb-4">
            Error: {error}
          </div>
        )}

        {!loading && !error && !versionId && (
          <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
            Finding active roster for this month…
          </div>
        )}

        {!loading && !error && versionId && (
          <MonthlyGrid monthISO={monthISO} rows={rows} />
        )}
      </div>
    </div>
  );
}