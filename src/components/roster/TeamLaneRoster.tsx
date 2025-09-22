import React from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = { versionId: string };
type Assignment = {
  day: string; 
  day_idx: number; 
  shift: string;
  staff_id: string; 
  staff_name: string; 
  team: string|null; 
  role: string|null;
};

export default function TeamLaneRoster({ versionId }: Props) {
  const [rows, setRows] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string|null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch roster assignments
        const { data: assignments, error: assignError } = await supabase
          .from("roster_assignments")
          .select(`
            date,
            shift_code,
            staff_id
          `)
          .eq("version_id", versionId);
        
        if (assignError) throw assignError;
        
        // Get staff details
        const staffIds = [...new Set(assignments?.map(a => a.staff_id) || [])];
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

        const mapped: Assignment[] = (assignments || []).map((r, index) => ({
          day: r.date,
          day_idx: index,
          shift: r.shift_code,
          staff_id: r.staff_id,
          staff_name: staffMap.get(r.staff_id)?.display_name || 'Unknown Staff',
          team: `Team ${Math.floor(Math.random() * 4) + 1}`, // Temporary team assignment
          role: staffMap.get(r.staff_id)?.role || 'Staff',
        }));
        
        if (active) setRows(mapped);
      } catch (e:any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active=false; };
  }, [versionId]);

  if (loading) return <div className="p-4">Loading roster…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  // Group by team then by day
  const grouped: Record<string, Assignment[]> = {};
  rows.forEach(r => {
    const key = r.team || "Unassigned";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  const allDays = [...new Set(rows.map(r => r.day))].sort();

  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow">
      <table className="min-w-[900px] text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="p-2">Team</th>
            {allDays.map(d => (
              <th key={d} className="p-2">{new Date(d).getDate()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([team, asgs]) => (
            <tr key={team} className="border-t align-top">
              <td className="p-2 font-semibold">{team}</td>
              {allDays.map(d => {
                const token = asgs.find(r => r.day===d)?.shift || "R";
                const color = token==="R" ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-700";
                return (
                  <td key={d} className="p-2">
                    <span className={`px-2 py-1 rounded ${color}`}>{token}</span>
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