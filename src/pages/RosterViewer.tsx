import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Calendar, Users, Clock, Printer, Download, BarChart, AlertTriangle, Save, FileDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RosterViewerHeader } from '@/components/roster/RosterViewerHeader';
import { RosterCalendarTable } from '@/components/roster/RosterCalendarTable';
import { RosterPrintView } from '@/components/roster/RosterPrintView';
import { RosterDiagnosticsPanel } from '@/components/roster/RosterDiagnosticsPanel';
import { checkRestPeriods, checkWeeklyAverage } from '@/engine/validators/wtd';
import { summariseDiagnostics } from '@/engine/diagnostics';
import type { RosterDiagnostics, RosterAssignment as EngineRosterAssignment } from '@/engine/generateRoster';
import { exportRosterCSV, exportRosterExcel, exportRosterPDF } from '@/engine/exports';
import { useTenant } from '@/features/tenant/useTenant';

interface RosterAssignment {
  id: string;
  date: string;
  shift_code: string;
  shift_start: string | null;
  shift_end: string | null;
  hours: number | null;
  cost: number | null;
  staff_profiles: {
    first_name: string;
    last_name: string;
    role: string | null;
  } | null;
}

interface RosterData {
  id: string;
  version_name: string;
  version_number: number;
  generated_at: string;
  config: {
    config_name: string;
    shift_type: string;
    cycle_length_weeks: number;
    start_date: string;
    staffing_requirements?: {
      day_shift_staff?: number;
      night_shift_staff?: number;
      early_shift_staff?: number;
      late_shift_staff?: number;
    };
  } | null;
  assignments: RosterAssignment[];
  diagnostics?: RosterDiagnostics;
}

