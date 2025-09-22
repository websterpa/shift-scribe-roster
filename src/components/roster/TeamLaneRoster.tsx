import React from "react";
import { supabase } from "@/integrations/supabase/client";

// -------------------- Types --------------------
type Props = { versionId: string };

type Assignment = {
  day: string;            // ISO date e.g. 2025-09-22
  day_idx: number;        // 0=Sun..6=Sat
  shift: "D"|"N"|"E"|"L"|string;
  staff_id: string;
  staff_name: string;
  team: string | null;
  role: string | null;
  start_local: string | null; // HH:MM:SS or null
  end_local: string | null;   // HH:MM:SS or null
};

type StaffFairness = {
  shifts: number;
  nights: number;
  weekends: number;
  publicHolidays: number;
  overtimeHours: number; // placeholder (0 unless you store it)
};

// -------------------- Nominal shift time fallbacks --------------------
// Used only if start_local/end_local are missing.
const NOMINAL_SCHEDULE: Record<string, { start: string; end: string }> = {
  D: { start: "07:00", end: "19:00" },
  N: { start: "19:00", end: "07:00" },
  E: { start: "06:00", end: "14:00" },
  L: { start: "14:00", end: "22:00" },
  // default for unknown: treat as 8h day starting 09:00
  _: { start: "09:00", end: "17:00" },
};

// -------------------- Utils --------------------
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60) + (m || 0);
}
function toDate(dateISO: string, hhmm: string) {
  const d = new Date(dateISO + "T" + (hhmm.length===5? hhmm + ":00" : hhmm));
  return d;
}
function addDays(dateISO: string, days: number) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}
function weekendFromIdx(day_idx: number) {
  return day_idx === 0 || day_idx === 6;
}

// Compute actual start/end Date objects for an assignment using real times if present,
// otherwise nominal. Handles overnight end (end on next calendar day if end <= start).
function resolveAssignmentWindow(a: Assignment) {
  const token = (a.shift || "_").toUpperCase();
  const fallback = NOMINAL_SCHEDULE[token] || NOMINAL_SCHEDULE["_"];
  const startStr = (a.start_local ?? fallback.start).slice(0,5);
  const endStr   = (a.end_local   ?? fallback.end).slice(0,5);

  const start = toDate(a.day, startStr);
  let end = toDate(a.day, endStr);
  // If end is earlier/equal than start, assume overnight to next day
  if (end <= start) {
    const nextDay = addDays(a.day, 1);
    end = toDate(nextDay, endStr);
  }
  return { start, end };
}

// Compute rest (gap) in hours between A and B (A before B).
function restHoursBetween(a: Assignment, b: Assignment) {
  const { end } = resolveAssignmentWindow(a);
  const { start } = resolveAssignmentWindow(b);
  const ms = start.getTime() - end.getTime();
  return ms / (1000 * 60 * 60);
}

function riskToColor(hours: number | null) {
  if (hours == null) return { dot: "bg-slate-300", text: "text-slate-500", label: "Unknown rest" };
  if (hours < 11) return { dot: "bg-red-500", text: "text-red-700", label: `<11h rest` };
  if (hours < 13) return { dot: "bg-amber-500", text: "text-amber-700", label: `11–13h rest` };
  return { dot: "bg-emerald-500", text: "text-emerald-700", label: `≥13h rest` };
}

