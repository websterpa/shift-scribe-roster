import type { SupabaseClient } from "@supabase/supabase-js";
import type { EnrichedAssignment } from "./types";
import { safeSelect } from "@/integrations/supabase/safeQuery";

type FetchArgs = {
  sb: SupabaseClient;
  versionId: string;
  monthISO: string;              // "YYYY-MM"
  shiftCodeFilter?: string;      // "ALL" | concrete shift_code
};

function fullName(p: { name?: string | null; first_name?: string | null; last_name?: string | null }) {
  if (p.name?.trim()) return p.name.trim();
  const first = p.first_name?.trim() ?? "";
  const last = p.last_name?.trim() ?? "";
  const combo = [first, last].filter(Boolean).join(" ");
  return combo || "Unnamed";
}

export async function fetchMonthlyAssignments({ sb, versionId, monthISO, shiftCodeFilter = "ALL" }: FetchArgs): Promise<EnrichedAssignment[]> {
  const start = `${monthISO}-01`;
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().slice(0, 10);

  // TODO(tenant): Add tenant_id filter when roster_assignments table has tenant_id column
  let q = sb
    .from("roster_assignments")
    .select("*")
    .eq("version_id", versionId)
    // .eq("tenant_id", getTenantId()) // Uncomment when column exists
    .gte("shift_start", start)
    .lt("shift_start", end);

  if (shiftCodeFilter && shiftCodeFilter !== "ALL") {
    q = q.eq("shift_code", shiftCodeFilter);
  }

  const { data, error } = await safeSelect<any[]>(q, "assignments");
  if (error) return [];
  
  const raw = (data ?? []) as any[];
  
  // Filter out rows with falsy staff_id early (prevent empty UUID queries)
  const valid = raw.filter(r => !!r.staff_id && r.staff_id.trim() !== "");
  const invalid = raw.filter(r => !r.staff_id || r.staff_id.trim() === "");
  
  const ids = Array.from(new Set(valid.map(r => r.staff_id)));
  
  // Build staff name map - only if we have valid IDs
  const nameMap = new Map<string, string>();
  if (ids.length > 0) {
    // TODO(tenant): Add tenant_id filter when staff_profiles table has tenant_id column
    const { data: staff, error: staffErr } = await safeSelect<any[]>(
      sb
        .from("staff_profiles")
        .select("id, name, first_name, last_name")
        .in("id", ids),
      "staff profiles"
    );
      // .eq("tenant_id", getTenantId()) // Uncomment when column exists
    
    if (staffErr) return [];
    
    (staff ?? []).forEach(s => {
      const id = String((s as any).id);
      if (id) nameMap.set(id, fullName(s as any));
    });
  }
  
  // Enrich with staff_name; blanks become "Unassigned"
  const enrichedValid = valid.map(r => ({ 
    id: r.id,
    version_id: r.version_id,
    date: r.date,
    shift_code: r.shift_code,
    shift_start: r.shift_start,
    shift_end: r.shift_end,
    staff_id: r.staff_id,
    hours: r.hours,
    cost: r.cost,
    staff_name: nameMap.get(r.staff_id) ?? r.staff_id 
  } as EnrichedAssignment));
  
  const enrichedInvalid = invalid.map(r => ({ 
    id: r.id,
    version_id: r.version_id,
    date: r.date,
    shift_code: r.shift_code,
    shift_start: r.shift_start,
    shift_end: r.shift_end,
    staff_id: null,
    hours: r.hours,
    cost: r.cost,
    staff_name: "Unassigned" 
  } as EnrichedAssignment));
  
  return [...enrichedValid, ...enrichedInvalid];
}

export async function countMonthlyAssignments({ sb, versionId, monthISO }: { sb: SupabaseClient; versionId: string; monthISO: string }) {
  const start = `${monthISO}-01`;
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().slice(0, 10);

  // TODO(tenant): Add tenant_id filter when roster_assignments table has tenant_id column
  const { data: result, error } = await safeSelect<any>(
    sb
      .from("roster_assignments")
      .select("id", { count: "exact", head: true })
      .eq("version_id", versionId)
      // .eq("tenant_id", getTenantId()) // Uncomment when column exists
      .gte("shift_start", start)
      .lt("shift_start", end),
    "assignment count"
  );

  if (error) return 0;
  return (result as any)?.count ?? 0;
}
