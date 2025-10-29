import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Plus, AlertCircle } from 'lucide-react';
import { OTAssignmentDialog } from './OTAssignmentDialog';
import { createOTCycleEntry, createCommonOTPatterns } from '@/services/roster/helpers';
import { OTOptions } from '@/utils/shiftWindowResolver';
import { toast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  staff_id: string;
  date: string;
  shift_code: string;
  hours: number;
  cost: number;
  staff_name?: string;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  hourly_rate?: number;
  eligible_shifts: string[];
}

interface RosterOTManagerProps {
  /** Current roster assignments */
  assignments: Assignment[];
  /** Available staff members */
  staffMembers: StaffMember[];
  /** Site configuration */
  config: {
    shift_type: '8h' | '12h';
    site_start_time: string;
    timezone: string;
    default_ot_hours?: number;
    default_ot_start_local_time?: string;
  };
  /** Selected date range for coverage analysis */
  dateRange: {
    start: string;
    end: string;
  };
  /** Callback when OT assignments are created */
  onOTAssignmentsCreated: (assignments: Array<{
    day: number;
    staffId: string;
    shiftCode: string;
    date: string;
    otOptions: OTOptions;
  }>) => Promise<void>;
}

export const RosterOTManager: React.FC<RosterOTManagerProps> = ({
  assignments,
  staffMembers,
  config,
  dateRange,
  onOTAssignmentsCreated
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze coverage gaps
  const analyzeCoverage = useCallback(() => {
    const gaps: Array<{ date: string; shortage: number; shiftType: string }> = [];
    
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayAssignments = assignments.filter(a => a.date === dateStr);
      
      // Simple coverage analysis (could be enhanced with actual requirements)
      const workingShifts = dayAssignments.filter(a => !['R', 'A/L', 'S', 'SP', 'CL'].includes(a.shift_code));
      
      if (workingShifts.length < 3) { // Assuming minimum 3 staff needed
        gaps.push({
          date: dateStr,
          shortage: 3 - workingShifts.length,
          shiftType: 'Coverage'
        });
      }
    }
    
    return gaps;
  }, [assignments, dateRange]);

  const coverageGaps = analyzeCoverage();

  const handleCreateOT = async (otAssignment: {
    staffId: string;
    date: string;
    otOptions: OTOptions;
  }) => {
    try {
      const startDate = new Date(dateRange.start);
      const assignmentDate = new Date(otAssignment.date);
      const dayOffset = Math.floor((assignmentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      const cycleEntry = createOTCycleEntry(
        dayOffset,
        otAssignment.staffId,
        otAssignment.otOptions,
        otAssignment.date
      );

      await onOTAssignmentsCreated([cycleEntry]);

    } catch (error) {
      console.error('Failed to create OT assignment:', error);
      throw error;
    }
  };

  const handleBulkOTCreation = async (pattern: 'morning' | 'afternoon' | 'evening') => {
    setIsAnalyzing(true);
    
    try {
      const patterns = createCommonOTPatterns();
      const otAssignments: Array<{
        day: number;
        staffId: string;
        shiftCode: string;
        date: string;
        otOptions: OTOptions;
      }> = [];

      const startDate = new Date(dateRange.start);

      // Create OT for coverage gaps using selected pattern
      for (const gap of coverageGaps.slice(0, 5)) { // Limit to first 5 gaps
        const availableStaff = staffMembers.filter(s => 
          s.eligible_shifts.includes('OT') || s.eligible_shifts.includes('E') || s.eligible_shifts.includes('D')
        );

        if (availableStaff.length > 0) {
          const assignmentDate = new Date(gap.date);
          const dayOffset = Math.floor((assignmentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          let cycleEntry;
          switch (pattern) {
            case 'morning':
              cycleEntry = patterns.morningTopUp(dayOffset, availableStaff[0].id);
              break;
            case 'afternoon':
              cycleEntry = patterns.afternoonCover(dayOffset, availableStaff[0].id);
              break;
            case 'evening':
              cycleEntry = patterns.eveningTopUp(dayOffset, availableStaff[0].id);
              break;
          }

          if (cycleEntry) {
            cycleEntry.date = gap.date;
            otAssignments.push(cycleEntry);
          }
        }
      }

      if (otAssignments.length > 0) {
        await onOTAssignmentsCreated(otAssignments);
        
        toast({
          title: "Bulk OT Created",
          description: `Created ${otAssignments.length} OT assignments for coverage gaps`,
        });
      } else {
        toast({
          title: "No OT Created",
          description: "No suitable staff or coverage gaps found",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Bulk OT creation failed:', error);
      toast({
        title: "Bulk OT Failed", 
        description: "Failed to create bulk OT assignments",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Coverage Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Coverage Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Date Range</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Coverage Gaps</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={coverageGaps.length > 0 ? "destructive" : "default"}>
                  {coverageGaps.length} gaps found
                </Badge>
                {coverageGaps.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Requires OT coverage
                  </span>
                )}
              </div>
            </div>
          </div>

          {coverageGaps.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Coverage Gaps Identified:</h4>
              <div className="flex flex-wrap gap-2">
                {coverageGaps.slice(0, 10).map(gap => (
                  <Badge key={gap.date} variant="outline" className="text-xs">
                    {new Date(gap.date).toLocaleDateString()}: {gap.shortage} staff needed
                  </Badge>
                ))}
                {coverageGaps.length > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{coverageGaps.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OT Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Overtime Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Individual OT Creation */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Individual OT Assignment</h4>
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                min={dateRange.start}
                max={dateRange.end}
              />
              
              <OTAssignmentDialog
                availableStaff={staffMembers.filter(s => 
                  s.eligible_shifts.includes('OT') || 
                  s.eligible_shifts.includes('E') || 
                  s.eligible_shifts.includes('D')
                )}
                selectedDate={selectedDate || new Date().toISOString().split('T')[0]}
                siteConfig={config}
                onCreateOT={handleCreateOT}
              >
                <Button disabled={!selectedDate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Custom OT
                </Button>
              </OTAssignmentDialog>
            </div>
          </div>

          {/* Bulk OT Patterns */}
          {coverageGaps.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Quick Coverage Solutions</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkOTCreation('morning')}
                  disabled={isAnalyzing}
                  className="gap-2"
                >
                  <Clock className="h-3 w-3" />
                  Morning Top-ups (4h @ 10:00)
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkOTCreation('afternoon')}
                  disabled={isAnalyzing}
                  className="gap-2"
                >
                  <Clock className="h-3 w-3" />
                  Afternoon Cover (6h @ 14:00)
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkOTCreation('evening')}
                  disabled={isAnalyzing}
                  className="gap-2"
                >
                  <Clock className="h-3 w-3" />
                  Evening Cover (3h @ 18:00)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically creates OT assignments for the first {Math.min(5, coverageGaps.length)} coverage gaps using available staff.
              </p>
            </div>
          )}

          {/* Configuration Display */}
          <div className="bg-muted/20 p-3 rounded-md">
            <h5 className="text-sm font-medium mb-2">Current OT Defaults</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Default Duration:</span>
                <span className="ml-2 font-medium">
                  {config.default_ot_hours || (config.shift_type === '12h' ? 12 : 8)}h
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Default Start Time:</span>
                <span className="ml-2 font-medium">
                  {config.default_ot_start_local_time || config.site_start_time}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RosterOTManager;