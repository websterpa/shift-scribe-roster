import { supabase } from "@/integrations/supabase/client";

export interface SiteRateDefaults {
  /** £/hr */
  avgStaffRate?: number;        // e.g., 18
  avgSupervisorRate?: number;   // e.g., 24
  /** Supervisor mix % per shift key (0..100) */
  roleMixByShift?: Record<string, number>; // e.g., {E:10,L:10,N:20} or {D:15,N:25}
}

/**
 * Fetch site-level defaults from Supabase.
 * Expected row example:
 * { avg_staff_rate: 18, avg_supervisor_rate: 24, role_mix_by_shift: {"E":10,"L":10,"N":20} }
 */
export async function fetchSiteRateDefaults(): Promise<SiteRateDefaults> {
  console.log("fetchSiteRateDefaults: Starting fetch");
  
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("avg_staff_rate, avg_supervisor_rate, role_mix_by_shift")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log("fetchSiteRateDefaults: Query error:", error);
      return { avgStaffRate: 18, avgSupervisorRate: 24, roleMixByShift: undefined };
    }

    if (!data) {
      console.log("fetchSiteRateDefaults: No data found, using defaults");
      return { avgStaffRate: 18, avgSupervisorRate: 24, roleMixByShift: undefined };
    }

    console.log("fetchSiteRateDefaults: Found data:", data);
    return {
      avgStaffRate: typeof data.avg_staff_rate === "number" ? data.avg_staff_rate : 18,
      avgSupervisorRate: typeof data.avg_supervisor_rate === "number" ? data.avg_supervisor_rate : 24,
      roleMixByShift: data.role_mix_by_shift && typeof data.role_mix_by_shift === "object" 
        ? data.role_mix_by_shift as Record<string, number> 
        : undefined
    };
  } catch (err) {
    console.log("fetchSiteRateDefaults: Exception:", err);
    return { avgStaffRate: 18, avgSupervisorRate: 24, roleMixByShift: undefined };
  }
}