// -------------------- Component --------------------
export default function TeamLaneRoster({ versionId }: Props) {
  const [rows, setRows] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string|null>(null);
  const [holidays, setHolidays] = React.useState<Set<string>>(new Set()); // optional

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError(null);

      try {
        let resp: any = await supabase
          .from("roster_assignments")
          .select(`
            date,
            shift_code,
            staff_id,
            shift_start,
            shift_end
          `)
          .eq("version_id", versionId);
        
        if (resp.error) throw resp.error;

        // Get staff details
        const staffIds = [...new Set(resp.data?.map((a: any) => a.staff_id).filter(Boolean) || [])] as string[];
        const { data: staffData, error: staffError } = await supabase
          .from('staff_profiles')
          .select('id, name, first_name, last_name, role')
          .in('id', staffIds);

        if (staffError) {
          console.warn('Staff data error:', staffError.message);
        }

        const staffMap = new Map(
          (staffData || []).map(s => [
            s.id, {
              ...s,
              display_name: s.name || (s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : 'Unknown Staff')
            }
          ])
        );

        const mapped: Assignment[] = (resp.data || []).map((r: any) => ({
          day: r.date,
          day_idx: new Date(r.date).getDay(),
          shift: r.shift_code || "R",
          start_local: r.shift_start ? new Date(r.shift_start).toTimeString().slice(0, 8) : null,
          end_local: r.shift_end ? new Date(r.shift_end).toTimeString().slice(0, 8) : null,
          staff_id: r.staff_id,
          staff_name: staffMap.get(r.staff_id)?.display_name ?? "Unknown",
          team: `Team ${Math.floor(Math.random() * 4) + 1}`, // Temporary team assignment
          role: staffMap.get(r.staff_id)?.role ?? "Staff",
        }));
        
        if (active) setRows(mapped);

      } catch (e: any) {
        if (active) setError(e.message || "Failed to load team lanes.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [versionId]);

  if (loading) return <div className="p-4">Loading roster…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!rows.length) return <div className="p-4 text-slate-600">No assignments found for this roster version.</div>;

  // ---- Group by team then by staff, build ordered day columns ----
  const allDays = Array.from(new Set(rows.map(r => r.day))).sort(); // ISO strings
  type StaffKey = string;
  type TeamKey = string;

  // Map: team -> staff -> assignments[]
  const teamMap = new Map<TeamKey, Map<StaffKey, Assignment[]>>();
  rows.forEach(r => {
    const team = r.team || "Unassigned";
    if (!teamMap.has(team)) teamMap.set(team, new Map());
    const staffKey = `${r.staff_id}|${r.staff_name}`;
    const staffMap = teamMap.get(team)!;
    if (!staffMap.has(staffKey)) staffMap.set(staffKey, []);
    staffMap.get(staffKey)!.push(r);
  });

  // Sort each staff's assignments by actual start time
  teamMap.forEach(staffMap => {
    staffMap.forEach(list => {
      list.sort((a,b) => resolveAssignmentWindow(a).start.getTime() - resolveAssignmentWindow(b).start.getTime());
    });
  });

  // Compute fairness counters
  const fairnessByStaff = new Map<StaffKey, StaffFairness>();
  teamMap.forEach(staffMap => {
    staffMap.forEach((list, staffKey) => {
      const counters: StaffFairness = { shifts: 0, nights: 0, weekends: 0, publicHolidays: 0, overtimeHours: 0 };
      list.forEach(a => {
        counters.shifts += 1;
        if (a.shift === "N") counters.nights += 1;
        if (weekendFromIdx(a.day_idx)) counters.weekends += 1;
        if (holidays.has(a.day)) counters.publicHolidays += 1;
        // overtimeHours: set to 0 for now (fill from assignments column if available)
      });
      fairnessByStaff.set(staffKey, counters);
    });
  });

  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow">
      <table className="min-w-[1100px] text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="p-2 text-left">Team</th>
            <th className="p-2 text-left">Staff</th>
            {allDays.map(d => (
              <th key={d} className="p-2 text-left align-bottom">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{new Date(d).getDate()}</span>
                </div>
              </th>
            ))}
            <th className="p-2 text-left">Fairness</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(teamMap.entries()).map(([team, staffMap]) => {
            const staffEntries = Array.from(staffMap.entries());

            return staffEntries.map(([staffKey, list], idx) => {
              const [, staffName] = staffKey.split("|");
              // Build a quick lookup day->assignment for token cell fill
              const byDay = new Map<string, Assignment>();
              list.forEach(a => byDay.set(a.day, a));

              // Compute rest-risk dots between consecutive shifts:
              const dots: Record<string, { hours: number|null; color: string; title: string }> = {};
              for (let i = 0; i < list.length - 1; i++) {
                const a = list[i], b = list[i+1];
                const hrs = restHoursBetween(a, b);
                const c = riskToColor(Number.isFinite(hrs) ? hrs : null);
                dots[`${a.day}→${b.day}`] = { hours: Number.isFinite(hrs) ? hrs : null, color: c.dot, title: c.label };
              }

              const fairness = fairnessByStaff.get(staffKey)!;
              const fairnessEl = (
                <div className="text-xs text-slate-700 space-y-1">
                  <div><span className="text-slate-500">Shifts:</span> {fairness.shifts}</div>
                  <div><span className="text-slate-500">Nights:</span> {fairness.nights}</div>
                  <div><span className="text-slate-500">Weekends:</span> {fairness.weekends}</div>
                  <div><span className="text-slate-500">PHs:</span> {fairness.publicHolidays}</div>
                  <div><span className="text-slate-500">OT hrs:</span> {fairness.overtimeHours}</div>
                </div>
              );

              return (
                <tr key={`${team}-${staffKey}`} className={`border-t ${idx===0 ? "border-slate-300" : "border-slate-100"}`}>
                  {/* Team cell only on the first row per team (rowspan trick via group header rows would be nicer; keeping simple) */}
                  <td className="p-2 font-semibold">{idx===0 ? team : ""}</td>
                  <td className="p-2 whitespace-nowrap">{staffName}</td>

                  {allDays.map((d, colIdx) => {
                    const a = byDay.get(d);
                    const token = a?.shift ?? "R";
                    const isRest = token === "R";
                    const color =
                      isRest ? "bg-slate-100 text-slate-500"
                      : token === "N" ? "bg-indigo-50 text-indigo-700"
                      : token === "D" ? "bg-blue-50 text-blue-700"
                      : token === "E" ? "bg-emerald-50 text-emerald-700"
                      : token === "L" ? "bg-amber-50 text-amber-700"
                      : "bg-slate-50 text-slate-700";

                    // Rest-risk dot between today and next assignment day (only draw after this cell if there is a subsequent duty).
                    let dotEl: React.ReactNode = null;
                    if (a) {
                      const next = list.find(b => b.day > d);
                      if (next) {
                        const key = `${a.day}→${next.day}`;
                        const info = dots[key];
                        if (info) {
                          dotEl = (
                            <div className="mt-1 flex items-center gap-1" title={`${info.title}${info.hours!=null ? ` (${info.hours.toFixed(1)}h)` : ""}`}>
                              <span className={`inline-block w-2 h-2 rounded-full ${info.color}`} />
                              <span className="text-[10px] text-slate-500">{info.hours!=null ? `${info.hours.toFixed(1)}h` : ""}</span>
                            </div>
                          );
                        }
                      }
                    }

                    return (
                      <td key={d} className="p-2 align-top min-w-[80px]">
                        <div className={`inline-flex px-2 py-1 rounded ${color}`} title={isRest ? "Rest Day" : `Shift ${token}`}>
                          {token}
                        </div>
                        {dotEl}
                      </td>
                    );
                  })}

                  <td className="p-2 align-top">{fairnessEl}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="p-3 border-t text-xs text-slate-600 flex flex-wrap items-center gap-4">
        <div className="font-semibold">Rest-risk legend:</div>
        <div className="flex items-center gap-1" title="Green means ≥13h rest between adjacent duties">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> <span>🟢 ≥13h</span>
        </div>
        <div className="flex items-center gap-1" title="Amber means 11–13h rest between adjacent duties">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> <span>🟡 11–13h</span>
        </div>
        <div className="flex items-center gap-1" title="Red means <11h rest between adjacent duties">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> <span>🔴 &lt;11h</span>
        </div>
      </div>
    </div>
  );
}