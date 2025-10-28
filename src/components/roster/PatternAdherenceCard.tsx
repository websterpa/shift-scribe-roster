import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { PatternAdherenceSummary } from '@/features/roster/patterns/adherence';

interface PatternAdherenceCardProps {
  adherence: PatternAdherenceSummary;
}

export function PatternAdherenceCard({ adherence }: PatternAdherenceCardProps) {
  const getAdherenceColor = (percent: number) => {
    if (percent === 100) return 'text-green-600';
    if (percent >= 90) return 'text-blue-600';
    if (percent >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAdherenceBadge = (percent: number) => {
    if (percent === 100) return <Badge className="bg-green-100 text-green-800">Perfect</Badge>;
    if (percent >= 90) return <Badge className="bg-blue-100 text-blue-800">Excellent</Badge>;
    if (percent >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Review</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Pattern Adherence</h3>
        {getAdherenceBadge(adherence.overallAdherence)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className={`text-3xl font-bold ${getAdherenceColor(adherence.overallAdherence)}`}>
            {adherence.overallAdherence.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">Overall</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold">{adherence.fullyCompliant}</span>
          </div>
          <div className="text-sm text-muted-foreground">Perfect Match</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold">{adherence.mostlyCompliant}</span>
          </div>
          <div className="text-sm text-muted-foreground">Mostly Compliant</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-2xl font-bold">{adherence.nonCompliant}</span>
          </div>
          <div className="text-sm text-muted-foreground">Non-Compliant</div>
        </div>
      </div>

      {adherence.staffMetrics.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium mb-2">Staff Breakdown</h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {adherence.staffMetrics.map((staff) => (
              <div
                key={staff.staffId}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{staff.staffName}</div>
                  <div className="text-xs text-muted-foreground">
                    {staff.matchingDays}/{staff.totalDays} days match
                    {staff.deviations > 0 && ` • ${staff.deviations} deviations`}
                  </div>
                </div>
                <div className={`text-lg font-bold ${getAdherenceColor(staff.adherencePercent)}`}>
                  {staff.adherencePercent.toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-muted-foreground">
        Generated {new Date(adherence.generatedAt).toLocaleString()}
      </div>
    </Card>
  );
}
