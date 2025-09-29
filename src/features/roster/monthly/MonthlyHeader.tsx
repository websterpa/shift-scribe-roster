import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countMonthlyAssignments } from "./useMonthlyAssignments";

export function MonthlyHeader({ sb, versionId, monthISO }: { sb: SupabaseClient; versionId: string; monthISO: string }) {
  const [count, setCount] = useState<number | null>(null);
  
  useEffect(() => {
    if (!versionId) { 
      setCount(0); 
      return; 
    }
    countMonthlyAssignments({ sb, versionId, monthISO })
      .then(setCount)
      .catch((err) => {
        console.error("Error counting assignments:", err);
        setCount(0);
      });
  }, [sb, versionId, monthISO]);

  return (
    <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <span>Version: {versionId ? `${versionId.slice(0,8)}…` : "—"}</span>
        <span>•</span>
        <span>Month: {monthISO}</span>
        <span>•</span>
        <span>Rows: {count ?? "…"}</span>
      </div>
    </div>
  );
}