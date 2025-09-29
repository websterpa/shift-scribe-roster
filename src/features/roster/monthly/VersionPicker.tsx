import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Props = {
  sb: SupabaseClient;
  monthISO: string;                       // "YYYY-MM"
  value: string | null;                   // current version_id
  onChange: (v: string) => void;
};

export function VersionPicker({ sb, monthISO, value, onChange }: Props) {
  const [versions, setVersions] = useState<Array<{ version_id: string; count: number }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const start = `${monthISO}-01`;
    const endDate = new Date(start); 
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().slice(0,10);
    
    async function load() {
      setLoading(true);
      try {
        // Fetch distinct versions with counts for the month
        const { data, error } = await sb
          .from("roster_assignments")
          .select("version_id")
          .gte("shift_start", start)
          .lt("shift_start", end);

        if (!mounted) return;

        if (error) {
          console.error("Error loading versions:", error);
          setVersions([]);
        } else {
          // Aggregate by version_id
          const agg = new Map<string, number>();
          for (const row of data ?? []) {
            const v = (row as any).version_id as string;
            agg.set(v, (agg.get(v) ?? 0) + 1);
          }
          setVersions(Array.from(agg.entries()).map(([version_id, count]) => ({ version_id, count }))
            .sort((a,b)=>b.count-a.count));
        }
      } catch (err) {
        console.error("Error in version picker:", err);
        if (mounted) setVersions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [sb, monthISO]);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground">Version</label>
      <select
        className="border rounded px-2 py-1 text-sm"
        value={value ?? ""}
        onChange={(e)=> onChange(e.target.value)}
      >
        <option value="">{loading ? "Loading…" : "Select version"}</option>
        {versions.map(v => (
          <option key={v.version_id} value={v.version_id}>
            {v.version_id.slice(0,8)}…  ({v.count})
          </option>
        ))}
      </select>
    </div>
  );
}