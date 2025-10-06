import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toCode } from "./shiftMapping";

type Item = { shift_code: string; required: number; assigned: number };

function pad(n: number) { return String(n).padStart(2, "0"); }

function weekday(dateISO: string) { return new Date(dateISO + "T00:00:00").getDay(); } // 0..6

function expandLegacyRequirements(legacy: any, monthISO: string): Record<string, number> {
  // legacy: {"0":{"D":2,"N":1}, …}
  const counts: Record<string, number> = {};
  const [y, m] = monthISO.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  for (let day=1; day<=daysInMonth; day++) {
    const dateISO = `${monthISO}-${pad(day)}`;
    const w = String(weekday(dateISO));
    const spec = legacy[w];
    if (!spec) continue;
    for (const keyLogicalOrCode of Object.keys(spec)) {
      const code = toCode(keyLogicalOrCode); // Map to codes
      counts[code] = (counts[code] ?? 0) + Number(spec[keyLogicalOrCode] ?? 0);
    }
  }
  return counts;
}

function expandNewRequirements(daysObj: any, monthISO: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [dateISO, list] of Object.entries(daysObj as Record<string, any[]>)) {
    if (!dateISO.startsWith(monthISO)) continue;
    for (const it of (list ?? [])) {
      const logicalOrCode = (it.shift_code ?? "UNK");
      const code = toCode(logicalOrCode); // Map logical names to codes
      const needed = Math.max(1, Number(it.needed ?? 1));
      counts[code] = (counts[code] ?? 0) + needed;
    }
  }
  return counts;
}

export async function loadStaffingOverview(sb: SupabaseClient, { versionId, monthISO }:{ versionId: string; monthISO: string }) {
  const start = `${monthISO}-01`;
  const endDate = new Date(start); 
  endDate.setMonth(endDate.getMonth()+1);
  const end = endDate.toISOString().slice(0,10);

  // 1) Assigned counts by shift_code
  const { data: asg, error: asgErr } = await sb
    .from("roster_assignments")
    .select("shift_code")
    .eq("version_id", versionId)
    .gte("shift_start", start)
    .lt("shift_start", end);

  if (asgErr) throw asgErr;
  const assignedCounts: Record<string, number> = {};
  for (const r of (asg ?? [])) {
    const code = (r as any).shift_code ?? "UNK";
    assignedCounts[code] = (assignedCounts[code] ?? 0) + 1;
  }

  // 2) Required counts (try reading requirements JSON from roster_config)
  // We attempt both shapes: new {days:{…}} and legacy {"0":{…}}
  const { data: cfg } = await sb
    .from("roster_config")
    .select("staffing_requirements")
    .eq("id", versionId)
    .single();

  const req = cfg?.staffing_requirements ?? null;
  let requiredCounts: Record<string, number> = {};
  if (req && req.days) requiredCounts = expandNewRequirements(req.days, monthISO);
  else if (req) requiredCounts = expandLegacyRequirements(req, monthISO);

  // Merge into items
  const codes = new Set([...Object.keys(assignedCounts), ...Object.keys(requiredCounts)]);
  const items: Item[] = [];
  for (const code of codes) {
    items.push({ shift_code: code, required: requiredCounts[code] ?? 0, assigned: assignedCounts[code] ?? 0 });
  }
  return items.sort((a,b)=>a.shift_code.localeCompare(b.shift_code));
}

export function StaffingOverview({ sb, versionId, monthISO }: { sb: SupabaseClient; versionId: string; monthISO: string }) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!versionId) { setItems([]); return; }
    loadStaffingOverview(sb, { versionId, monthISO }).then(setItems).catch(()=>setItems([]));
  }, [sb, versionId, monthISO]);

  const monthDate = new Date(`${monthISO}-01`);
  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-muted/30 p-4 rounded-lg mb-4">
      <div className="text-sm font-medium mb-2">Staffing Overview</div>
      <div className="text-xs text-muted-foreground mb-3">Coverage for {monthLabel}</div>
      <div className="flex gap-4 flex-wrap">
        {items.map(it => {
          const pct = it.required > 0 ? Math.min(100, Math.round((it.assigned / it.required) * 100)) : 0;
          const shiftLabel = { E: "Early", L: "Late", N: "Night", D: "Day" }[it.shift_code] || it.shift_code;
          
          return (
            <div key={it.shift_code} className="flex items-center gap-2 bg-card p-2 rounded border">
              <div className="text-sm font-medium min-w-[60px]">{shiftLabel} ({it.shift_code})</div>
              <div className="text-xs text-muted-foreground min-w-[40px]">{it.assigned}/{it.required}</div>
              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={"h-2 rounded transition-all " + (it.shift_code === "N" ? "bg-purple-500" : "bg-blue-500")} 
                  style={{ width: `${pct}%` }} 
                />
              </div>
              <div className="text-xs font-medium">{pct}%</div>
            </div>
          );
        })}
        {items.length === 0 && <div className="text-sm text-muted-foreground">No requirement data found.</div>}
      </div>
    </div>
  );
}