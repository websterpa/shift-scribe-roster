import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TeamLaneRosterProps {
  versionId: string;
}

interface Assignment {
  day: string;
  shift_code: string;
  staff_id: string;
  staff_name: string;
  team: string | null;
  role: string | null;
  shift_start?: string;
  shift_end?: string;
}

interface TeamLane {
  team: string;
  staff: StaffMember[];
}

interface StaffMember {
  id: string;
  name: string;
  role: string | null;
  assignments: Record<string, string>; // date -> shift_code
  nightCount: number;
  weekendCount: number;
  holidayCount: number;
}

export function TeamLaneRoster({ versionId }: TeamLaneRosterProps) {
  const [teams, setTeams] = useState<TeamLane[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    async function fetchRosterData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch roster assignments with staff details
        const { data: assignments, error: assignError } = await supabase
          .from('roster_assignments')
          .select(`
            date,
            shift_code,
            staff_id,
            shift_start,
            shift_end
          `)
          .eq('version_id', versionId)
          .order('date');

        if (assignError) throw assignError;

        // Fetch staff profiles
        const staffIds = [...new Set(assignments?.map(a => a.staff_id) || [])];
        const { data: staffData, error: staffError } = await supabase
          .from('staff_profiles')
          .select('id, name, first_name, last_name, role')
          .in('id', staffIds);

        if (staffError) {
          console.warn('Failed to load staff details:', staffError.message);
        }

        const staffMap = new Map(
          (staffData || []).map(s => [
            s.id, {
              ...s,
              name: s.name || (s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : 'Unknown Staff')
            }
          ])
        );

        // Process assignments into team lanes
        const processedAssignments: Assignment[] = (assignments || []).map(a => ({
          day: a.date,
          shift_code: a.shift_code,
          staff_id: a.staff_id,
          staff_name: staffMap.get(a.staff_id)?.name || 'Unknown Staff',
          team: `Team ${Math.floor(Math.random() * 4) + 1}`, // Temporary team assignment
          role: staffMap.get(a.staff_id)?.role || 'Staff',
          shift_start: a.shift_start,
          shift_end: a.shift_end
        }));

        // Get unique dates and sort them
        const uniqueDates = [...new Set(processedAssignments.map(a => a.day))].sort();
        setDates(uniqueDates);

        // Group by team
        const teamGroups = processedAssignments.reduce((acc, assignment) => {
          const team = assignment.team || 'Unassigned';
          if (!acc[team]) acc[team] = [];
          acc[team].push(assignment);
          return acc;
        }, {} as Record<string, Assignment[]>);

        // Build team lanes
        const teamLanes: TeamLane[] = Object.entries(teamGroups).map(([teamName, teamAssignments]) => {
          const staffGroups = teamAssignments.reduce((acc, assignment) => {
            if (!acc[assignment.staff_id]) {
              acc[assignment.staff_id] = {
                id: assignment.staff_id,
                name: assignment.staff_name,
                role: assignment.role,
                assignments: {},
                nightCount: 0,
                weekendCount: 0,
                holidayCount: 0
              };
            }
            acc[assignment.staff_id].assignments[assignment.day] = assignment.shift_code;
            
            // Count metrics
            if (assignment.shift_code === 'N') acc[assignment.staff_id].nightCount++;
            const dayOfWeek = new Date(assignment.day).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) acc[assignment.staff_id].weekendCount++;
            
            return acc;
          }, {} as Record<string, StaffMember>);

          return {
            team: teamName,
            staff: Object.values(staffGroups)
          };
        });

        setTeams(teamLanes);
      } catch (err: any) {
        console.error('Team lane roster error:', err);
        setError(err.message || 'Failed to load roster data');
      } finally {
        setLoading(false);
      }
    }

    if (versionId) {
      fetchRosterData();
    }
  }, [versionId]);

  const getRestRiskColor = (currentShift: string, nextShift: string) => {
    if (!currentShift || !nextShift || currentShift === 'R' || nextShift === 'R') {
      return 'bg-green-100'; // Good rest
    }
    
    // Simple heuristic: D->N or N->D is high risk
    if ((currentShift === 'D' && nextShift === 'N') || (currentShift === 'N' && nextShift === 'D')) {
      return 'bg-red-100'; // High risk
    }
    
    return 'bg-yellow-100'; // Medium risk
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600 bg-red-50 border border-red-200 rounded p-3">
          Team roster error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Team Lane Roster</h3>
      
      {/* Diagnostics */}
      <div className="mb-4 text-xs bg-slate-50 border rounded p-2">
        <strong>Roster Diagnostics:</strong> {teams.length} teams • {dates.length} days • 
        {teams.reduce((sum, team) => sum + team.staff.length, 0)} staff members
      </div>

      <div className="space-y-6">
        {teams.map((team) => (
          <div key={team.team} className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">{team.team}</h4>
            
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Header row with dates */}
                <div className="flex mb-2">
                  <div className="w-32 flex-shrink-0 text-sm font-medium text-gray-600">Staff</div>
                  {dates.map((date) => (
                    <div key={date} className="w-12 flex-shrink-0 text-xs text-center text-gray-600">
                      {new Date(date).getDate()}
                    </div>
                  ))}
                  <div className="w-24 flex-shrink-0 text-xs text-gray-600 ml-4">Metrics</div>
                </div>

                {/* Staff lanes */}
                {team.staff.map((staff) => (
                  <div key={staff.id} className="flex items-center mb-2">
                    <div className="w-32 flex-shrink-0 text-sm truncate" title={staff.name}>
                      {staff.name}
                      <div className="text-xs text-gray-500">{staff.role}</div>
                    </div>
                    
                    {/* Shift tokens */}
                    {dates.map((date, index) => {
                      const currentShift = staff.assignments[date] || 'R';
                      const nextShift = index < dates.length - 1 ? staff.assignments[dates[index + 1]] || 'R' : '';
                      
                      return (
                        <div key={date} className="w-12 flex-shrink-0 flex flex-col items-center">
                          <div className={`w-8 h-8 flex items-center justify-center text-xs font-mono border rounded ${
                            currentShift === 'R' ? 'bg-gray-100 text-gray-600' :
                            currentShift === 'N' ? 'bg-blue-100 text-blue-800' :
                            currentShift === 'D' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {currentShift}
                          </div>
                          
                          {/* Rest risk indicator between days */}
                          {index < dates.length - 1 && (
                            <div className={`w-1 h-2 mt-1 rounded-full ${getRestRiskColor(currentShift, nextShift)}`}
                                 title={`Rest risk between ${currentShift} and ${nextShift}`} />
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Fairness counters */}
                    <div className="w-24 flex-shrink-0 ml-4 text-xs text-gray-600">
                      <div>N: {staff.nightCount}</div>
                      <div>WE: {staff.weekendCount}</div>
                      <div>PH: {staff.holidayCount}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
        <strong>Legend:</strong> D=Day • N=Night • E=Early • L=Late • R=Rest • 
        🟢=Good rest • 🟡=Medium risk • 🔴=High risk
      </div>
    </div>
  );
}