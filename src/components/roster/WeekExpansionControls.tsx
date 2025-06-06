
import React from 'react';
import { Button } from '@/components/ui/button';

interface WeekExpansionControlsProps {
  maxWeeks: number;
  generating: boolean;
  canShowMoreWeeks: boolean;
  remainingWeeks: number;
  weeksToAdd: number;
  onShowMoreWeeks: () => void;
  onShowAllWeeks: () => void;
}

export function WeekExpansionControls({
  maxWeeks,
  generating,
  canShowMoreWeeks,
  remainingWeeks,
  weeksToAdd,
  onShowMoreWeeks,
  onShowAllWeeks
}: WeekExpansionControlsProps) {
  return (
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
  );
}
