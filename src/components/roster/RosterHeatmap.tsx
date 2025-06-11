
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RosterHeatmapProps {
  weekData?: Array<{
    day: string;
    date: string;
    shifts: Array<{
      time: string;
      staffCount: number;
      required: number;
      status: 'understaffed' | 'optimal' | 'overstaffed';
    }>;
  }>;
}

export function RosterHeatmap({ weekData }: RosterHeatmapProps) {
  // Mock data if not provided
  const defaultData = [
    {
      day: 'Mon',
      date: '11/06',
      shifts: [
        { time: '07:00', staffCount: 3, required: 4, status: 'understaffed' as const },
        { time: '15:00', staffCount: 4, required: 4, status: 'optimal' as const },
        { time: '23:00', staffCount: 2, required: 2, status: 'optimal' as const }
      ]
    },
    {
      day: 'Tue',
      date: '12/06',
      shifts: [
        { time: '07:00', staffCount: 4, required: 4, status: 'optimal' as const },
        { time: '15:00', staffCount: 5, required: 4, status: 'overstaffed' as const },
        { time: '23:00', staffCount: 2, required: 2, status: 'optimal' as const }
      ]
    },
    {
      day: 'Wed',
      date: '13/06',
      shifts: [
        { time: '07:00', staffCount: 4, required: 4, status: 'optimal' as const },
        { time: '15:00', staffCount: 4, required: 4, status: 'optimal' as const },
        { time: '23:00', staffCount: 1, required: 2, status: 'understaffed' as const }
      ]
    },
    {
      day: 'Thu',
      date: '14/06',
      shifts: [
        { time: '07:00', staffCount: 4, required: 4, status: 'optimal' as const },
        { time: '15:00', staffCount: 4, required: 4, status: 'optimal' as const },
        { time: '23:00', staffCount: 2, required: 2, status: 'optimal' as const }
      ]
    },
    {
      day: 'Fri',
      date: '15/06',
      shifts: [
        { time: '07:00', staffCount: 3, required: 4, status: 'understaffed' as const },
        { time: '15:00', staffCount: 4, required: 4, status: 'optimal' as const },
        { time: '23:00', staffCount: 2, required: 2, status: 'optimal' as const }
      ]
    },
    {
      day: 'Sat',
      date: '16/06',
      shifts: [
        { time: '07:00', staffCount: 3, required: 3, status: 'optimal' as const },
        { time: '15:00', staffCount: 3, required: 3, status: 'optimal' as const },
        { time: '23:00', staffCount: 2, required: 2, status: 'optimal' as const }
      ]
    },
    {
      day: 'Sun',
      date: '17/06',
      shifts: [
        { time: '07:00', staffCount: 3, required: 3, status: 'optimal' as const },
        { time: '15:00', staffCount: 3, required: 3, status: 'optimal' as const },
        { time: '23:00', staffCount: 2, required: 2, status: 'optimal' as const }
      ]
    }
  ];

  const data = weekData || defaultData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'understaffed': return 'bg-red-100 text-red-800 border-red-200';
      case 'overstaffed': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'optimal': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Current Week Roster Heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Visual overview showing staffing levels across all shifts this week
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 gap-2 min-w-full">
            {/* Header row */}
            <div className="font-medium text-sm text-center">Time</div>
            {data.map((day) => (
              <div key={day.day} className="text-center">
                <div className="font-medium text-sm">{day.day}</div>
                <div className="text-xs text-muted-foreground">{day.date}</div>
              </div>
            ))}

            {/* Shift rows */}
            {['07:00', '15:00', '23:00'].map((time) => (
              <React.Fragment key={time}>
                <div className="font-medium text-sm text-center py-2">{time}</div>
                {data.map((day) => {
                  const shift = day.shifts.find(s => s.time === time);
                  return (
                    <div key={`${day.day}-${time}`} className="text-center">
                      {shift && (
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(shift.status)} text-xs px-1 py-1 w-full`}
                        >
                          {shift.staffCount}/{shift.required}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span>Optimal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
            <span>Understaffed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
            <span>Overstaffed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
