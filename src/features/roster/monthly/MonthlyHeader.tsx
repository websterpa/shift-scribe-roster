import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countMonthlyAssignments } from "./useMonthlyAssignments";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <>
      {/* Diagnostic Banner - shown when required codes are missing */}
      {warnings.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <strong>Missing Required Shifts:</strong> {warnings[0]}
            <br />
            <span className="text-xs mt-1 block">
              Check that your shift code mapping is correct and staff are assigned to required shifts. 
              <a 
                href="/help" 
                target="_blank" 
                className="underline ml-1 hover:text-red-900"
              >
                View mapping documentation
              </a>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Status Bar */}
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
        </div>
      </div>
    </>
  );
}