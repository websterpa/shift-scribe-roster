import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Moon, Calendar, Clock } from 'lucide-react';

interface DistributionStats {
  nights: number;
  weekendDays: number;
  totalHours: number;
}

interface DistributionDiagnosticsProps {
  distributionStats: Record<string, DistributionStats>;
  staffNames?: Record<string, string>; // staffId -> name
  maxNightsPerCycle?: number;
  maxWeekendsPerCycle?: number;
}

export const DistributionDiagnostics: React.FC<DistributionDiagnosticsProps> = ({
  distributionStats,
  staffNames = {},
  maxNightsPerCycle = 8,
  maxWeekendsPerCycle = 6,
}) => {
  const staffIds = Object.keys(distributionStats);
  
  if (staffIds.length === 0) {
    return null;
  }

  // Calculate aggregates
  const nightsArray = staffIds.map(id => distributionStats[id].nights);
  const weekendsArray = staffIds.map(id => distributionStats[id].weekendDays);
  const hoursArray = staffIds.map(id => distributionStats[id].totalHours);

  const stats = {
    nights: {
      min: Math.min(...nightsArray),
      max: Math.max(...nightsArray),
      avg: (nightsArray.reduce((a, b) => a + b, 0) / nightsArray.length).toFixed(1),
      variance: nightsArray.length > 0 ? Math.max(...nightsArray) - Math.min(...nightsArray) : 0,
    },
    weekends: {
      min: Math.min(...weekendsArray),
      max: Math.max(...weekendsArray),
      avg: (weekendsArray.reduce((a, b) => a + b, 0) / weekendsArray.length).toFixed(1),
      variance: weekendsArray.length > 0 ? Math.max(...weekendsArray) - Math.min(...weekendsArray) : 0,
    },
    hours: {
      min: Math.min(...hoursArray),
      max: Math.max(...hoursArray),
      avg: (hoursArray.reduce((a, b) => a + b, 0) / hoursArray.length).toFixed(1),
    },
  };

  const getVarianceBadge = (variance: number, type: 'nights' | 'weekends') => {
    const threshold = type === 'nights' ? 2 : 1;
    if (variance <= threshold) {
      return <Badge variant="default" className="text-xs">Excellent (Δ{variance})</Badge>;
    } else if (variance <= threshold * 2) {
      return <Badge variant="secondary" className="text-xs">Good (Δ{variance})</Badge>;
    } else {
      return <Badge variant="destructive" className="text-xs">Needs Balance (Δ{variance})</Badge>;
    }
  };

  // Sort staff by nights (descending) for detailed view
  const sortedByNights = staffIds
    .map(id => ({ id, ...distributionStats[id], name: staffNames[id] || id }))
    .sort((a, b) => b.nights - a.nights);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Moon className="h-5 w-5" />
          Distribution Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Nights */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Night Shifts</h4>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Range:</span>
                <span className="font-medium">{stats.nights.min} - {stats.nights.max}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average:</span>
                <span className="font-medium">{stats.nights.avg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cap:</span>
                <span className="font-medium">{maxNightsPerCycle}</span>
              </div>
              <div className="mt-2">
                {getVarianceBadge(stats.nights.variance, 'nights')}
              </div>
            </div>
          </div>

          {/* Weekends */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Weekend Days</h4>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Range:</span>
                <span className="font-medium">{stats.weekends.min} - {stats.weekends.max}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average:</span>
                <span className="font-medium">{stats.weekends.avg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cap:</span>
                <span className="font-medium">{maxWeekendsPerCycle}</span>
              </div>
              <div className="mt-2">
                {getVarianceBadge(stats.weekends.variance, 'weekends')}
              </div>
            </div>
          </div>

          {/* Total Hours */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Total Hours</h4>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Range:</span>
                <span className="font-medium">{stats.hours.min}h - {stats.hours.max}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average:</span>
                <span className="font-medium">{stats.hours.avg}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spread:</span>
                <span className="font-medium">{stats.hours.max - stats.hours.min}h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Per-Staff Breakdown */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Staff Distribution</h4>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {sortedByNights.map(staff => {
              const nightsRatio = staff.nights / maxNightsPerCycle;
              const weekendsRatio = staff.weekendDays / maxWeekendsPerCycle;
              const nightsWarning = nightsRatio >= 0.9;
              const weekendsWarning = weekendsRatio >= 0.9;

              return (
                <div 
                  key={staff.id} 
                  className={`p-2 rounded text-sm border ${
                    nightsWarning || weekendsWarning 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-medium">{staff.name}</div>
                    <div className="flex gap-2 text-xs">
                      <Badge variant={nightsWarning ? "destructive" : "secondary"} className="text-xs">
                        <Moon className="h-3 w-3 mr-1" />
                        {staff.nights}/{maxNightsPerCycle}
                      </Badge>
                      <Badge variant={weekendsWarning ? "destructive" : "secondary"} className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {staff.weekendDays}/{maxWeekendsPerCycle}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {staff.totalHours}h
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
