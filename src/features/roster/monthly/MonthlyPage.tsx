import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchMonthlyAssignments } from "./useMonthlyAssignments";
import { VersionPicker } from "./VersionPicker";
import { MonthlyHeader } from "./MonthlyHeader";
import { normalizeShiftCode } from "@/utils/roster/normalizeShift";

type Assignment = {
  id: string;
  date: string;
  shift_code: string;
  shift_start: string;
  shift_end: string;
  staff_id: string;
  staff_profiles: {
    id: string;
    first_name: string;
    last_name: string;
    name?: string;
    role?: string;
  };
};

const SHIFT_LABEL: Record<string,string> = { E:"Early (E)", L:"Late (L)", N:"Night (N)", D:"Day (D)" };

export function MonthlyPage() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();

  const monthISO = sp.get("month") ?? new Date().toISOString().slice(0,7);
  const versionParam = sp.get("version") ?? "";
  const [versionId, setVersionId] = useState(versionParam);

  const [shiftCodeFilter, setShiftCodeFilter] = useState("ALL");
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!versionId) { 
      setRows([]);
      setError(null);
      return; 
    }
    setLoading(true);
    setError(null);
    fetchMonthlyAssignments({ sb: supabase, versionId, monthISO, shiftCodeFilter })
      .then(setRows)
      .catch((err) => {
        console.error("Error fetching monthly assignments:", err);
        setError(err.message || "Failed to load assignments");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [versionId, monthISO, shiftCodeFilter]);

  function applyVersion(v: string) {
    setVersionId(v);
    sp.set("version", v);
    sp.set("month", monthISO);
    navigate({ search: sp.toString() }, { replace: true });
  }

  function handleMonthChange(direction: 'prev' | 'next' | 'current') {
    const currentDate = new Date(monthISO + "-01");
    let newDate: Date;
    
    switch (direction) {
      case 'prev':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        break;
      case 'next':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        break;
      case 'current':
        newDate = new Date();
        break;
    }
    
    const newMonthISO = newDate.toISOString().slice(0, 7);
    sp.set("month", newMonthISO);
    if (versionId) sp.set("version", versionId);
    navigate({ search: sp.toString() }, { replace: true });
  }

  // Group assignments by date for calendar display
  const assignmentsByDate = rows.reduce((acc, assignment) => {
    const date = new Date(assignment.shift_start).toISOString().slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  const monthStart = new Date(monthISO + "-01");
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Monthly Schedule</h1>
        
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <VersionPicker 
            sb={supabase}
            monthISO={monthISO}
            value={versionId}
            onChange={applyVersion}
          />
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Month</label>
            <div className="flex items-center gap-1">
              <button 
                className="px-2 py-1 text-sm border rounded hover:bg-muted"
                onClick={() => handleMonthChange('prev')}
              >
                ←
              </button>
              <span className="px-3 py-1 text-sm font-medium min-w-[120px] text-center">
                {monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                className="px-2 py-1 text-sm border rounded hover:bg-muted"
                onClick={() => handleMonthChange('next')}
              >
                →
              </button>
              <button 
                className="px-2 py-1 text-sm border rounded hover:bg-muted"
                onClick={() => handleMonthChange('current')}
              >
                Today
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Shift</label>
            <select 
              className="border rounded px-2 py-1 text-sm" 
              value={shiftCodeFilter} 
              onChange={(e)=> setShiftCodeFilter(e.target.value)}
            >
              <option value="ALL">All shifts</option>
              <option value="D">D (Day)</option>
              <option value="N">N (Night)</option>
              <option value="E">E (Early)</option>
              <option value="L">L (Late)</option>
            </select>
          </div>
        </div>

        {versionId && <MonthlyHeader sb={supabase} versionId={versionId} monthISO={monthISO} />}
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading…</div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 mb-4">
          Error: {error}
        </div>
      )}

      {!loading && !error && !versionId && (
        <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
          Please select a roster version to view assignments.
        </div>
      )}

      {!loading && !error && versionId && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            Loaded rows: {rows.length}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-sm font-medium text-center border-b">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 h-24"></div>
            ))}
            
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = `${monthISO}-${day.toString().padStart(2, '0')}`;
              const assignments = assignmentsByDate[date] || [];
              const isToday = new Date().toISOString().slice(0, 10) === date;
              
              return (
                <div 
                  key={day} 
                  className={`p-2 h-24 border rounded text-sm ${
                    isToday ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="font-medium mb-1">{day}</div>
                  <div className="space-y-1 overflow-y-auto max-h-16">
                    {assignments.length === 0 && (
                      <div className="text-xs text-muted-foreground">—</div>
                    )}
                    {assignments.map((assignment, idx) => {
                      const staff = assignment.staff_profiles;
                      const staffName = staff?.name || 
                        (staff?.first_name && staff?.last_name ? `${staff.first_name} ${staff.last_name}` : 'Unknown');
                      const shiftCode = normalizeShiftCode(assignment.shift_code);
                      const startTime = new Date(assignment.shift_start).toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                      
                      return (
                        <div 
                          key={idx}
                          className="text-xs bg-muted/50 rounded px-1 py-0.5 truncate"
                          title={`${staffName} - ${SHIFT_LABEL[shiftCode] || shiftCode} (${startTime})`}
                        >
                          <div className="font-medium truncate">{staffName}</div>
                          <div className="text-muted-foreground">{shiftCode} {startTime}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}