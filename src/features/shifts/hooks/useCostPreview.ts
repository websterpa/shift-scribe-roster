import { useMemo } from "react";
import type { ShiftSpec, RatePolicy } from "../../../engine2/types";
import { expandShift } from "../../../engine2/time/expandShift";
import { costShift } from "../../../engine2/cost/costShift";

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