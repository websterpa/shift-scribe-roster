import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRosterDebug(versionId: string | null) {
  const [state, set] = useState({
    loading: !!versionId, 
    error: null as string | null,
    req: {} as Record<string, number>, 
    asg: {} as Record<string, number>,
    night: null as null | { need: number, planned: number, gap: number },
  });

  useEffect(() => {
    if (!versionId) return;
    let alive = true;
    
    (async () => {
      try {
        console.log("useRosterDebug: fetching debug data for version", versionId);
        
        const [r, a, g] = await Promise.all([
          supabase.rpc("rpc_requirements_token_counts", { version_id: versionId }),
          supabase.rpc("rpc_version_token_counts", { version_id: versionId }),
          supabase.rpc("rpc_night_gap", { version_id: versionId }),
        ]);
        
        if (r.error) throw r.error; 
        if (a.error) throw a.error; 
        if (g.error) throw g.error;
        
        const toObj = (rows: any[]) => 
          rows.reduce((m, r) => ((m[r.token] = +r.cnt || 0), m), {} as Record<string, number>);
        
        if (!alive) return;
        
        set({ 
          loading: false, 
          error: null, 
          req: toObj(r.data || []), 
          asg: toObj(a.data || []), 
          night: g.data as any 
        });
      } catch (e: any) { 
        console.error("useRosterDebug: error", e);
        if (!alive) return;
        set(s => ({ 
          ...s, 
          loading: false, 
          error: e.message || "debug failed" 
        })); 
      }
    })();
    
    return () => { alive = false; };
  }, [versionId]);

  return state;
}