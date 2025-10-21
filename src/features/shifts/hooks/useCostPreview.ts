import { useMemo } from "react";
import type { ShiftSpec, RatePolicy } from "@/features/roster/engine";
import { expandShift, costShift } from "@/features/roster/engine";

export interface UseCostPreviewArgs {
  shift: ShiftSpec;
  rates: RatePolicy;
  holidays?: { dateISO: string; isPublicHoliday: boolean }[];
}

export function useCostPreview({ shift, rates, holidays }: UseCostPreviewArgs) {
  return useMemo(() => {
    const segments = expandShift(shift, { holidays });
    const breakdown = costShift(shift, segments, rates);
    return { segments, breakdown };
  }, [shift.start?.getTime?.(), shift.end?.getTime?.(), rates, holidays]);
}