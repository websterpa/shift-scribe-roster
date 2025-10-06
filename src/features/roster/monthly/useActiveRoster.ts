import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveActiveRosterVersion(sb: SupabaseClient, monthISO: string, siteName?: string) {
  const start = `${monthISO}-01`;
  const endDate = new Date(start); 
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().slice(0,10);

  // Get counts per version for this month
  const { data, error } = await sb
    .from("roster_assignments")
    .select("version_id, shift_start")
    .gte("shift_start", start)
    .lt("shift_start", end);

  if (error || !data) return null;

  const counts = new Map<string, number>();
  for (const r of data) {
    counts.set(r.version_id, (counts.get(r.version_id) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a,b)=>b[1]-a[1])[0];
  if (!best) return null;

  // Fetch version details to get the actual version number
  const { data: versionData } = await sb
    .from("roster_versions")
    .select("version_number, version_name")
    .eq("id", best[0])
    .single();

  // Build a human label
  const monthName = new Date(start).toLocaleString(undefined, { month: "short", year: "numeric" });
  const versionLabel = versionData?.version_name || `v${versionData?.version_number ?? "?"}`;
  const label = `${siteName ? siteName + " – " : ""}${monthName} (${versionLabel})`;

  return { versionId: best[0], rows: best[1], label };
}