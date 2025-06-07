
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Users, Clock } from 'lucide-react';

interface RosterData {
  version_name: string;
  version_number: number;
  generated_at: string;
  config: {
    config_name: string;
    shift_type: string;
    cycle_length_weeks: number;
    start_date: string;
  } | null;
  assignments: any[];
}

interface RosterViewerHeaderProps {
  rosterData: RosterData;
  onBack: () => void;
}

export const RosterViewerHeader = ({ rosterData, onBack }: RosterViewerHeaderProps) => {
  console.log('🔄 RosterViewerHeader component rendered');

  const uniqueStaff = new Set(rosterData.assignments.map(a => a.staff_profiles?.first_name + ' ' + a.staff_profiles?.last_name)).size;
  const totalHours = rosterData.assignments.reduce((sum, a) => sum + (a.hours || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Rosters
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{rosterData.version_name}</h1>
          <p className="text-gray-600">Version {rosterData.version_number} • Generated on {new Date(rosterData.generated_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rosterData.config?.config_name || 'Unknown'}</div>
            <p className="text-xs text-gray-500">{rosterData.config?.shift_type} shifts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueStaff}</div>
            <p className="text-xs text-gray-500">unique staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}</div>
            <p className="text-xs text-gray-500">scheduled hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rosterData.config?.cycle_length_weeks || 0}</div>
            <p className="text-xs text-gray-500">weeks</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
