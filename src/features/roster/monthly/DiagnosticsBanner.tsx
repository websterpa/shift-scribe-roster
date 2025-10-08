import { useEffect, useState } from "react";
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
    })();
    return () => { cancel = true; };
  }, [versionId, monthStartISO, monthEndISO, assignments]);

  if (missing.length === 0) return null;
  
  return (
    <div className="mb-2 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      Missing required shift(s): <strong>{missing.join(", ")}</strong>. Check mapping / generator configuration.
    </div>
  );
}
