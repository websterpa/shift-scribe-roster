import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface ComplianceSummaryProps {
  diagnostics?: {
    restViolations: Record<string, Array<{ day: string; gap: number; message: string }>>;
    weeklyAverageCompliant: Record<string, boolean>;
  };
  totalStaff: number;
  heatmapEnabled: boolean;
  onHeatmapToggle: (enabled: boolean) => void;
}

export function ComplianceSummary({
  diagnostics,
  totalStaff,
  heatmapEnabled,
  onHeatmapToggle,
}: ComplianceSummaryProps) {
  console.log('🔍 ComplianceSummary rendered with', { totalStaff, diagnostics });

  // Calculate compliance metrics
  const staffWithViolations = diagnostics?.restViolations
    ? Object.keys(diagnostics.restViolations).length
    : 0;
  
  const compliantStaff = totalStaff - staffWithViolations;
  const compliancePercent = totalStaff > 0 
    ? Math.round((compliantStaff / totalStaff) * 100)
    : 100;

  const isFullyCompliant = compliancePercent === 100;
  const hasMinorIssues = compliancePercent >= 80 && compliancePercent < 100;
  const hasMajorIssues = compliancePercent < 80;

  return (
    <div className="flex items-center gap-6 p-4 bg-card border rounded-lg shadow-sm">
      <div className="flex items-center gap-3">
        {isFullyCompliant && (
          <CheckCircle className="h-5 w-5 text-green-600" />
        )}
        {(hasMinorIssues || hasMajorIssues) && (
          <AlertTriangle className={`h-5 w-5 ${hasMajorIssues ? 'text-red-600' : 'text-amber-600'}`} />
        )}
        <div>
          <h3 className="text-sm font-semibold">WTD Compliance</h3>
          <p className="text-xs text-muted-foreground">
            {compliantStaff} of {totalStaff} staff compliant
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{compliancePercent}%</span>
        </div>
        <Progress value={compliancePercent} className="h-2" />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Switch
          id="heatmap-toggle"
          checked={heatmapEnabled}
          onCheckedChange={onHeatmapToggle}
        />
        <Label htmlFor="heatmap-toggle" className="text-sm cursor-pointer">
          Heat-map view
        </Label>
      </div>
    </div>
  );
}
