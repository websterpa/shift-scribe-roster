import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeShiftCode } from "@/services/roster/helpers/normalizeShift";

type Props = { versionId: string };

type Assignment = {
  day: string;            // ISO date, e.g. "2025-09-22"
  day_idx: number;        // 0=Sun..6=Sat
  shift: "D"|"N"|"E"|"L"|string;
  staff_id: string;
  staff_name: string;
  team: string | null;
  role: string | null;
  start_local: string | null; // "HH:MM:SS" or null
  end_local: string | null;   // "HH:MM:SS" or null
  overtime_hours?: number | null;
};

type StaffFairness = {
  shifts: number;
  nights: number;
  weekends: number;
  publicHolidays: number;
  overtimeHours: number;
};

const NOMINAL_SCHEDULE: Record<string, { start: string; end: string }> = {
  D: { start: "07:00", end: "19:00" },
  N: { start: "19:00", end: "07:00" },
  E: { start: "06:00", end: "14:00" },
  L: { start: "14:00", end: "22:00" },
  _: { start: "09:00", end: "17:00" },
};

function toDate(dateISO: string, hhmm: string) {
  const s = hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  return new Date(`${dateISO}T${s}`);
}
function addDaysISO(dateISO: string, n: number) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekend(day_idx: number) { return day_idx === 0 || day_idx === 6; }

function resolveWindow(a: Assignment) {
  const token = (a.shift || "_").toUpperCase();
  const cfg = NOMINAL_SCHEDULE[token] || NOMINAL_SCHEDULE["_"];
  const startStr = (a.start_local ?? cfg.start).slice(0, 5);
  const endStr   = (a.end_local   ?? cfg.end).slice(0, 5);
  const start = toDate(a.day, startStr);
  let end = toDate(a.day, endStr);
  if (end <= start) end = toDate(addDaysISO(a.day, 1), endStr); // overnight
  return { start, end };
}

function restHoursBetween(a: Assignment, b: Assignment) {
  const { end } = resolveWindow(a);
  const { start } = resolveWindow(b);
  return (start.getTime() - end.getTime()) / 36e5; // ms->h
}

function riskBadge(hours: number | null) {
  if (hours == null || !isFinite(hours)) return { dot: "bg-slate-300", label: "Unknown rest" };
  if (hours < 11) return { dot: "bg-red-500", label: "<11h rest" };
  if (hours < 13) return { dot: "bg-amber-500", label: "11–13h rest" };
  return { dot: "bg-emerald-500", label: "≥13h rest" };
}

const tokenClass = (t: string) =>
  t === "R" ? "bg-slate-100 text-slate-500"
  : t === "N" ? "bg-indigo-50 text-indigo-700"
  : t === "D" ? "bg-blue-50 text-blue-700"
  : t === "E" ? "bg-emerald-50 text-emerald-700"
  : t === "L" ? "bg-amber-50 text-amber-700"
  : "bg-slate-50 text-slate-700";

// Prefer Night if multiple same-day tokens exist (safety against rare duplicates)
function chooseTokenForDay(list: Assignment[], dayISO: string) {
  const sameDay = list.filter(x => x.day === dayISO);
  if (sameDay.length === 0) return "R";
  // If any Night exists, show 'N' (so Nights never get hidden behind 'D')
  if (sameDay.some(x => x.shift === "N")) return "N";
  // Else prefer D/E/L in a stable order
  if (sameDay.some(x => x.shift === "D")) return "D";
  if (sameDay.some(x => x.shift === "E")) return "E";
  if (sameDay.some(x => x.shift === "L")) return "L";
  // Fallback to first token
  return (sameDay[0].shift || "R").toUpperCase();
}

