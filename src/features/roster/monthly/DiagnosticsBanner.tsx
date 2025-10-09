import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [dismissed, setDismissed] = useState(false);
  const [hasEverShownWarning, setHasEverShownWarning] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
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
  
  return (
    <div className="mb-2 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start justify-between gap-2">
      <div className="flex-1">
        Missing required shift(s): <strong>{missing.join(", ")}</strong>. Check mapping / generator configuration.
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDismissed(true)}
        className="h-5 w-5 p-0 hover:bg-destructive/20 text-destructive"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
