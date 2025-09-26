import React from "react";
import { useRosterDebug } from "@/hooks/useRosterDebug";

export default function RosterDebugDrawer({ versionId }: { versionId?: string | null }) {
  const { loading, error, req, asg, night } = useRosterDebug(versionId);
  
  if (import.meta.env.PROD) return null;
  if (!versionId) return null;
  
  const row = (t: string, o: Record<string, number>) => (
    <div className="text-xs">
      <b>{t}:</b> {Object.entries(o).map(([k, v]) => `${k}:${v}`).join(" • ") || "—"}
    </div>
  );
  
  return (
    <details className="rounded-md border p-2 bg-slate-50 text-slate-800 mb-3">
      <summary className="cursor-pointer text-sm font-semibold">
        Debug: tokens & Night gap
      </summary>
      {loading && <div className="text-xs">Loading…</div>}
      {error && <div className="text-xs text-red-600">Error: {error}</div>}
      {!loading && !error && (
        <div className="space-y-1">
          {row("Requirements", req)}
          {row("Assignments", asg)}
          <div className="text-xs">
            <b>Night gap:</b> {night ? `need:${night.need} • planned:${night.planned} • gap:${night.gap}` : "—"}
          </div>
          <div className="text-[11px] text-slate-500">
            Checkpoints → W1 save • DB1 req • G1 input • G2 output • DB2 asg
          </div>
        </div>
      )}
    </details>
  );
}