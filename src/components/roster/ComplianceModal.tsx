import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface StaffMember {
  name: string;
  role: string;
  maxHours: number;
  optedOut: boolean;
}

interface ComplianceModalProps {
  staff: StaffMember | null;
  diagnostics?: {
    restViolations: Record<string, Array<{ day: string; gap: number; message: string }>>;
    weeklyAverageCompliant: Record<string, boolean>;
  };
  weekHours: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ComplianceModal = ({
  staff,
  diagnostics,
  weekHours,
  open,
  onOpenChange,
}: ComplianceModalProps) => {
  if (!staff) return null;

  const violations = diagnostics?.restViolations?.[staff.name] || [];
  const isWeeklyCompliant = diagnostics?.weeklyAverageCompliant?.[staff.name] ?? true;
  const hoursCompliant = weekHours <= staff.maxHours;
  
  const overallCompliant = violations.length === 0 && hoursCompliant && (isWeeklyCompliant || staff.optedOut);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {staff.name} – Compliance Details
            {overallCompliant ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Status */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Overall Status:</span>
            <Badge variant={overallCompliant ? "default" : "destructive"}>
              {overallCompliant ? 'Compliant' : 'Non-Compliant'}
            </Badge>
          </div>

          <Separator />

          {/* Staff Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium">{staff.role}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">WTD Status</p>
              <p className="font-medium">
                {staff.optedOut ? 'Opted Out (48h limit)' : 'Opted In (48h avg limit)'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Hours Compliance */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4" />
              <span className="font-medium">Weekly Hours</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{weekHours}h</span>
              <span className="text-muted-foreground">/ {staff.maxHours}h max</span>
              {hoursCompliant ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive ml-auto" />
              )}
            </div>
            {!hoursCompliant && (
              <p className="text-sm text-destructive mt-1">
                Exceeds maximum hours by {weekHours - staff.maxHours}h
              </p>
            )}
          </div>

          <Separator />

          {/* Rest Violations */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">WTD Rest Period Violations</span>
              <Badge variant={violations.length === 0 ? "default" : "destructive"}>
                {violations.length}
              </Badge>
            </div>
            
            {violations.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-md">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>No rest period violations detected</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {violations.map((v, i) => (
                  <li key={i} className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{v.day}</p>
                        <p className="text-sm text-muted-foreground">
                          Only {v.gap.toFixed(1)} hours rest
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{v.message}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Weekly Average Compliance */}
          {!staff.optedOut && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Weekly Average Compliance</span>
                  {isWeeklyCompliant ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {isWeeklyCompliant
                    ? 'Weekly average hours are within WTD limits'
                    : 'Weekly average hours exceed WTD limits'}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
