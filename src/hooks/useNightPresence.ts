import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NightPresence = {
  loading: boolean;
  error: string | null;
  hasNight: boolean;
  tokenCounts: Record<string, number>;
  nightsRequiredByConfig: boolean;
};

export function useNightPresence(versionId: string, opts?: {
  expectNights?: boolean;
  coverageRequiresNights?: boolean;
}) {
  const [state, setState] = useState<NightPresence>({
    loading: true,
    error: null,
    hasNight: false,
    tokenCounts: {},
    nightsRequiredByConfig: !!(opts?.expectNights || opts?.coverageRequiresNights)
  });

  useEffect(() => {
    let alive = true;
    
    (async () => {
      try {
        console.log("useNightPresence: fetching token counts for version", versionId);
        const { data, error } = await supabase.rpc("rpc_version_token_counts", { 
          version_id: versionId 
        });
        
        if (error) {
          console.error("useNightPresence: RPC error", error);
          throw error;
        }
        
        const counts: Record<string, number> = {};
        (data || []).forEach((r: any) => { 
          counts[r.token] = Number(r.cnt) || 0; 
        });
        
        const hasNight = (counts["N"] ?? 0) > 0;
        
        console.log("useNightPresence: token counts", counts, "hasNight:", hasNight);
        
        if (!alive) return;
        
        setState(s => ({ 
          ...s, 
          loading: false, 
          error: null, 
          tokenCounts: counts, 
          hasNight 
        }));
      } catch (e: any) {
        console.error("useNightPresence: error", e);
        if (!alive) return;
        setState(s => ({ 
          ...s, 
          loading: false, 
          error: e.message || "Failed to load token counts" 
        }));
      }
    })();
    
    return () => { alive = false; };
  }, [versionId, opts?.expectNights, opts?.coverageRequiresNights]);

  return state;
}