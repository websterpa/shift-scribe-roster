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
      <div className="grid grid-cols-7 border border-border rounded-lg overflow-hidden h-full">
        {/* Header */}
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="bg-muted p-3 text-center font-medium text-sm border-r border-b last:border-r-0">
            {d}
          </div>
        ))}
        
        {/* Calendar Days */}
        {/* Padding cells for days before month starts */}
        {paddingCells.map(cell => (
          <div 
            key={cell.key} 
            className="p-1 min-h-[120px] bg-muted/30 border-r border-b"
          />
        ))}
        
        {/* Actual month days */}
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
                    {a.shift_code} – {a.staff_name}
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
      <Sheet open={!!openDay} onOpenChange={(open) => !open && setOpenDay(null)}>
        <SheetContent side="right" className="w-[420px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Assignments · {openDay}</span>
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-2">
            {openDay && (byDate[openDay] ?? []).map((a, i) => (
              <div key={i} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={"px-2 py-1 rounded text-xs font-medium " + (a.shift_code === "N" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800")}>
                        {a.shift_code}
                      </span>
                      <span className="font-medium">{a.staff_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{a.shift_start?.slice(11,16)} → {a.shift_end?.slice(11,16) ?? "?"}</span>
                    </div>
                  </div>
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