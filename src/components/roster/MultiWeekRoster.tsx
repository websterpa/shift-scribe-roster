import React, { useState, useEffect } from 'react';
import { addWeeks, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RosterSearchFilters } from '@/components/roster/RosterSearchFilters';
import { WeekNavigationControls } from '@/components/roster/WeekNavigationControls';
import { RosterDisplayContainer } from '@/components/roster/RosterDisplayContainer';
import { ConfigItem, StaffMember } from '@/types/roster';

// Define internal week data structure
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

// Define a simplified staff type for the roster display
interface Staff {
  id: string;
  name: string;
  role: string;
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
  const [visibleWeeks, setVisibleWeeks] = useState(4);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [demoStaff, setDemoStaff] = useState<StaffMember[]>([]);
  
  function generateDemoStaff(count: number): StaffMember[] {
    const roles = ['Nurse', 'Senior Nurse', 'Nurse Manager', 'Assistant', 'Specialist'];
    const staff: StaffMember[] = [];
    
    for (let i = 0; i < count; i++) {
      const role = roles[Math.floor(Math.random() * roles.length)];
      const firstName = `Staff${i + 1}`;
      const lastName = `Demo`;
      
      staff.push({
        id: `demo-${i}`,
        employee_id: `EMP${String(i + 1).padStart(3, '0')}`,
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`,
        email: `staff${i + 1}@demo.com`,
        phone: `+44 7${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
        hire_date: '2023-01-01',
        is_active: true,
        role: role,
        eligible_shifts: ['D', 'E', 'N'],
        is_shift_worker: true,
        min_hours_per_week: Math.random() > 0.3 ? 35 : 15,
        max_hours_per_week: Math.random() > 0.3 ? 48 : 25,
        opted_out_wtd: false,
        days_off_per_week: 2,
        hourly_rate: 15,
        holiday_multiplier: 2,
        leave_allowance_days: 28
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
      
      // Calculate max weeks available from config
      const maxWeeksFromConfig = config.cycle_length_weeks || showWeeks;
      
      // Generate for all available weeks initially
      for (let week = 0; week < maxWeeksFromConfig; week++) {
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
              staffName: staffMember.name,
              role: staffMember.role || 'Staff',
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
    const nameMatch = staff.name.toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = filterRole === 'all' || staff.role === filterRole;
    return nameMatch && roleMatch;
  });
  
  // Convert StaffMember to the simplified Staff type for display
  const displayStaff: Staff[] = filteredStaff.map(staff => ({
    id: staff.id,
    name: staff.name,
    role: staff.role || 'Staff'
  }));

  const maxWeeks = config?.cycle_length_weeks || showWeeks;
  const canShowMoreWeeks = visibleWeeks < maxWeeks;
  const remainingWeeks = Math.max(0, maxWeeks - visibleWeeks);
  const weeksToAdd = Math.min(4, remainingWeeks);
  
  const canNavigatePrevious = currentWeekOffset > 0;
  const canNavigateNext = currentWeekOffset < Math.min(visibleWeeks, weeks.length) - 1;
  
  const handlePreviousWeek = () => {
    if (canNavigatePrevious) {
      setCurrentWeekOffset(prev => prev - 1);
    }
  };
  
  const handleNextWeek = () => {
    if (canNavigateNext) {
      setCurrentWeekOffset(prev => prev + 1);
    }
  };
  
  const handleShowMoreWeeks = () => {
    if (canShowMoreWeeks) {
      setVisibleWeeks(prev => Math.min(prev + weeksToAdd, maxWeeks));
    }
  };
  
  const handleShowAllWeeks = () => {
    setVisibleWeeks(maxWeeks);
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div>Roster Preview</div>
          <WeekNavigationControls
            currentWeekOffset={currentWeekOffset}
            maxWeeks={maxWeeks}
            visibleWeeks={visibleWeeks}
            weeksLength={weeks.length}
            generating={generating}
            canNavigatePrevious={canNavigatePrevious}
            canNavigateNext={canNavigateNext}
            canShowMoreWeeks={canShowMoreWeeks}
            remainingWeeks={remainingWeeks}
            weeksToAdd={weeksToAdd}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
            onShowMoreWeeks={handleShowMoreWeeks}
            onShowAllWeeks={handleShowAllWeeks}
          />
        </CardTitle>
        
        <RosterSearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterRole={filterRole}
          setFilterRole={setFilterRole}
          availableRoles={availableRoles}
        />
      </CardHeader>
      
      <CardContent>
        <RosterDisplayContainer
          loading={loading}
          weeks={weeks}
          currentWeekOffset={currentWeekOffset}
          displayStaff={displayStaff}
        />
        
        {weeks.length > 0 && currentWeekOffset < weeks.length && config && (
          <WeekNavigationControls
            currentWeekOffset={currentWeekOffset}
            maxWeeks={maxWeeks}
            visibleWeeks={visibleWeeks}
            weeksLength={weeks.length}
            generating={generating}
            canNavigatePrevious={canNavigatePrevious}
            canNavigateNext={canNavigateNext}
            canShowMoreWeeks={canShowMoreWeeks}
            remainingWeeks={remainingWeeks}
            weeksToAdd={weeksToAdd}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
            onShowMoreWeeks={handleShowMoreWeeks}
            onShowAllWeeks={handleShowAllWeeks}
          />
        )}
      </CardContent>
    </Card>
  );
}