export default function TeamLaneRoster({ versionId }: Props) {
  const [rows, setRows] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [holidays, setHolidays] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let alive = true;
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
            shift_end,
            hours
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

        const data: Assignment[] = (resp.data || []).map((r: any) => ({
          day: r.date,
          day_idx: new Date(r.date).getDay(),
          shift: normalizeShiftCode(r.shift_code),
          start_local: r.shift_start ? new Date(r.shift_start).toTimeString().slice(0, 8) : null,
          end_local: r.shift_end ? new Date(r.shift_end).toTimeString().slice(0, 8) : null,
          overtime_hours: r.hours && r.hours > 8 ? r.hours - 8 : 0,
          staff_id: r.staff_id,
          staff_name: staffMap.get(r.staff_id)?.display_name ?? "Unknown",
          team: `Team ${Math.floor(Math.random() * 4) + 1}`, // Temporary team assignment
          role: staffMap.get(r.staff_id)?.role ?? "Staff",
        }));
        
        if (alive) setRows(data);

      } catch (e: any) {
        alive && setError(e.message || "Failed to load team lanes.");
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [versionId]);

  if (loading) return <div className="p-4">Loading roster…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!rows.length) return <div className="p-4 text-slate-600">No assignments found for this roster version.</div>;

  // Build day headers, group by team -> staff
  const allDays = Array.from(new Set(rows.map(r => r.day))).sort();

  type StaffKey = string; type TeamKey = string;
  const teamMap = new Map<TeamKey, Map<StaffKey, Assignment[]>>();

  rows.forEach(r => {
    const team = r.team || "Unassigned";
    if (!teamMap.has(team)) teamMap.set(team, new Map());
    const staffKey = `${r.staff_id}|${r.staff_name}`;
    const staffMap = teamMap.get(team)!;
    if (!staffMap.has(staffKey)) staffMap.set(staffKey, []);
    staffMap.get(staffKey)!.push(r);
  });

  // Sort each staff's list by start time
  teamMap.forEach(staffMap => {
    staffMap.forEach(list => {
      list.sort((a, b) => resolveWindow(a).start.getTime() - resolveWindow(b).start.getTime());
    });
  });

  // Fairness counters
  const fairnessByStaff = new Map<StaffKey, StaffFairness>();
  teamMap.forEach(staffMap => {
    staffMap.forEach((list, staffKey) => {
      const f: StaffFairness = { shifts: 0, nights: 0, weekends: 0, publicHolidays: 0, overtimeHours: 0 };
      list.forEach(a => {
        f.shifts += 1;
        if (a.shift === "N") f.nights += 1;
        if (weekend(a.day_idx)) f.weekends += 1;
        if (holidays.has(a.day)) f.publicHolidays += 1;
        if (typeof a.overtime_hours === "number") f.overtimeHours += a.overtime_hours || 0;
      });
      fairnessByStaff.set(staffKey, f);
    });
  });

  // Precompute rest-risk gaps per staff
  function restDotBetween(list: Assignment[], dayISO: string) {
    // find current assignment on day and the next assignment in time
    const today = list.filter(x => x.day === dayISO)
                      .sort((a,b)=> resolveWindow(a).start.getTime() - resolveWindow(b).start.getTime());
    const next = list.find(x => x.day > dayISO);
    if (!today.length || !next) return null;
    // Use the last duty of today (in case of >1)
    const lastToday = today[today.length - 1];
    const hrs = restHoursBetween(lastToday, next);
    const { dot, label } = riskBadge(isFinite(hrs) ? hrs : null);
    return { hrs: isFinite(hrs) ? hrs : null, dot, label };
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow">
      <table className="min-w-[1100px] text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="p-2 text-left">Team</th>
            <th className="p-2 text-left">Staff</th>
            {allDays.map(d => (
              <th key={d} className="p-2 text-left">
                <div className="text-xs text-slate-500">{new Date(d).getDate()}</div>
              </th>
            ))}
            <th className="p-2 text-left">Fairness</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(teamMap.entries()).map(([team, staffMap]) => {
            const staffEntries = Array.from(staffMap.entries());
            return staffEntries.map(([staffKey, list], idx) => {
              const [, name] = staffKey.split("|");
              const fairness = fairnessByStaff.get(staffKey)!;

              return (
                <tr key={`${team}-${staffKey}`} className={`border-t ${idx===0 ? "border-slate-300" : "border-slate-100"}`}>
                  <td className="p-2 font-semibold">{idx===0 ? team : ""}</td>
                  <td className="p-2 whitespace-nowrap">{name}</td>

                  {allDays.map(d => {
                    const token = chooseTokenForDay(list, d);
                    const color = tokenClass(token);
                    const restDot = restDotBetween(list, d);
                    return (
                      <td key={d} className="p-2 align-top min-w-[80px]">
                        <div className={`inline-flex px-2 py-1 rounded ${color}`} title={token==="R" ? "Rest Day" : `Shift ${token}`}>
                          {token}
                        </div>
                        {restDot && (
                          <div className="mt-1 flex items-center gap-1" title={`${restDot.label}${restDot.hrs!=null ? ` (${restDot.hrs.toFixed(1)}h)` : ""}`}>
                            <span className={`inline-block w-2 h-2 rounded-full ${restDot.dot}`} />
                            <span className="text-[10px] text-slate-500">{restDot.hrs!=null ? `${restDot.hrs.toFixed(1)}h` : ""}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="p-2 align-top">
                    <div className="text-xs text-slate-700 space-y-1">
                      <div><span className="text-slate-500">Shifts:</span> {fairness.shifts}</div>
                      <div><span className="text-slate-500">Nights:</span> {fairness.nights}</div>
                      <div><span className="text-slate-500">Weekends:</span> {fairness.weekends}</div>
                      <div><span className="text-slate-500">PHs:</span> {fairness.publicHolidays}</div>
                      <div><span className="text-slate-500">OT hrs:</span> {fairness.overtimeHours}</div>
                    </div>
                  </td>
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
        <div className="flex items-center gap-1" title="Red means &lt;11h rest between adjacent duties">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> <span>🔴 &lt;11h</span>
        </div>
        <div className="ml-auto text-slate-500">R = Rest Day • D/E/L/N = Day/Early/Late/Night</div>
      </div>
    </div>
  );
}