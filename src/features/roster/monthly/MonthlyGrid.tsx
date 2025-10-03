import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday } from "date-fns";
import { useMemo, useState } from "react";

type Row = { 
  shift_start: string; 
  shift_end?: string; 
  shift_code: string; 
  staff_id: string;
  staff_name: string;
};
type Props = { monthISO: string; rows: Row[] };

export function MonthlyGrid({ monthISO, rows }: Props) {
  const first = new Date(`${monthISO}-01T00:00:00`);
  const days = eachDayOfInterval({ start: startOfMonth(first), end: endOfMonth(first) });

  const byDate = useMemo(() => {
    const m: Record<string, Row[]> = {};
    for (const r of rows) {
      const d = r.shift_start.slice(0,10);
      if (!d.startsWith(monthISO)) continue;
      (m[d] ??= []).push(r);
    }
    return m;
  }, [rows, monthISO]);

  const [openDay, setOpenDay] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-7 border border-border rounded-lg overflow-hidden flex-1">
        {/* Header */}
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="bg-muted p-3 text-center font-medium text-sm border-r border-b last:border-r-0">
            {d}
          </div>
        ))}
        
        {/* Calendar Days */}
        {days.map(d => {
          const iso = format(d, "yyyy-MM-dd");
          const dayNum = format(d, "d");
          const assigns = byDate[iso] ?? [];
          const isTodayDate = isToday(d);
          
          return (
            <button
              key={iso}
              className={`p-1 min-h-[120px] flex flex-col text-left hover:bg-muted/50 border-r border-b last:border-r-0 ${
                isTodayDate ? "bg-primary/5 ring-2 ring-primary/20 ring-inset" : "bg-card"
              }`}
              onClick={() => setOpenDay(iso)}
            >
              <div className={`font-medium text-sm mb-1 ${isTodayDate ? "text-primary font-bold" : ""}`}>
                {dayNum}
                {isTodayDate && <span className="ml-1 text-[10px] text-primary">Today</span>}
              </div>
              
              <div className="flex-1 space-y-1 overflow-hidden">
                {assigns.slice(0,10).map((a, idx) => (
                  <span 
                    key={idx} 
                    title={`Staff ID: ${a.staff_id}`}
                    className={"inline-block rounded px-1 py-0.5 text-[11px] " + (a.shift_code === "N" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800")}
                  >
                    {a.shift_code}: {a.staff_name}
                  </span>
                ))}
                {assigns.length > 10 && (
                  <div className="text-[10px] text-muted-foreground">+{assigns.length - 10} more…</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Drawer */}
      {openDay && (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl border-l p-4 overflow-auto z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Assignments · {openDay}</div>
            <button 
              className="text-sm text-muted-foreground hover:text-foreground" 
              onClick={()=>setOpenDay(null)}
            >
              Close
            </button>
          </div>
          <div className="space-y-2">
            {(byDate[openDay] ?? []).map((a, i) => (
              <div key={i} className="border rounded p-2 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    <span className={"mr-2 px-1 py-0.5 rounded text-[11px] " + (a.shift_code === "N" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800")}>
                      {a.shift_code}
                    </span>
                    {a.staff_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.shift_start?.slice(11,16)} → {a.shift_end?.slice(11,16) ?? "?"}
                  </div>
                </div>
              </div>
            ))}
            {((byDate[openDay] ?? []).length === 0) && (
              <div className="text-sm text-muted-foreground">No assignments.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}