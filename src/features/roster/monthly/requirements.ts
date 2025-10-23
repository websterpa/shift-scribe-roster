import { supabase } from "@/integrations/supabase/client";
import { toCode } from "@/features/roster/shiftMap";
import { getTenantId } from "@/features/tenant/useTenant";

type ReqLegacy = Record<string, Record<string, number>>;
// Note: role_id is legacy config JSON field name, not a database column
type ReqNew = { days: Record<string, Array<{ role_id?: string; code?: string; logical?: string; needed: number }>> };

export async function fetchRequiredCodes(versionId: string, monthStartISO: string, monthEndISO: string): Promise<Set<string>> {
  // TODO(tenant): Add tenant_id filter when roster_versions table has tenant_id column
  const v = await supabase
    .from("roster_versions")
    .select("id, config_id")
    .eq("id", versionId)
    // .eq("tenant_id", getTenantId()) // Uncomment when column exists
    .single();
  if (v.error || !v.data) return new Set();
  
  // TODO(tenant): Add tenant_id filter when roster_config table has tenant_id column
  const c = await supabase
    .from("roster_config")
    .select("id, staffing_requirements")
    .eq("id", v.data.config_id)
    // .eq("tenant_id", getTenantId()) // Uncomment when column exists
    .single();
  if (c.error || !c.data) return new Set();
  
  const json: any = c.data.staffing_requirements || {};
  const out = new Set<string>();
  
  if ("days" in json) {
    const req = json as ReqNew;
    for (const [date, items] of Object.entries(req.days || {})) {
      if (date < monthStartISO || date > monthEndISO) continue;
      for (const it of items || []) {
        // role_id is a legacy field in config JSON (not DB column); map all variants to shift_code
        const raw = it.code ?? it.role_id ?? it.logical ?? "";
        out.add(toCode(raw).toUpperCase());
      }
    }
  } else {
    const req = json as ReqLegacy;
    // Consider every weekday defined in legacy map
    Object.values(req || {}).forEach(day => {
      Object.keys(day || {}).forEach(k => out.add(toCode(k).toUpperCase()));
    });
  }
  
  return out;
}
