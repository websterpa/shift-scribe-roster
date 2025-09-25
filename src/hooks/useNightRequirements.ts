import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NightRequirements = {
  loading: boolean;
  error: string | null;
  requirementsCount: number;
};

export function useNightRequirements(versionId: string) {
  const [state, setState] = useState<NightRequirements>({
    loading: true,
    error: null,
    requirementsCount: 0
  });

  useEffect(() => {
    let alive = true;
    
    (async () => {
      try {
        console.log("useNightRequirements: fetching requirements for version", versionId);
        const { data, error } = await (supabase as any).rpc("rpc_night_gap", { 
          version_id: versionId 
        });
        
        if (error) {
          console.error("useNightRequirements: RPC error", error);
          throw error;
        }
        
        const requirementsCount = (data as any)?.need || 0;
        
        console.log("useNightRequirements: requirements count", requirementsCount);
        
        if (!alive) return;
        
        setState(s => ({ 
          ...s, 
          loading: false, 
          error: null, 
          requirementsCount 
        }));
      } catch (e: any) {
        console.error("useNightRequirements: error", e);
        if (!alive) return;
        setState(s => ({ 
          ...s, 
          loading: false, 
          error: e.message || "Failed to load requirements" 
        }));
      }
    })();
    
    return () => { alive = false; };
  }, [versionId]);

  return state;
}