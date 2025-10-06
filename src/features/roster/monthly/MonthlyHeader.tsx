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
            <div className="font-medium">⚠️ Missing Required Shifts: {warnings[0]}</div>
            <div className="text-xs mt-2">
              This roster version has requirements defined but no staff assignments. 
              The roster may have failed to generate properly, or you're viewing an incomplete version.
            </div>
            <div className="text-xs mt-2">
              <strong>Solutions:</strong>
              <ul className="list-disc ml-4 mt-1">
                <li>Try generating a new roster with staff assigned to all required shifts</li>
                <li>Check that staff profiles have eligible_shifts configured correctly</li>
                <li>Verify that the roster generation completed successfully</li>
              </ul>
            </div>
            <div className="mt-2">
              <a href="/wizard" className="text-blue-900 hover:underline font-medium">
                Create new roster →
              </a>
            </div>
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