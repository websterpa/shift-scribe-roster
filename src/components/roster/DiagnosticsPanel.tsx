import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { summariseDiagnostics, calculateOverallCompliance, type StaffDiagnostics } from "@/engine/diagnostics";
import { CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

interface DiagnosticsPanelProps {
  versionId: string;
  assignments: Array<{
    staff_id: string;
    date: string;
    shift_code: string;
  }>;
  staffMembers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    pattern_id?: string;
    pattern_offset?: number;
  }>;
  patterns: Array<{
    id: string;
    sequence: any;
    cycle_length: number;
  }>;
}

export function DiagnosticsPanel({ assignments, staffMembers, patterns }: DiagnosticsPanelProps) {
  console.log("DiagnosticsPanel: rendering with", assignments.length, "assignments");
  
  const diagnostics = useMemo(() => {
    if (!assignments.length || !patterns.length || !staffMembers.length) {
      return [];
    }
    
    // Transform assignments to engine format
    const transformedAssignments = assignments.map((a, idx) => ({
      staffId: a.staff_id,
      date: a.date,
      shiftCode: a.shift_code,
      dayIndex: idx % 28 // Simplified - in production calculate from start date
    }));
    
    // Build patterns map
    const patternsMap = patterns.reduce((acc, p) => {
      acc[p.id] = {
        id: p.id,
        sequence: Array.isArray(p.sequence) ? p.sequence : [],
        cycleLength: p.cycle_length
      };
      return acc;
    }, {} as Record<string, any>);
    
    // Build staff patterns map
    const staffPatternsMap = staffMembers.reduce((acc, s) => {
      if (s.pattern_id) {
        acc[s.id] = {
          staffId: s.id,
          patternId: s.pattern_id,
          offset: s.pattern_offset || 0
        };
      }
      return acc;
    }, {} as Record<string, any>);
    
    return summariseDiagnostics(transformedAssignments, patternsMap, staffPatternsMap);
  }, [assignments, patterns, staffMembers]);
  
  const overall = useMemo(() => calculateOverallCompliance(diagnostics), [diagnostics]);
  
  const getStaffName = (staffId: string) => {
    const staff = staffMembers.find(s => s.id === staffId);
    return staff ? `${staff.first_name} ${staff.last_name}` : staffId;
  };
  
  const getComplianceColor = (compliance: number) => {
    if (compliance >= 95) return "default";
    if (compliance >= 80) return "secondary";
    return "destructive";
  };
  
  if (!diagnostics.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pattern Diagnostics
          </CardTitle>
          <CardDescription>
            No diagnostic data available. Generate a roster to see pattern adherence statistics.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Pattern Diagnostics
        </CardTitle>
        <CardDescription>
          Staff assignment summary and pattern compliance analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Average Compliance</p>
            <div className="flex items-center gap-2">
              {overall.avgCompliance >= 95 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              <span className="text-2xl font-bold">{overall.avgCompliance}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Shifts</p>
            <p className="text-2xl font-bold">{overall.totalShifts}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Fully Compliant Staff</p>
            <p className="text-2xl font-bold">
              {overall.fullyCompliant} / {diagnostics.length}
            </p>
          </div>
        </div>
        
        {/* Staff Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead className="text-center">Pattern Compliance</TableHead>
                <TableHead className="text-center">Total Shifts</TableHead>
                <TableHead className="text-center">Matching</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diagnostics.map((diag) => (
                <TableRow key={diag.staffId}>
                  <TableCell className="font-medium">
                    {getStaffName(diag.staffId)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getComplianceColor(diag.patternCompliance)}>
                      {diag.patternCompliance}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {diag.totalShifts}
                  </TableCell>
                  <TableCell className="text-center">
                    {diag.matchingShifts} / {diag.expectedShifts}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
