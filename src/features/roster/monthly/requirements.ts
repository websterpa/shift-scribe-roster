import { supabase } from "@/integrations/supabase/client";
import { toCode } from "@/features/roster/shiftMap";
import { getTenantId } from "@/features/tenant/useTenant";
import { safeSelect } from "@/integrations/supabase/safeQuery";

type ReqLegacy = Record<string, Record<string, number>>;
// Note: role_id is legacy config JSON field name, not a database column
type ReqNew = { days: Record<string, Array<{ role_id?: string; code?: string; logical?: string; needed: number }>> };

export async function fetchRequiredCodes(versionId: string, monthStartISO: string, monthEndISO: string): Promise<Set<string>> {
  const tenantId = getTenantId();
  
  const { data: vData, error: vErr } = await safeSelect<any>(
    supabase
      .from("roster_versions")
      .select("id, config_id")
      .eq("id", versionId)
      .eq("tenant_id", tenantId)
      .single(),
    "roster version"
  );
  if (vErr || !vData) return new Set();
  
  const { data: cData, error: cErr } = await safeSelect<any>(
    supabase
      .from("roster_config")
      .select("id, staffing_requirements")
      .eq("id", vData.config_id)
      .single(),
    "roster config"
  );
  if (cErr || !cData) return new Set();
  
  const json: any = cData.staffing_requirements || {};
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
