import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function fetchMonthlyAssignments({ sb, versionId, monthISO, shiftCodeFilter = "ALL" }: FetchArgs) {
  const start = `${monthISO}-01`;
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().slice(0, 10);

  let q = sb
    .from("roster_assignments")
    .select("*")
    .eq("version_id", versionId)
    .gte("shift_start", start)
    .lt("shift_start", end);

  if (shiftCodeFilter && shiftCodeFilter !== "ALL") {
    q = q.eq("shift_code", shiftCodeFilter);
  }

  const { data, error } = await q;
  if (error) throw error;
  
  type RawRow = { staff_id: string; shift_code: string; shift_start: string; shift_end: string; date: string; hours: number; cost: number; [key: string]: any };
  const raw = (data ?? []) as RawRow[];
  
  // Filter out rows with falsy staff_id early (prevent empty UUID queries)
  const valid = raw.filter(r => !!r.staff_id && r.staff_id.trim() !== "");
  const invalid = raw.filter(r => !r.staff_id || r.staff_id.trim() === "");
  
  const ids = Array.from(new Set(valid.map(r => r.staff_id)));
  
  // Build staff name map - only if we have valid IDs
  const nameMap = new Map<string, string>();
  if (ids.length > 0) {
    const { data: staff, error: staffErr } = await sb
      .from("staff_profiles")
      .select("id, name, first_name, last_name")
      .in("id", ids);
    
    if (staffErr) throw staffErr;
    
    (staff ?? []).forEach(s => {
      const id = String((s as any).id);
      if (id) nameMap.set(id, fullName(s as any));
    });
  }
  
  // Enrich with staff_name; blanks become "Unassigned"
  const enrichedValid = valid.map(r => ({ 
    ...r, 
    staff_name: nameMap.get(r.staff_id) ?? r.staff_id 
  }));
  const enrichedInvalid = invalid.map(r => ({ 
    ...r, 
    staff_name: "Unassigned" 
  }));
  
  return [...enrichedValid, ...enrichedInvalid];
}

export async function countMonthlyAssignments({ sb, versionId, monthISO }: { sb: SupabaseClient; versionId: string; monthISO: string }) {
  const start = `${monthISO}-01`;
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().slice(0, 10);

  const { count, error } = await sb
    .from("roster_assignments")
    .select("id", { count: "exact", head: true })
    .eq("version_id", versionId)
    .gte("shift_start", start)
    .lt("shift_start", end);

  if (error) throw error;
  return count ?? 0;
}
