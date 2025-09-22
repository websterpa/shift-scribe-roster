import React from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = { versionId: string; siteTz: string };
type Row = {
  day: string; shift: "E"|"L"|"N"|"D"; start_local: string|null; end_local: string|null;
  staff_id: string; staff_name: string; role: string|null; team: string|null;
};
const SHIFT_LABEL: Record<string,string> = { E:"Early (E)", L:"Late (L)", N:"Night (N)", D:"Day (D)" };

export default function MonthlyScheduleTab({ versionId, siteTz }: Props) {
  const today = new Date();
  const [cursor, setCursor] = React.useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string|null>(null);

  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState<""|"Supervisor"|"Staff">("");
  const [shift, setShift] = React.useState<""|"E"|"L"|"N"|"D">("");

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd   = new Date(cursor.getFullYear(), cursor.getMonth()+1, 0);

  React.useEffect(() => {
    let active = true;
    let dataSource = "roster_assignments";
    
    (async () => {
      setLoading(true); setError(null);
      try {
        // Try main table first
        let resp = await supabase
          .from("roster_assignments")
          .select(`
            date,
            shift_code,
            shift_start,
            shift_end,
            staff_id
          `)
          .eq("version_id", versionId)
          .gte("date", monthStart.toISOString().slice(0,10))
          .lte("date", monthEnd.toISOString().slice(0,10));

        // If no data or date column missing, try alternative approaches
        if (resp.error && /column.*date/i.test(resp.error.message)) {
          // Fallback: could implement calendar view here if needed
          throw new Error("Date column not found in roster_assignments table");
        }
        
        if (resp.error) throw new Error(resp.error.message);

        const data = resp.data || [];
        console.log(`MonthlyScheduleTab: Loaded ${data.length} assignments from ${dataSource}`);

        // Get staff details for the assignments
        const staffIds = [...new Set(data.map(r => r.staff_id))];
        let staffData: any[] = [];
        
        if (staffIds.length > 0) {
          const { data: staffResp, error: staffError } = await supabase
            .from("staff_profiles")
            .select("id, name, role, first_name, last_name")
            .in("id", staffIds);

          if (staffError) {
            console.warn("Failed to load staff details:", staffError.message);
          } else {
            staffData = staffResp || [];
          }
        }

        const staffMap = new Map(staffData.map(s => [s.id, s]));

        const mapped: Row[] = data.map((r:any) => {
          const staff = staffMap.get(r.staff_id);
          const staffName = staff?.name || 
            (staff?.first_name && staff?.last_name ? `${staff.first_name} ${staff.last_name}` : null) ||
            "Unknown Staff";
            
          return {
            day: r.date,
            shift: r.shift_code || "D",
            start_local: r.shift_start ? new Date(r.shift_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
            end_local: r.shift_end ? new Date(r.shift_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
            role: staff?.role || null,
            staff_id: r.staff_id,
            staff_name: staffName,
            team: null,
          };
        });
        
        if (active) setRows(mapped);
      } catch (e:any) { 
        console.error("MonthlyScheduleTab error:", e);
        if (active) setError(e?.message || "Failed to load monthly schedule."); 
      }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [versionId, monthStart.toISOString(), monthEnd.toISOString()]);

  const filtered = rows.filter(r => {
    const matchQ = !q || r.staff_name.toLowerCase().includes(q.toLowerCase()) || (r.team||"").toLowerCase().includes(q.toLowerCase());
    const matchRole = !role || r.role===role;
    const matchShift = !shift || r.shift===shift;
    return matchQ && matchRole && matchShift;
  });

  return (
    <section className="rounded-xl border bg-white p-3 md:p-4">
      {/* Diagnostics banner */}
      <div className="mb-3 text-xs rounded-md border bg-slate-50 text-slate-700 p-2">
        <strong>Monthly Schedule Diagnostics:</strong> Loaded rows: {rows.length} • 
        Filtered: {filtered.length} • 
        Version: {versionId.slice(0,8)}... • 
        Month: {monthStart.toLocaleString(undefined, { month:"long", year:"numeric" })}
        {error && <span className="text-red-600"> • Error: {error}</span>}
      </div>
      
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50" onClick={()=>setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))}>← Prev</button>
        <div className="font-semibold">{monthStart.toLocaleString(undefined, { month:"long", year:"numeric" })}</div>
        <button className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50" onClick={()=>setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))}>Next →</button>
        <button className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50" onClick={()=>setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input className="px-3 py-2 rounded-lg border bg-white" placeholder="Search name/team" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="px-3 py-2 rounded-lg border bg-white" value={role} onChange={e=>setRole(e.target.value as any)}>
            <option value="">All roles</option>
            <option value="Supervisor">Supervisors</option>
            <option value="Staff">Staff</option>
          </select>
          <select className="px-3 py-2 rounded-lg border bg-white" value={shift} onChange={e=>setShift(e.target.value as any)}>
            <option value="">All shifts</option>
            <option value="E">Early (E)</option>
            <option value="L">Late (L)</option>
            <option value="N">Night (N)</option>
            <option value="D">Day (D)</option>
          </select>
          <button className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50" onClick={()=>window.print()}>Print</button>
          <button className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50" onClick={()=>exportCsv(filtered, monthStart)}>CSV</button>
          <button className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50" onClick={()=>exportIcs(filtered, monthStart, siteTz)}>iCal</button>
        </div>
      </div>

      {loading && <div className="h-48 rounded-xl border bg-slate-50 animate-pulse" />}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-md border bg-amber-50 text-amber-900 p-3 text-sm">
          No assignments found for this month. Check the roster version's data,
          RLS permissions, or whether shifts were generated into <code>roster_assignments</code>.
        </div>
      )}
      {!loading && !error && <CalendarGrid monthStart={monthStart} rows={filtered} siteTz={siteTz} />}
      <p className="mt-3 text-xs text-slate-500">Legend: <b>E</b> Early • <b>L</b> Late • <b>N</b> Night • <b>D</b> Day</p>
    </section>
  );
}

function CalendarGrid({ monthStart, rows, siteTz }: { monthStart: Date; rows: Row[]; siteTz: string }) {
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth()+1, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun
  const cells: Array<{date: Date, items: Row[]}|null> = [];
  for (let i=0;i<startWeekday;i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
    const key = date.toISOString().slice(0,10);
    cells.push({ date, items: rows.filter(r => r.day === key) });
  }
  const weeks: typeof cells[] = [];
  for (let i=0; i<cells.length; i+=7) weeks.push(cells.slice(i, i+7));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[800px] w-full text-sm">
        <thead>
          <tr className="border-b">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(h=><th key={h} className="p-2 text-left text-slate-600">{h}</th>)}</tr>
        </thead>
        <tbody>
          {weeks.map((w,wi)=>(
            <tr key={wi} className="align-top">
              {Array.from({length:7}).map((_,di)=>{
                const c = w?.[di] ?? null;
                if (!c) return <td key={di} className="p-2" />;
                const isToday = new Date().toDateString() === c.date.toDateString();
                return (
                  <td key={di} className="p-2">
                    <div className={`rounded-lg border p-2 ${isToday?"border-blue-400":""}`}>
                      <div className="text-xs text-slate-500 mb-1">{c.date.getDate()}</div>
                      <ul className="space-y-1 max-h-52 overflow-auto pr-1">
                        {c.items.length===0 && <li className="text-xs text-slate-400">—</li>}
                        {c.items.map((r,i)=>(
                          <li key={i} className="rounded-md border px-2 py-1 flex items-center justify-between">
                            <span className="truncate" title={`${r.staff_name} — ${SHIFT_LABEL[r.shift] || r.shift}`}>{r.staff_name}</span>
                            <span className="ml-2 font-mono text-xs">
                              {r.shift}{r.start_local?` ${r.start_local.slice(0,5)}–${(r.end_local||"").slice(0,5)}`:""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function exportCsv(rows: Row[], monthStart: Date) {
  const name = `roster_${monthStart.toISOString().slice(0,7)}.csv`;
  const header = ["Date","Staff","Shift","Start","End","Role","Team"];
  const lines = rows.map(r => [r.day, r.staff_name, r.shift, r.start_local?.slice(0,5) ?? "", r.end_local?.slice(0,5) ?? "", r.role ?? "", r.team ?? ""]);
  const csv = [header, ...lines].map(a=>a.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function exportIcs(rows: Row[], monthStart: Date, tz: string) {
  const escape = (s:string) => s.replace(/([,;])/g, "\\$1");
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Shift Craft//Roster//EN","CALSCALE:GREGORIAN"];
  rows.forEach((r,i)=>{
    const start = `${r.day}T${(r.start_local||"00:00").slice(0,5).replace(":","")}00`;
    const end   = `${r.day}T${(r.end_local||"00:00").slice(0,5).replace(":","")}00`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${r.staff_id}-${r.day}-${i}@shiftcraft`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,
      `DTSTART;TZID=${tz}:${start}`,
      `DTEND;TZID=${tz}:${end}`,
      `SUMMARY:${escape(r.staff_name)} — ${r.shift}`,
      `DESCRIPTION:${SHIFT_LABEL[r.shift] || r.shift}`,
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  const name = `roster_${monthStart.toISOString().slice(0,7)}.ics`;
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}