
import React, { useState, useEffect } from 'react';
import { addWeeks, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RosterSearchFilters } from '@/components/roster/RosterSearchFilters';
import { WeekNavigationControls } from '@/components/roster/WeekNavigationControls';
import { RosterDisplayContainer } from '@/components/roster/RosterDisplayContainer';
import { ConfigItem, StaffMember } from '@/types/roster';
import { supabase } from '@/integrations/supabase/client';

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
  
  useEffect(() => {
    loadRosterData();
  }, [config, staffList, showWeeks]);

  const loadRosterData = async () => {
    console.log('🔄 MultiWeekRoster: Loading roster data...');
    setLoading(true);
    setGenerating(false);

    try {
      // Try to fetch the latest roster version first
      const { data: latestVersion, error: versionError } = await supabase
        .from('roster_versions')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (versionError || !latestVersion) {
        console.log('📋 MultiWeekRoster: No roster versions found, showing empty state');
        setWeeks([]);
        setLoading(false);
        return;
      }

      console.log('✅ MultiWeekRoster: Found latest roster version:', latestVersion.version_name);

      // Fetch assignments for this version with staff profiles
      const { data: assignments, error: assignmentsError } = await supabase
        .from('roster_assignments')
        .select(`
          *,
          staff_profiles!inner(
            first_name,
            last_name,
            role
          )
        `)
        .eq('version_id', latestVersion.id);

      if (assignmentsError) {
        console.error('❌ MultiWeekRoster: Error fetching assignments:', assignmentsError);
        setWeeks([]);
        setLoading(false);
        return;
      }

      if (!assignments || assignments.length === 0) {
        console.log('📋 MultiWeekRoster: No assignments found for this version');
        setWeeks([]);
        setLoading(false);
        return;
      }

      console.log('✅ MultiWeekRoster: Loaded assignments:', assignments.length);

      // Transform assignments into week data
      const weekMap = new Map<string, RosterAssignment[]>();
      const roles = new Set<string>();

      assignments.forEach((assignment: any) => {
        const assignmentDate = new Date(assignment.date);
        const weekStart = new Date(assignmentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        const staffName = `${assignment.staff_profiles.first_name} ${assignment.staff_profiles.last_name}`;
        const role = assignment.staff_profiles.role || 'Staff';
        roles.add(role);

        const rosterAssignment: RosterAssignment = {
          staffId: assignment.staff_id,
          staffName,
          role,
          date: assignmentDate,
          shiftCode: assignment.shift_code,
          shiftHours: assignment.hours || 8,
          shiftStart: assignment.shift_start ? new Date(assignment.shift_start).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }) : undefined,
          shiftEnd: assignment.shift_end ? new Date(assignment.shift_end).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }) : undefined,
        };

        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, []);
        }
        weekMap.get(weekKey)!.push(rosterAssignment);
      });

      // Convert to weeks array and sort by date
      const weeksArray: MultiWeekData[] = Array.from(weekMap.entries())
        .map(([weekKey, assignments]) => ({
          weekStart: new Date(weekKey),
          assignments
        }))
        .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

      console.log('✅ MultiWeekRoster: Processed weeks:', weeksArray.length);
      setWeeks(weeksArray);
      setAvailableRoles(['all', ...Array.from(roles)]);

    } catch (error) {
      console.error('❌ MultiWeekRoster: Error loading roster data:', error);
      setWeeks([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter staff based on search and role
  const getAllStaff = (): Staff[] => {
    const staffFromAssignments = new Map<string, Staff>();
    
    weeks.forEach(week => {
      week.assignments.forEach(assignment => {
        if (!staffFromAssignments.has(assignment.staffId)) {
          staffFromAssignments.set(assignment.staffId, {
            id: assignment.staffId,
            name: assignment.staffName,
            role: assignment.role
          });
        }
      });
    });
    
    return Array.from(staffFromAssignments.values());
  };

  const filteredStaff = getAllStaff().filter(staff => {
    const nameMatch = staff.name.toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = filterRole === 'all' || staff.role === filterRole;
    return nameMatch && roleMatch;
  });

  const maxWeeks = weeks.length || showWeeks;
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
          <div>Current Roster</div>
          {weeks.length > 0 && (
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
        </CardTitle>
        
        {weeks.length > 0 && (
          <RosterSearchFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterRole={filterRole}
            setFilterRole={setFilterRole}
            availableRoles={availableRoles}
          />
        )}
      </CardHeader>
      
      <CardContent>
        <RosterDisplayContainer
          loading={loading}
          weeks={weeks}
          currentWeekOffset={currentWeekOffset}
          displayStaff={filteredStaff}
        />
        
        {weeks.length > 0 && currentWeekOffset < weeks.length && (
          <div className="mt-4">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
