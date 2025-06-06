
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WeekNavigationButtonsProps {
  currentWeekOffset: number;
  visibleWeeks: number;
  weeksLength: number;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export function WeekNavigationButtons({
  currentWeekOffset,
  visibleWeeks,
  weeksLength,
  canNavigatePrevious,
  canNavigateNext,
  onPreviousWeek,
  onNextWeek
}: WeekNavigationButtonsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={onPreviousWeek}
        disabled={!canNavigatePrevious}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-normal min-w-[120px] text-center">
        Week {currentWeekOffset + 1} of {Math.min(visibleWeeks, weeksLength)}
      </span>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onNextWeek}
        disabled={!canNavigateNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
