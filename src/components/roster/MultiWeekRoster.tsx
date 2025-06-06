import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateAndSaveRoster } from '@/utils/roster/rosterGeneration';
import { Loader, Search, SortAsc, SortDesc, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { StaffMember } from '@/types/roster';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('MultiWeekRoster');

interface RosterAssignment {
  id: string;
  date: string;
  staff_id: string;
  shift_code: string;
  hours: number;
  cost: number;
  staff_profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

interface WeekData {
  weekStart: Date;
  assignments: RosterAssignment[];
}

interface Props {
  staffList?: StaffMember[];
  config?: {
    id?: string;
    cycle_length_weeks: number;
    shift_type: "8h" | "12h";
    operational_hours_per_day: number;
    handshake_minutes: number;
    start_date: string;
  };
  showWeeks?: number;
}

export function MultiWeekRoster({ staffList = [], config, showWeeks = 4 }: Props) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'cost'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [versionId, setVersionId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>({});
  const [totalHours, setTotalHours] = useState<Record<string, number>>({});
  const [totalCost, setTotalCost] = useState<Record<string, number>>({});
  const [columns, setColumns] = useState<Date[]>([]);

  useEffect(() => {
    fetchRosterData();
  }, [currentWeekOffset, showWeeks]);

  const fetchRosterData = async () => {
    try {
      logger.info('Fetching roster data', { 
        currentWeekOffset, 
        showWeeks 
      });
      
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (currentWeekOffset * 7));
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (showWeeks * 7));

      const { data, error } = await supabase
        .from('roster_assignments')
        .select(`
          *,
          staff_profiles!inner(first_name, last_name, employee_id)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      if (error) {
        logger.error(new Error('Error fetching roster data'), { originalError: error });
        toast({ 
          title: "Error loading roster data", 
          description: error.message, 
          variant: "destructive" 
        });
        return;
      }

      // Group assignments by week
      const weekMap = new Map<string, RosterAssignment[]>();
      
      data?.forEach((assignment: any) => {
        const assignmentDate = new Date(assignment.date);
        const weekStart = new Date(assignmentDate);
        weekStart.setDate(assignmentDate.getDate() - assignmentDate.getDay() + 1);
        
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, []);
        }
        
        weekMap.get(weekKey)?.push({
          id: assignment.id,
          date: assignment.date,
          staff_id: assignment.staff_id,
          shift_code: assignment.shift_code,
          hours: assignment.hours || 0,
          cost: assignment.cost || 0,
          staff_profiles: assignment.staff_profiles
        });
      });

      const weeksArray: WeekData[] = Array.from(weekMap.entries())
        .map(([weekKey, assignments]) => ({
          weekStart: new Date(weekKey),
          assignments
        }))
        .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

      setWeeks(weeksArray);

      // Process assignments for table view if staffList is provided
      if (staffList.length > 0) {
        processAssignmentsForTable(data, startDate);
      }
    } catch (error) {
      logger.error(new Error('Error in fetchRosterData'), { originalError: error });
      toast({ 
        title: "Failed to load roster data", 
        description: "Please try again later", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const processAssignmentsForTable = (data: any[], startDate: Date) => {
    const assignMap: any = {};
    const hoursMap: any = {};
    const costMap: any = {};
    
    data?.forEach((r: any) => {
      const dateKey = new Date(r.date).toDateString();
      assignMap[dateKey] = assignMap[dateKey] || {};
      assignMap[dateKey][r.staff_id] = r.shift_code;
      hoursMap[r.staff_id] = (hoursMap[r.staff_id] || 0) + (r.hours || 0);
      costMap[r.staff_id] = (costMap[r.staff_id] || 0) + (r.cost || 0);
    });
    
    setAssignments(assignMap);
    setTotalHours(hoursMap);
    setTotalCost(costMap);

    const cols: Date[] = [];
    for (let w = 0; w < showWeeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + w * 7 + d);
        cols.push(date);
      }
    }
    setColumns(cols);
  };

  const generateNewRoster = async () => {
    if (!config || !staffList.length) {
      logger.warn('Cannot generate roster - missing config or staff');
      toast({ 
        title: "Cannot generate roster", 
        description: "Staff list and config are required", 
        variant: "destructive" 
      });
      return;
    }

    try {
      logger.info('Generating new roster', { configId: config.id });
      setGenerating(true);
      const vid = await generateAndSaveRoster(staffList, { ...config, id: config.id! });
      setVersionId(vid);
      logger.info('New roster generated successfully', { versionId: vid });
      toast({ title: "New roster generated successfully" });
      await fetchRosterData();
    } catch (error) {
      logger.error(new Error('Error generating roster'), { originalError: error });
      toast({ 
        title: "Failed to generate roster", 
        description: "Please try again later", 
        variant: "destructive" 
      });
    } finally {
      setGenerating(false);
    }
  };

  const getFilteredAndSortedStaff = () => {
    if (!staffList.length) return [];
    
    let filtered = staffList.filter(staff => {
      const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || staff.role === filterRole;
      return matchesSearch && matchesRole;
    });

    return filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'hours':
          aValue = totalHours[a.id] || 0;
          bValue = totalHours[b.id] || 0;
          break;
        case 'cost':
          aValue = totalCost[a.id] || 0;
          bValue = totalCost[b.id] || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const formatWeekRange = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
  };

  const getShiftCodeStyle = (code: string) => {
    const baseStyle = "text-sm font-medium px-2 py-1 rounded";
    switch (code) {
      case 'D': return `${baseStyle} bg-yellow-100 text-yellow-800`;
      case 'E': return `${baseStyle} bg-blue-100 text-blue-800`;
      case 'L': return `${baseStyle} bg-green-100 text-green-800`;
      case 'N': return `${baseStyle} bg-purple-100 text-purple-800`;
      case 'R': return `${baseStyle} bg-gray-100 text-gray-600`;
      case 'S': return `${baseStyle} bg-red-100 text-red-800`;
      default: return `${baseStyle} bg-gray-100 text-gray-600`;
    }
  };

  const uniqueRoles = [...new Set(staffList.map(s => s.role))];
  const filteredStaff = getFilteredAndSortedStaff();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader className="h-8 w-8 animate-spin mr-2" />
          <span>Loading roster data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Multi-Week Roster View
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCurrentWeekOffset(currentWeekOffset - showWeeks)}
            >
              Previous {showWeeks} Weeks
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCurrentWeekOffset(currentWeekOffset + showWeeks)}
            >
              Next {showWeeks} Weeks
            </Button>
            {config && staffList.length > 0 && (
              <Button 
                onClick={generateNewRoster}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  'Generate New Roster'
                )}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Table View for staff list with config */}
        {staffList.length > 0 && config && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <Input
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
                <Select value={sortBy} onValueChange={(value: 'name' | 'hours' | 'cost') => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="cost">Cost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 bg-gray-50 border px-3 py-2 text-left font-medium">Name</th>
                    {columns.map((date, idx) => (
                      <th key={idx} className="border px-2 py-2 text-center text-xs font-medium min-w-16">
                        <div className="font-semibold">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-gray-600">{date.getDate()}</div>
                      </th>
                    ))}
                    <th className="border px-3 py-2 text-center font-medium">Total Hrs</th>
                    <th className="border px-3 py-2 text-center font-medium">Total £</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 bg-white border px-3 py-2 font-medium">
                        <div>{staff.name}</div>
                        <div className="text-xs text-gray-500">{staff.role}</div>
                      </td>
                      {columns.map((date) => {
                        const code = assignments[date.toDateString()]?.[staff.id] || "R";
                        return (
                          <td key={date.toDateString()} className="border px-1 py-2 text-center">
                            <span className={getShiftCodeStyle(code)}>
                              {code}
                            </span>
                          </td>
                        );
                      })}
                      <td className="border px-3 py-2 text-center font-medium">
                        {totalHours[staff.id] || 0}
                      </td>
                      <td className="border px-3 py-2 text-center font-medium">
                        £{(totalCost[staff.id] || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Card View for general roster data */}
        <div className="space-y-6">
          {weeks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No roster data found for this period</p>
              {config && staffList.length > 0 && (
                <Button onClick={generateNewRoster} className="mt-4">
                  Generate Initial Roster
                </Button>
              )}
            </div>
          ) : (
            weeks.map((week, index) => (
              <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="font-semibold mb-3 text-lg">
                  Week {index + 1}: {formatWeekRange(week.weekStart)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {week.assignments.length === 0 ? (
                    <p className="text-gray-400 col-span-full text-center py-4">No assignments this week</p>
                  ) : (
                    week.assignments.map((assignment) => (
                      <div key={assignment.id} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="font-medium text-sm mb-1">
                          {assignment.staff_profiles.first_name} {assignment.staff_profiles.last_name}
                        </div>
                        <div className="text-xs text-gray-600 mb-1">
                          {new Date(assignment.date).toLocaleDateString()} 
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={getShiftCodeStyle(assignment.shift_code)}>
                            {assignment.shift_code}
                          </span>
                          <div className="text-xs text-gray-500">
                            {assignment.hours}h - £{assignment.cost.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
