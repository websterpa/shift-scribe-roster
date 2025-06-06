
import React from 'react';
import { WeekNavigationButtons } from '@/components/roster/WeekNavigationButtons';
import { WeekExpansionControls } from '@/components/roster/WeekExpansionControls';

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

export function WeekNavigationControls(props: WeekNavigationControlsProps) {
  return (
    <>
      <WeekNavigationButtons 
        currentWeekOffset={props.currentWeekOffset}
        visibleWeeks={props.visibleWeeks}
        weeksLength={props.weeksLength}
        canNavigatePrevious={props.canNavigatePrevious}
        canNavigateNext={props.canNavigateNext}
        onPreviousWeek={props.onPreviousWeek}
        onNextWeek={props.onNextWeek}
      />
      <WeekExpansionControls 
        maxWeeks={props.maxWeeks}
        generating={props.generating}
        canShowMoreWeeks={props.canShowMoreWeeks}
        remainingWeeks={props.remainingWeeks}
        weeksToAdd={props.weeksToAdd}
        onShowMoreWeeks={props.onShowMoreWeeks}
        onShowAllWeeks={props.onShowAllWeeks}
      />
    </>
  );
}
