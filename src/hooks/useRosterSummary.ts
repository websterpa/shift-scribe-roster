import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUMMARY_CFG as C } from "@/config/summary";

export type SummaryDiag = {
  version: { ok: boolean; msg?: string };
  kpis:    { ok: boolean; msg?: string };
  matrix:  { ok: boolean; msg?: string };
  tours:   { ok: boolean; msg?: string };
  budget:  { ok: boolean; msg?: string };
};

export type KPIs = {
  coverageFillPct: number | null;
  totalHours: number | null;
  otHours: number | null;
  budgetEstimated: number | null;
  budgetSet: number | null;
  budgetVariance: number | null;
};

type MatrixRow = { day: string; shifts: Record<string, { need: number; planned: number }> };
type TourRow = { staffId: string; name: string; role: "Supervisor"|"Staff"; shifts: number; nights: number; weekends: number; publicHolidays: number; overtimeHours: number };

export function useRosterSummary(versionId: string) {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [diag, setDiag]         = useState<SummaryDiag>({
    version:{ok:false}, kpis:{ok:false}, matrix:{ok:false}, tours:{ok:false}, budget:{ok:false}
  });

  const [version, setVersion]   = useState<any>(null);
  const [kpis, setKpis]         = useState<KPIs | null>(null);
  const [matrix, setMatrix]     = useState<MatrixRow[]>([]);
  const [tours, setTours]       = useState<TourRow[]>([]);
  const [budget, setBudget]     = useState<{ estimated:number|null; budget:number|null; variance:number|null } | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError(null);
      let d = { ...diag };

      try {
        // 1) Version header
        const { data: v, error: ve } = await supabase
          .from("roster_versions")
          .select("id, config_id, version_number, version_name, generated_at")
          .eq("id", versionId)
          .single();
        if (ve) { d.version = { ok:false, msg: ve.message }; throw new Error(ve.message); }
        d.version = { ok:true };
        if (!alive) return;
        setVersion(v);

        // 2) Try RPCs first (these may not exist yet, so we'll catch errors)
        let kpisData = null, matrixData = null, toursData = null, budgetData = null;
        
        try {
          const kpisResult = await (supabase as any).rpc("rpc_roster_kpis", { version_id: versionId });
          if (!kpisResult.error && kpisResult.data) {
            kpisData = kpisResult.data;
            d.kpis = { ok: true };
          } else {
            d.kpis = { ok: false, msg: kpisResult.error?.message || "RPC not found" };
          }
        } catch (e: any) {
          d.kpis = { ok: false, msg: e.message || "RPC error" };
        }

        try {
          const matrixResult = await (supabase as any).rpc("rpc_roster_staffing_matrix", { version_id: versionId });
          if (!matrixResult.error && matrixResult.data) {
            matrixData = matrixResult.data;
            d.matrix = { ok: true };
          } else {
            d.matrix = { ok: false, msg: matrixResult.error?.message || "RPC not found" };
          }
        } catch (e: any) {
          d.matrix = { ok: false, msg: e.message || "RPC error" };
        }

        try {
          const toursResult = await (supabase as any).rpc("rpc_roster_tours", { version_id: versionId });
          if (!toursResult.error && toursResult.data) {
            toursData = toursResult.data;
            d.tours = { ok: true };
          } else {
            d.tours = { ok: false, msg: toursResult.error?.message || "RPC not found" };
          }
        } catch (e: any) {
          d.tours = { ok: false, msg: e.message || "RPC error" };
        }

        try {
          const budgetResult = await (supabase as any).rpc("rpc_roster_budget", { version_id: versionId });
          if (!budgetResult.error && budgetResult.data) {
            budgetData = budgetResult.data;
            d.budget = { ok: true };
          } else {
            d.budget = { ok: false, msg: budgetResult.error?.message || "RPC not found" };
          }
        } catch (e: any) {
          d.budget = { ok: false, msg: e.message || "RPC error" };
        }

        // set what we got
        if (kpisData) setKpis(kpisData);
        if (matrixData) setMatrix(matrixData);
        if (toursData) setTours(toursData);
        if (budgetData) setBudget(budgetData);

        // Throw clear error if RPCs fail - no fallbacks
        if (!kpisData) {
          throw new Error("Coverage RPC failed - rpc_roster_kpis returned no data");
        }
        if (!budgetData) {
          throw new Error("Budget RPC failed - rpc_roster_budget returned no data");
        }

        if (!alive) return;
        setDiag(d);

      } catch (e:any) {
        setError(e?.message || "Failed to load roster summary.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  return { loading, error, version, kpis, matrix, tours, budget, diag };
}