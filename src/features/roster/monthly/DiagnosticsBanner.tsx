import { useEffect, useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchRequiredCodes } from "./requirements";
import type { EnrichedAssignment } from "./types";

type Props = {
  versionId: string;
  monthStartISO: string;
  monthEndISO: string;
  assignments: EnrichedAssignment[];
};

export default function DiagnosticsBanner({ versionId, monthStartISO, monthEndISO, assignments }: Props) {
  const [missing, setMissing] = useState<string[]>([]);
  const [unfilledDetails, setUnfilledDetails] = useState<Array<{ dateISO: string; dayIndex: number; shift: string; needed: number; filled: number; rejectionReasons: string[] }>>([]);
  const [dismissed, setDismissed] = useState(false);
  const [hasEverShownWarning, setHasEverShownWarning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      // Fetch version to get diagnostic data
      const { data: versionData } = await supabase
        .from('roster_versions')
        .select('version_name')
        .eq('id', versionId)
        .single();
      
      const required = await fetchRequiredCodes(versionId, monthStartISO, monthEndISO);
      if (cancel) return;
      
      const counts = new Map<string, number>();
      for (const a of assignments) {
        counts.set(a.shift_code, (counts.get(a.shift_code) ?? 0) + 1);
      }
      
      const miss: string[] = [];
      required.forEach(code => {
        if ((counts.get(code) ?? 0) === 0) miss.push(code);
      });
      setMissing(miss.sort());
      
      // TODO: Fetch unfilled shifts from generator result if available
      // For now, we'll just show basic missing shifts
      
      // Persist warning once it appears
      if (miss.length > 0) {
        setHasEverShownWarning(true);
      }
    })();
    return () => { cancel = true; };
  }, [versionId, monthStartISO, monthEndISO, assignments]);

  // Reset dismissed state when version changes
  useEffect(() => {
    setDismissed(false);
    setHasEverShownWarning(false);
  }, [versionId]);

  if (!hasEverShownWarning || dismissed) return null;

  const formatReason = (reason: string) => {
    const labels: Record<string, string> = {
      'unavailable': 'unavailable',
      'not-night-eligible': 'not night qualified',
      'already-assigned': 'already scheduled',
      'illegal-turnaround': '< 11h rest',
      'max-consec-days': 'max 6 days',
      'max-consec-nights': 'max 3 nights',
    };
    return labels[reason] || reason;
  };
  
  return (
    <div className="mb-2 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-medium mb-1">
            Missing required shift(s): <strong>{missing.join(", ")}</strong>
          </div>
          <div className="text-xs text-destructive/80">
            Check mapping / generator configuration.
          </div>
          
          {unfilledDetails.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-6 px-2 mt-2 text-destructive hover:bg-destructive/20"
              >
                {showDetails ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                {showDetails ? "Hide details" : "Show details"}
              </Button>
              
              {showDetails && (
                <div className="mt-2 space-y-1 text-xs">
                  {unfilledDetails.map((detail, idx) => (
                    <div key={idx} className="bg-destructive/5 p-2 rounded">
                      <span className="font-semibold">
                        Day {detail.dayIndex + 1} - {detail.shift}:
                      </span>{" "}
                      needed {detail.needed}, filled {detail.filled}
                      {detail.rejectionReasons.length > 0 && (
                        <div className="ml-2 mt-1 text-destructive/70">
                          Blocked by: {detail.rejectionReasons.map(formatReason).join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-5 w-5 p-0 hover:bg-destructive/20 text-destructive flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
