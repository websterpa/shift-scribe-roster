
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RosterCalendarHeaderProps {
  currentWeekDates: string[];
}

export const RosterCalendarHeader = ({ currentWeekDates }: RosterCalendarHeaderProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    return { day, weekday };
  };

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="sticky left-0 bg-white border-r-2 min-w-[200px]">
          <div className="font-semibold">Staff Member</div>
          <div className="text-xs text-gray-500">Role • WTD Status</div>
        </TableHead>
        {currentWeekDates.map((date) => {
          const { day, weekday } = formatDate(date);
          return (
            <TableHead key={date} className="text-center min-w-[60px] border-l">
              <div className="font-semibold">{weekday}</div>
              <div className="text-lg">{day}</div>
            </TableHead>
          );
        })}
        <TableHead className="text-center border-l-2 min-w-[80px]">
          <div className="font-semibold">Week</div>
          <div className="text-xs">Hours</div>
        </TableHead>
        <TableHead className="text-center min-w-[100px]">
          <div className="font-semibold">Week</div>
          <div className="text-xs">Cost (£)</div>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};
