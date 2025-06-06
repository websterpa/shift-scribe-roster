
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WeekNavigationControlsProps {
  currentWeekOffset: number;
  maxWeeks: number;
  visibleWeeks: number;
  weeksLength: number;
  generating: boolean;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  canShowMoreWeeks: boolean;
  remainingWeeks: number;
  weeksToAdd: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onShowMoreWeeks: () => void;
  onShowAllWeeks: () => void;
}

export function WeekNavigationControls({
  currentWeekOffset,
  maxWeeks,
  visibleWeeks,
  weeksLength,
  generating,
  canNavigatePrevious,
  canNavigateNext,
  canShowMoreWeeks,
  remainingWeeks,
  weeksToAdd,
  onPreviousWeek,
  onNextWeek,
  onShowMoreWeeks,
  onShowAllWeeks
}: WeekNavigationControlsProps) {
  return (
    <>
      {/* Week Navigation Header */}
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

      {/* Week Expansion Controls */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2">
        {canShowMoreWeeks && (
          <Button 
            onClick={onShowMoreWeeks}
            disabled={generating}
            className="w-full sm:w-auto"
          >
            Show Next {weeksToAdd} Week{weeksToAdd !== 1 ? 's' : ''}
            {remainingWeeks > 0 && ` (${remainingWeeks} remaining)`}
          </Button>
        )}
        {canShowMoreWeeks && remainingWeeks > weeksToAdd && (
          <Button 
            variant="secondary" 
            onClick={onShowAllWeeks}
            disabled={generating}
            className="w-full sm:w-auto"
          >
            Show All {maxWeeks} Weeks
          </Button>
        )}
        {!canShowMoreWeeks && maxWeeks > 4 && (
          <p className="text-sm text-gray-500 text-center">
            Showing all {maxWeeks} weeks
          </p>
        )}
      </div>
    </>
  );
}
