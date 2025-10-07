import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// Hook version for React components
export function useActiveRoster(monthStartISO: string, monthEndISO: string, urlVersionId?: string) {
  const [activeVersionId, setActiveVersionId] = useState<string | null>(urlVersionId ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (urlVersionId) { 
        setActiveVersionId(urlVersionId);
        const d = new Date(monthStartISO + "T00:00:00");
        const month = d.toLocaleString(undefined, { month: "short", year: "numeric" });
        setLabel(`Active roster — ${month}`);
        return; 
      }
      
      setLoading(true); 
      setError(null);
      
      const start = `${monthStartISO.slice(0,7)}-01`;
      const endDate = new Date(start); 
      endDate.setMonth(endDate.getMonth() + 1);
      const end = endDate.toISOString().slice(0,10);
      
      const { data, error: err } = await (await import("@/integrations/supabase/client")).supabase
        .from("roster_assignments")
        .select("version_id")
        .gte("shift_start", start)
        .lt("shift_start", end);
      
      if (cancelled) return;
      if (err) { 
        setError(err.message); 
        setLoading(false); 
        return; 
      }
      
      const counts = new Map<string, number>();
      for (const r of (data ?? [])) {
        counts.set(r.version_id, (counts.get(r.version_id) ?? 0) + 1);
      }
      
      const best = [...counts.entries()].sort((a,b)=>b[1]-a[1])[0];
      const bestVersionId = best?.[0] ?? null;
      
      if (bestVersionId) {
        const d = new Date(monthStartISO + "T00:00:00");
        const month = d.toLocaleString(undefined, { month: "short", year: "numeric" });
        setLabel(`Active roster — ${month}`);
      }
      
      setActiveVersionId(bestVersionId);
      setLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [monthStartISO, monthEndISO, urlVersionId]);

  return { activeVersionId, loading, error, label };
}

// Function version for direct calls
export async function resolveActiveRosterVersion(sb: SupabaseClient, monthISO: string, siteName?: string) {
  const start = `${monthISO}-01`;
  const endDate = new Date(start); 
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().slice(0,10);

  console.log(`🔍 Resolving active roster for month: ${monthISO}, date range: ${start} to ${end}`);

  // Get counts per version for this month
  const { data, error } = await sb
    .from("roster_assignments")
    .select("version_id, shift_start")
    .gte("shift_start", start)
    .lt("shift_start", end);

  if (error) {
    console.error("❌ Error fetching assignments:", error);
    return null;
  }

  if (!data || data.length === 0) {
    console.warn("⚠️ No assignments found for this month");
    return null;
  }

  const counts = new Map<string, number>();
  for (const r of data) {
    counts.set(r.version_id, (counts.get(r.version_id) ?? 0) + 1);
  }
  
  console.log(`📊 Found ${counts.size} versions with assignments:`, 
    [...counts.entries()].map(([id, count]) => `${id.slice(0,8)}... (${count} assignments)`).join(", ")
  );

  const best = [...counts.entries()].sort((a,b)=>b[1]-a[1])[0];
  if (!best || best[1] === 0) {
    console.warn("⚠️ No version with assignments found");
    return null;
  }

  console.log(`✅ Selected version ${best[0].slice(0,8)}... with ${best[1]} assignments`);

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
