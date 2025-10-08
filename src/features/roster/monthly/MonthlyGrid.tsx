import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday } from "date-fns";
import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X } from "lucide-react";

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
  
  // Calculate the day of week for the first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = startOfMonth(first).getDay();
  
  // Create padding cells for days before the month starts
  const paddingCells = Array.from({ length: firstDayOfWeek }, (_, i) => ({
    type: 'padding' as const,
    key: `padding-${i}`
  }));

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
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="bg-muted p-2 text-center font-medium text-xs border-r last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border border-border rounded-b-lg overflow-hidden flex-1">
        {/* Padding cells for days before month starts */}
        {paddingCells.map(cell => (
          <div 
            key={cell.key} 
            className="p-2 bg-muted/30 border-r border-b"
          />
        ))}
        
        {/* Actual month days */}
        {days.map(d => {
          const iso = format(d, "yyyy-MM-dd");
          const dayNum = format(d, "d");
          const assigns = byDate[iso] ?? [];
          const isTodayDate = isToday(d);
          const maxInline = 10;
          const moreCount = Math.max(0, assigns.length - maxInline);
          
          return (
            <button
              key={iso}
              className={`p-2 flex flex-col text-left hover:bg-muted/50 transition-colors border-r border-b ${
                isTodayDate ? "bg-primary/5 ring-2 ring-primary/20 ring-inset" : "bg-card"
              }`}
              onClick={() => setOpenDay(iso)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium text-sm ${isTodayDate ? "text-primary font-bold" : ""}`}>
                  {dayNum}
                  {isTodayDate && <span className="ml-1 text-[10px] text-primary">Today</span>}
                </span>
                {moreCount > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">+{moreCount}</span>
                )}
              </div>
              
              <div className="flex-1 space-y-1 overflow-hidden">
                {assigns.slice(0, maxInline).map((a, idx) => (
                  <div 
                    key={idx} 
                    title={`Staff: ${a.staff_name} (ID: ${a.staff_id})`}
                    className={"block rounded px-2 py-1 text-[11px] font-medium truncate " + (
                      a.shift_code === "N" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : 
                      a.shift_code === "E" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                      a.shift_code === "L" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                      a.shift_code === "D" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    )}
                  >
                    {a.shift_code} – {a.staff_name}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Right-side drawer */}
      <Sheet open={!!openDay} onOpenChange={(open) => !open && setOpenDay(null)}>
        <SheetContent side="right" className="w-[420px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Assignments — {openDay}</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-2 overflow-y-auto h-[calc(100vh-110px)] pr-1">
            {openDay && (byDate[openDay] ?? []).map((a, i) => (
              <div key={i} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={"px-2 py-1 rounded text-xs font-medium " + (
                        a.shift_code === "N" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : 
                        a.shift_code === "E" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                        a.shift_code === "L" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                        a.shift_code === "D" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                        "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                      )}>
                        {a.shift_code}
                      </span>
                      <span className="font-medium">{a.staff_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.shift_start?.slice(11,16)} → {a.shift_end?.slice(11,16) ?? "?"}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{a.staff_id ?? "Unassigned"}</div>
                </div>
              </div>
            ))}
            {openDay && (byDate[openDay] ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">No assignments for this day.</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}