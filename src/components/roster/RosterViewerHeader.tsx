
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Users, Clock, Settings, FileDown, FileSpreadsheet, FileText } from 'lucide-react';

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
  assignments: any[];
}

interface RosterViewerHeaderProps {
  rosterData: RosterData;
  onBack: () => void;
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
}

export const RosterViewerHeader = ({ 
  rosterData, 
  onBack, 
  onExportCSV, 
  onExportExcel, 
  onExportPDF 
}: RosterViewerHeaderProps) => {
  // Calculate total staff and costs
  const totalAssignments = rosterData.assignments.length;
  const totalHours = rosterData.assignments.reduce((sum, assignment) => sum + (assignment.hours || 0), 0);
  const totalCost = rosterData.assignments.reduce((sum, assignment) => sum + (assignment.cost || 0), 0);
  
  // Get unique staff count
  const uniqueStaff = new Set(
    rosterData.assignments
      .filter(assignment => assignment.staff_profiles)
      .map(assignment => `${assignment.staff_profiles.first_name} ${assignment.staff_profiles.last_name}`)
  );

  const startDate = rosterData.config?.start_date ? new Date(rosterData.config.start_date) : null;
  const endDate = startDate ? new Date(startDate.getTime() + (rosterData.config?.cycle_length_weeks || 0) * 7 * 24 * 60 * 60 * 1000) : null;

  return (
    <div className="space-y-4">
      {/* Navigation and Actions */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Rosters
        </Button>
        
        {/* Export Actions */}
        <div className="flex items-center gap-2">
          {onExportCSV && (
            <Button variant="outline" size="sm" onClick={onExportCSV}>
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </Button>
          )}
          {onExportExcel && (
            <Button variant="outline" size="sm" onClick={onExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          )}
          {onExportPDF && (
            <Button variant="outline" size="sm" onClick={onExportPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
          )}
        </div>
      </div>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{rosterData.version_name}</CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">v{rosterData.version_number}</Badge>
                <span className="text-sm text-gray-500">
                  Generated on {new Date(rosterData.generated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Configuration Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Settings className="h-4 w-4" />
                Configuration
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Name:</strong> {rosterData.config?.config_name || 'Unknown'}</p>
                <p><strong>Type:</strong> {rosterData.config?.shift_type || 'Unknown'}</p>
                <p><strong>Cycle:</strong> {rosterData.config?.cycle_length_weeks || 0} weeks</p>
                {startDate && endDate && (
                  <p><strong>Period:</strong> {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* Staffing Requirements */}
            {rosterData.config?.staffing_requirements && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  Required Staff per Shift
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  {rosterData.config.shift_type === '12h' ? (
                    <>
                      <p><strong>Day:</strong> {rosterData.config.staffing_requirements.day_shift_staff || 2} staff</p>
                      <p><strong>Night:</strong> {rosterData.config.staffing_requirements.night_shift_staff || 2} staff</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Early:</strong> {rosterData.config.staffing_requirements.early_shift_staff || 2} staff</p>
                      <p><strong>Late:</strong> {rosterData.config.staffing_requirements.late_shift_staff || 2} staff</p>
                      <p><strong>Night:</strong> {rosterData.config.staffing_requirements.night_shift_staff || 2} staff</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Staff Statistics */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Staff Utilization
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Total Staff:</strong> {uniqueStaff.size}</p>
                <p><strong>Assignments:</strong> {totalAssignments}</p>
                <p><strong>Avg per Person:</strong> {uniqueStaff.size > 0 ? Math.round(totalAssignments / uniqueStaff.size) : 0}</p>
              </div>
            </div>

            {/* Time & Cost Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Time & Cost
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Total Hours:</strong> {totalHours}h</p>
                <p><strong>Total Cost:</strong> £{totalCost.toFixed(2)}</p>
                <p><strong>Avg per Hour:</strong> £{totalHours > 0 ? (totalCost / totalHours).toFixed(2) : '0.00'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
