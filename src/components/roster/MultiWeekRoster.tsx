import React, { useState, useEffect } from 'react';
import { addWeeks, format, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RosterCalendar } from '@/components/roster/RosterCalendar';
import { Input } from '@/components/ui/input';
import { ConfigItem, StaffMember } from '@/types/roster';

// Keep MultiWeekData separate from any imported WeekData
interface MultiWeekData {
  weekStart: Date;
  assignments: RosterAssignment[];
}

interface RosterAssignment {
  staffId: string;
  staffName: string;
  role: string;
  date: Date;
  shiftCode: string;
  shiftHours: number;
  shiftStart?: string;
  shiftEnd?: string;
}

interface Props {
  staffList?: StaffMember[];
  config: ConfigItem | null;
  showWeeks?: number;
}

export function MultiWeekRoster({ staffList = [], config, showWeeks = 4 }: Props) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weeks, setWeeks] = useState<MultiWeekData[]>([]);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [demoStaff, setDemoStaff] = useState<StaffMember[]>([]);
  
  function generateDemoStaff(count: number): StaffMember[] {
    const roles = ['Nurse', 'Senior Nurse', 'Nurse Manager', 'Assistant', 'Specialist'];
    const staff: StaffMember[] = [];
    
    for (let i = 0; i < count; i++) {
      const role = roles[Math.floor(Math.random() * roles.length)];
      staff.push({
        id: `demo-${i}`,
        first_name: `Staff`,
        last_name: `${i + 1}`,
        name: `Staff ${i + 1}`,
        role: role,
        contract_hours: Math.random() > 0.3 ? 40 : 20, // Full time or part time
        max_consecutive_shifts: 5,
        min_hours_per_week: Math.random() > 0.3 ? 35 : 15,
        max_hours_per_week: Math.random() > 0.3 ? 48 : 25,
        preferences: {
          preferred_shifts: ['D', 'E'],
          avoid_shifts: ['N'],
          preferred_days: [1, 2, 3, 4, 5], // Mon-Fri
          avoid_days: [0, 6], // Sat, Sun
        }
      });
    }
    
    return staff;
  }
  
  useEffect(() => {
    if (!config) {
      console.log('No config provided, cannot generate preview');
      setLoading(false);
      return;
    }
    
    setGenerating(true);
    console.log('Generating preview with config:', config);
    
    // Use the staffList if provided, otherwise generate demo staff
    const staff = staffList.length > 0 
      ? staffList 
      : generateDemoStaff(config.shift_type === '12h' ? 10 : 15);
    
    setDemoStaff(staff);
    
    // Collect unique roles for filtering
    const roles = Array.from(new Set(staff.map(s => s.role || 'Unknown')));
    setAvailableRoles(['all', ...roles]);
    
    try {
      // Start from config start date
      const startDate = new Date(config.start_date);
      
      // For each week, create dummy roster data
      const weekMap = new Map<string, RosterAssignment[]>();
      
      // Generate for the specified number of weeks
      for (let week = 0; week < showWeeks; week++) {
        const weekStartDate = addWeeks(startDate, week);
        const weekKey = format(weekStartDate, 'yyyy-MM-dd');
        
        // Create assignments for this week
        staff.forEach(staffMember => {
          // Add 5 working days for each staff in this week
          for (let day = 0; day < 7; day++) {
            // Skip some days randomly to simulate days off
            if (Math.random() > 0.7) continue;
            
            const date = new Date(weekStartDate);
            date.setDate(date.getDate() + day);
            
            // Create shift based on config
            const shiftHours = config.shift_type === '12h' ? 12 : 8;
            const shiftOptions = ['D', 'E', 'N']; // Day, Evening, Night
            const shift = shiftOptions[Math.floor(Math.random() * shiftOptions.length)];
            
            const assignment: RosterAssignment = {
              staffId: staffMember.id,
              staffName: staffMember.name || `${staffMember.first_name} ${staffMember.last_name}`,
              role: staffMember.role || 'Nurse',
              date: date,
              shiftCode: shift,
              shiftHours: shiftHours,
              // Add shift times based on shift code
              shiftStart: shift === 'D' ? '07:00' : shift === 'E' ? '15:00' : '23:00',
              shiftEnd: shift === 'D' ? '15:00' : shift === 'E' ? '23:00' : '07:00',
            };
            
            // Get or create the week's assignment array
            if (!weekMap.has(weekKey)) {
              weekMap.set(weekKey, []);
            }
            weekMap.get(weekKey)!.push(assignment);
          }
        });
      }
      
      const weeksArray: MultiWeekData[] = Array.from(weekMap.entries())
        .map(([weekKey, assignments]) => ({
          weekStart: new Date(weekKey),
          assignments
        }))
        .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
      
      console.log(`Generated ${weeksArray.length} weeks of preview data`);
      setWeeks(weeksArray);
      
    } catch (error) {
      console.error('Error generating preview data:', error);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, [config, staffList, showWeeks]);
  
  // Filter staff based on search and role
  const filteredStaff = demoStaff.filter(staff => {
    const nameMatch = (staff.name || `${staff.first_name} ${staff.last_name}`).toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = filterRole === 'all' || staff.role === filterRole;
    return nameMatch && roleMatch;
  });
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div>Roster Preview</div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentWeekOffset(prev => Math.max(0, prev - 1))}
              disabled={currentWeekOffset === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-normal">
              Week {currentWeekOffset + 1} of {showWeeks}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentWeekOffset(prev => Math.min(showWeeks - 1, prev + 1))}
              disabled={currentWeekOffset === showWeeks - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        
        <div className="flex items-center space-x-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1.5 h-7 w-7 p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="relative">
            <Filter className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <select 
              className="h-10 rounded-md border border-input bg-background pl-8 pr-8 text-sm"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              {availableRoles.map(role => (
                <option key={role} value={role}>
                  {role === 'all' ? 'All roles' : role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mb-2 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary mx-auto"></div>
              <p className="text-sm text-gray-500">Loading roster preview...</p>
            </div>
          </div>
        ) : weeks.length > 0 && currentWeekOffset < weeks.length ? (
          <RosterCalendar 
            week={weeks[currentWeekOffset]} 
            staff={filteredStaff.map(s => ({
              id: s.id,
              name: s.name || `${s.first_name} ${s.last_name}`,
              role: s.role || 'Staff'
            }))}
          />
        ) : (
          <div className="flex h-64 items-center justify-center">
            <p className="text-gray-500">No roster data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
