
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RosterWeekNavigationProps {
  currentWeekIndex: number;
  totalWeeks: number;
  onPrevious: () => void;
  onNext: () => void;
  currentWeekDates: string[];
}

export const RosterWeekNavigation = ({
  currentWeekIndex,
  totalWeeks,
  onPrevious,
  onNext,
  currentWeekDates
}: RosterWeekNavigationProps) => {
  const canNavigatePrevious = currentWeekIndex > 0;
  const canNavigateNext = currentWeekIndex < totalWeeks - 1;

  return (
    <div className="flex items-center justify-between">
      <div className="text-2xl font-semibold">Roster Calendar View</div>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onPrevious}
            disabled={!canNavigatePrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-normal min-w-[120px] text-center">
            Week {currentWeekIndex + 1} of {totalWeeks}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onNext}
            disabled={!canNavigateNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {totalWeeks > 0 && currentWeekDates.length > 0 && (
          <div className="text-sm text-gray-600 text-center">
            Showing {new Date(currentWeekDates[0]).toLocaleDateString()} - {new Date(currentWeekDates[currentWeekDates.length - 1]).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};
