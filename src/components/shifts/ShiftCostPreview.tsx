import React from "react";
import { useCostPreview } from "../../features/shifts/hooks/useCostPreview";
import type { RatePolicy, ShiftSpec } from "../../engine2/types";

interface ShiftCostPreviewProps {
  shift: ShiftSpec;
  rates: RatePolicy;
  holidays?: { dateISO: string; isPublicHoliday: boolean }[];
}

export function ShiftCostPreview({ shift, rates, holidays }: ShiftCostPreviewProps) {
  const { breakdown } = useCostPreview({ shift, rates, holidays });

  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
      <div className="font-semibold text-lg">
        Total: £{breakdown.total.toFixed(2)}
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>Base: £{breakdown.base.toFixed(2)}</div>
        <div>Differential: £{breakdown.differential.toFixed(2)}</div>
        <div>Premium: £{breakdown.premium.toFixed(2)}</div>
        <div>Flat shift: £{breakdown.flatShiftPay.toFixed(2)}</div>
        <div>Allowances: £{breakdown.allowances.toFixed(2)}</div>
      </div>

      {breakdown.lines.length > 0 && (
        <div className="mt-3 pt-2 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            {breakdown.lines.map((line, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{line.message}</span>
                {line.meta && (
                  <span className="font-mono">
                    {JSON.stringify(line.meta)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}