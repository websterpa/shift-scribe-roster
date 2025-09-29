import type { SupabaseClient } from "@supabase/supabase-js";

type FetchArgs = {
  sb: SupabaseClient;
  versionId: string;
  monthISO: string;              // "YYYY-MM"
  shiftCodeFilter?: string;      // "ALL" | concrete shift_code
};

export async function fetchMonthlyAssignments({ sb, versionId, monthISO, shiftCodeFilter = "ALL" }: FetchArgs) {
  const start = `${monthISO}-01`;
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().slice(0, 10);

  let q = sb
    .from("roster_assignments")
    .select(`
      *,
      staff_profiles!inner (
        id,
        first_name,
        last_name,
        name,
        role
      )
    `)
    .eq("version_id", versionId)
    .gte("shift_start", start)
    .lt("shift_start", end);

  if (shiftCodeFilter && shiftCodeFilter !== "ALL") {
    q = q.eq("shift_code", shiftCodeFilter);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
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