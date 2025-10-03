import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countMonthlyAssignments } from "./useMonthlyAssignments";

export function MonthlyHeader({ 
  sb, 
  versionId, 
  monthISO, 
  humanLabel, 
  warnings = [] 
}: { 
  sb: SupabaseClient; 
  versionId: string; 
  monthISO: string; 
  humanLabel: string; 
  warnings?: string[]; 
}) {
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
      <div className="flex items-center gap-2 flex-wrap">
        <span title={versionId ? `Full UUID: ${versionId}` : "No version selected"} className="flex items-center gap-2">
          Active Roster: <strong>{humanLabel}</strong>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Active
          </span>
        </span>
        <span>•</span>
        <span>Month: {monthISO}</span>
        <span>•</span>
        <span>Assignments: {count ?? "…"}</span>
        {warnings.length > 0 && (
          <>
            <span>•</span>
            <span 
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 cursor-help"
              title={warnings.join(" | ")}
            >
              ⚠ {warnings[0]}
            </span>
          </>
        )}
      </div>
    </div>
  );
}