import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type Props = {
  reason?: "not-generated" | "not-required" | "unknown";
  tokenCounts: Record<string, number>;
  onRegenerateNights?: () => void;
  onOpenWizard?: () => void;
  VersionPicker?: React.ComponentType;
};

export default function NightCallout({ 
  reason = "unknown", 
  tokenCounts, 
  onRegenerateNights, 
  onOpenWizard, 
  VersionPicker 
}: Props) {
  const tokenDisplay = Object.entries(tokenCounts)
    .map(([k, v]) => `${k}:${v}`)
    .join(" • ");
  
  const nightCount = tokenCounts["N"] ?? 0;
  const hasTokenCounts = Object.keys(tokenCounts).length > 0;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-3 flex-1">
          <div>
            <div className="font-semibold text-amber-900 mb-1">
              Night shifts aren't present in this roster version
            </div>
            {hasTokenCounts && (
              <div className="text-sm text-amber-800">
                Token counts: {tokenDisplay}{nightCount === 0 && " • N:0"}
              </div>
            )}
          </div>
          
          {reason === "not-generated" && (
            <p className="text-sm text-amber-800">
              This version only contains Day/Rest duties. To include Nights, regenerate the roster with Night patterns enabled or choose a version that already includes Nights.
            </p>
          )}
          
          <div className="flex flex-wrap gap-2">
            {onRegenerateNights && (
              <Button 
                onClick={onRegenerateNights}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Regenerate with Nights
              </Button>
            )}
            {onOpenWizard && (
              <Button 
                onClick={onOpenWizard}
                variant="outline"
                size="sm"
              >
                Open Wizard (enable Nights)
              </Button>
            )}
            {VersionPicker && <VersionPicker />}
          </div>
        </div>
      </div>
    </div>
  );
}