const RosterViewer = () => {
  console.log('🔄 RosterViewer component rendered');
  
  const { rosterId } = useParams<{ rosterId: string }>();
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Compute diagnostics from roster data
  const diagnostics = useMemo<RosterDiagnostics | null>(() => {
    if (!rosterData?.assignments || rosterData.assignments.length === 0) {
      return null;
    }

    try {
      // Group assignments by staff
      const staffGroups = new Map<string, RosterAssignment[]>();
      rosterData.assignments.forEach(a => {
        const staffKey = a.staff_profiles?.first_name + ' ' + a.staff_profiles?.last_name || 'Unknown';
        if (!staffGroups.has(staffKey)) {
          staffGroups.set(staffKey, []);
        }
        staffGroups.get(staffKey)!.push(a);
      });

      // Run WTD validation per staff member
      const restViolations: Record<string, Array<{ day: string; gap: number; message: string }>> = {};
      const weeklyAverageCompliant: Record<string, boolean> = {};
      const avgHoursPerWeek: Record<string, number> = {};
      const staffSummary: Array<{
        staffId: string;
        staffName: string;
        totalShifts: number;
        patternCompliance: number;
        expectedShifts: number;
        matchingShifts: number;
      }> = [];

      staffGroups.forEach((assignments, staffId) => {
        // Convert to ShiftRecord format for WTD validation
        const shiftRecords = assignments
          .filter(a => a.shift_code !== 'R') // Skip rest days
          .map(a => {
            const date = new Date(a.date);
            let start: Date, end: Date;

            if (a.shift_start && a.shift_end) {
              start = new Date(a.shift_start);
              end = new Date(a.shift_end);
            } else {
              // Default times based on shift code
              const times: Record<string, { start: string; end: string }> = {
                'E': { start: '06:00', end: '14:00' },
                'L': { start: '14:00', end: '22:00' },
                'N': { start: '22:00', end: '06:00' },
                'D': { start: '08:00', end: '20:00' },
              };
              const shiftTimes = times[a.shift_code] || { start: '08:00', end: '16:00' };
              start = new Date(`${a.date}T${shiftTimes.start}:00`);
              end = new Date(`${a.date}T${shiftTimes.end}:00`);
              
              // Handle overnight shifts
              if (end <= start) {
                end.setDate(end.getDate() + 1);
              }
            }

            return { staffId, start, end };
          });

        // Check rest periods
        restViolations[staffId] = checkRestPeriods(shiftRecords);
        
        // Check weekly average
        weeklyAverageCompliant[staffId] = checkWeeklyAverage(shiftRecords);

        // Calculate average hours per week
        const totalHours = shiftRecords.reduce((sum, r) => {
          const hours = (r.end.getTime() - r.start.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);
        const weeks = Math.max(1, rosterData.config?.cycle_length_weeks || 1);
        avgHoursPerWeek[staffId] = totalHours / weeks;

        // Build staff summary (without pattern compliance since patterns not in DB)
        staffSummary.push({
          staffId,
          staffName: staffId,
          totalShifts: assignments.length,
          patternCompliance: 100, // Placeholder since patterns not tracked
          expectedShifts: assignments.length,
          matchingShifts: assignments.length
        });
      });

      return {
        restViolations,
        weeklyAverageCompliant,
        avgHoursPerWeek,
        staffSummary,
        overallCompliance: {
          avgCompliance: 100, // Placeholder
          totalShifts: staffSummary.reduce((sum, s) => sum + s.totalShifts, 0),
          fullyCompliant: staffSummary.length
        }
      };
    } catch (error) {
      console.error('❌ Error computing diagnostics:', error);
      return null;
    }
  }, [rosterData]);

  useEffect(() => {
    if (rosterId) {
      loadRosterData(rosterId);
    }
  }, [rosterId]);

  const loadRosterData = async (id: string) => {
    try {
      console.log('📊 Loading roster data for ID:', id);
      setLoading(true);

      // Fetch roster version with config and assignments
      const { data: rosterVersion, error: rosterError } = await supabase
        .from('roster_versions')
        .select(`
          id,
          version_name,
          version_number,
          generated_at,
          config:roster_config(
            config_name,
            shift_type,
            cycle_length_weeks,
            start_date,
            staffing_requirements
          )
        `)
        .eq('id', id)
        .single();

      if (rosterError) {
        console.error('❌ Error loading roster version:', rosterError);
        toast({
          title: "Error loading roster",
          description: rosterError.message,
          variant: "destructive",
        });
        return;
      }

      // Fetch assignments for this roster
      const { data: assignments, error: assignmentsError } = await supabase
        .from('roster_assignments')
        .select(`
          id,
          date,
          shift_code,
          shift_start,
          shift_end,
          hours,
          cost,
          staff_profiles:staff_id(
            first_name,
            last_name,
            role
          )
        `)
        .eq('version_id', id)
        .order('date', { ascending: true });

      if (assignmentsError) {
        console.error('❌ Error loading assignments:', assignmentsError);
        toast({
          title: "Error loading assignments",
          description: assignmentsError.message,
          variant: "destructive",
        });
        return;
      }

      // Parse staffing_requirements safely
      const parseStaffingRequirements = (requirements: any) => {
        if (!requirements) return undefined;
        if (typeof requirements === 'string') {
          try {
            return JSON.parse(requirements);
          } catch {
            return undefined;
          }
        }
        return requirements;
      };

      const rosterData: RosterData = {
        ...rosterVersion,
        config: rosterVersion.config ? {
          ...rosterVersion.config,
          staffing_requirements: parseStaffingRequirements(rosterVersion.config.staffing_requirements)
        } : null,
        assignments: assignments || []
      };

      console.log('✅ Loaded roster data:', {
        name: rosterData.version_name,
        assignments: rosterData.assignments.length,
        config: rosterData.config,
        assignmentDetails: rosterData.assignments.slice(0, 3) // Log first 3 assignments for debugging
      });

      setRosterData(rosterData);
    } catch (error: any) {
      console.error('❌ Exception loading roster:', error);
      toast({
        title: "Error loading roster",
        description: "Failed to load roster data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // For now, show a toast - in a real implementation, you'd generate a PDF
    toast({
      title: "Download started",
      description: "Your roster PDF is being prepared for download",
    });
    
    // Use browser's print dialog as PDF generation
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleExportCSV = () => {
    if (!rosterData) return;
    
    console.log('📥 Exporting roster to CSV');
    
    // Convert database assignments to engine format
    const engineAssignments: EngineRosterAssignment[] = rosterData.assignments.map(a => ({
      staffId: a.staff_profiles ? `${a.staff_profiles.first_name} ${a.staff_profiles.last_name}` : 'Unknown',
      staffName: a.staff_profiles ? `${a.staff_profiles.first_name} ${a.staff_profiles.last_name}` : 'Unknown',
      dayIndex: 0, // Not needed for export
      date: new Date(a.date),
      shift: a.shift_code,
      patternId: '', // Not needed for export
      shiftStart: a.shift_start ? new Date(a.shift_start) : undefined,
      shiftEnd: a.shift_end ? new Date(a.shift_end) : undefined,
      hours: a.hours || undefined,
      cost: a.cost || undefined,
    }));
    
    try {
      exportRosterCSV(engineAssignments, `${rosterData.version_name}-roster.csv`);
      toast({
        title: "CSV Export Complete",
        description: `Exported ${engineAssignments.length} assignments to CSV`,
      });
    } catch (error) {
      console.error('❌ CSV export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export roster to CSV",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    if (!rosterData) return;
    
    console.log('📊 Exporting roster to Excel');
    
    const engineAssignments: EngineRosterAssignment[] = rosterData.assignments.map(a => ({
      staffId: a.staff_profiles ? `${a.staff_profiles.first_name} ${a.staff_profiles.last_name}` : 'Unknown',
      staffName: a.staff_profiles ? `${a.staff_profiles.first_name} ${a.staff_profiles.last_name}` : 'Unknown',
      dayIndex: 0,
      date: new Date(a.date),
      shift: a.shift_code,
      patternId: '',
      shiftStart: a.shift_start ? new Date(a.shift_start) : undefined,
      shiftEnd: a.shift_end ? new Date(a.shift_end) : undefined,
      hours: a.hours || undefined,
      cost: a.cost || undefined,
    }));
    
    try {
      exportRosterExcel(engineAssignments, `${rosterData.version_name}-roster.xlsx`);
      toast({
        title: "Excel Export Complete",
        description: `Exported ${engineAssignments.length} assignments to Excel`,
      });
    } catch (error) {
      console.error('❌ Excel export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export roster to Excel",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    if (!rosterData) return;
    
    console.log('📄 Exporting roster to PDF');
    
    const engineAssignments: EngineRosterAssignment[] = rosterData.assignments.map(a => ({
      staffId: a.staff_profiles ? `${a.staff_profiles.first_name} ${a.staff_profiles.last_name}` : 'Unknown',
      staffName: a.staff_profiles ? `${a.staff_profiles.first_name} ${a.staff_profiles.last_name}` : 'Unknown',
      dayIndex: 0,
      date: new Date(a.date),
      shift: a.shift_code,
      patternId: '',
      shiftStart: a.shift_start ? new Date(a.shift_start) : undefined,
      shiftEnd: a.shift_end ? new Date(a.shift_end) : undefined,
      hours: a.hours || undefined,
      cost: a.cost || undefined,
    }));
    
    try {
      exportRosterPDF(engineAssignments, `${rosterData.version_name}-roster.pdf`);
      toast({
        title: "PDF Preview Opened",
        description: "Use your browser's print dialog to save as PDF",
      });
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export roster to PDF",
        variant: "destructive",
      });
    }
  };

  // Show toast for rest violations when diagnostics are computed
  useEffect(() => {
    if (diagnostics && rosterData) {
      const totalViolations = Object.values(diagnostics.restViolations || {})
        .reduce((sum: number, violations: any[]) => sum + violations.length, 0);
      
      if (totalViolations > 0) {
        toast({
          title: "⚠️ Rest Period Violations Detected",
          description: `${totalViolations} instances where consecutive shifts have less than 11 hours rest. Check the Diagnostics tab for details.`,
          variant: "destructive",
        });
      }
    }
  }, [diagnostics, rosterData]);

  console.log('🔍 RosterViewer render state:', {
    loading,
    hasRosterData: !!rosterData,
    assignmentCount: rosterData?.assignments?.length || 0
  });

  if (loading) {
    return <LoadingState message="Loading roster data..." />;
  }

  if (!rosterData) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Roster not found</h3>
        <Button onClick={() => navigate('/my-rosters')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Rosters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RosterViewerHeader 
        rosterData={rosterData} 
        onBack={() => navigate('/my-rosters')}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />
      
      {/* Rest Violations Banner */}
      {diagnostics && Object.values(diagnostics.restViolations || {}).reduce((sum: number, v: any[]) => sum + v.length, 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ WTD Rest Period Violations Detected:</strong> This roster contains shifts with less than 11 hours rest between them. Review the Diagnostics tab for full details.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Diagnostics
          </TabsTrigger>
          <TabsTrigger value="print" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print/Download
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="space-y-6">
          <RosterCalendarTable 
            assignments={rosterData.assignments}
            diagnostics={diagnostics || undefined}
          />
        </TabsContent>
        
        <TabsContent value="diagnostics" className="space-y-6">
          {diagnostics ? (
            <RosterDiagnosticsPanel diagnostics={diagnostics} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <BarChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Diagnostics Available</h3>
                <p className="text-muted-foreground">
                  Diagnostics data is not available for this roster. This may be an older roster generated before diagnostics tracking was implemented.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="print" className="space-y-6">
          <RosterPrintView 
            rosterData={rosterData} 
            onPrint={handlePrint}
            onDownload={handleDownload}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RosterViewer;
