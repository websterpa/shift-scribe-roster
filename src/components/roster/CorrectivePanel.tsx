import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, AlertTriangle, CheckCircle2, Check } from "lucide-react";
import { generateCorrections } from "@/engine/corrective";
import type { RosterDiagnostics, RosterAssignment } from "@/engine/generateRoster";
import { toast } from "@/hooks/use-toast";

interface CorrectivePanelProps {
  assignments: Array<{
    id: string;
    date: string;
    shift_code: string;
    staff_profiles: {
      first_name: string;
      last_name: string;
    } | null;
  }>;
  diagnostics: RosterDiagnostics;
  onApply: (updatedAssignments: CorrectivePanelProps['assignments']) => void;
}

export function CorrectivePanel({ assignments, diagnostics, onApply }: CorrectivePanelProps) {
  const suggestions = useMemo(() => {
    // Transform assignments to engine format
    const engineAssignments: RosterAssignment[] = assignments.map((a, idx) => ({
      staffId: a.staff_profiles ? `${a.staff_profiles.first_name} ${a.staff_profiles.last_name}` : 'Unknown',
      staffName: a.staff_profiles ? `${a.staff_profiles.first_name} ${a.staff_profiles.last_name}` : 'Unknown',
      dayIndex: idx,
      date: new Date(a.date),
      shift: a.shift_code,
      patternId: 'unknown',
      hours: 8,
      cost: 0
    }));

    return generateCorrections(engineAssignments, diagnostics);
  }, [assignments, diagnostics]);

  const handleApply = (suggestion: typeof suggestions.suggestions[0]) => {
    console.log('[CorrectivePanel] Applying suggestion:', suggestion);
    
    // Find the assignment to update
    const staffName = suggestion.staffName;
    const updatedAssignments = assignments.map(a => {
      const currentStaffName = a.staff_profiles 
        ? `${a.staff_profiles.first_name} ${a.staff_profiles.last_name}` 
        : 'Unknown';
      
      // For rest violations, insert a rest day
      if (suggestion.issue.includes('Insufficient rest') || suggestion.issue.includes('rest')) {
        // Find the assignment matching the day index
        // This is a simplified approach - in production you'd need more sophisticated matching
        if (currentStaffName === staffName && a.shift_code !== 'R') {
          return { ...a, shift_code: 'R' };
        }
      }
      
      return a;
    });

    onApply(updatedAssignments);
    
    toast({
      title: "Suggestion Applied",
      description: `Updated roster for ${suggestion.staffName}. Review the changes in the Calendar view.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Corrective Suggestions
          </CardTitle>
          <CardDescription>
            Actionable recommendations to improve roster compliance and resolve violations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Issues</span>
              <span className="text-2xl font-bold">{suggestions.totalIssues}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Critical</span>
              <span className="text-2xl font-bold text-red-600">{suggestions.criticalIssues}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Warnings</span>
              <span className="text-2xl font-bold text-yellow-600">{suggestions.warningIssues}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Suggestions Alert */}
      {suggestions.totalIssues === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong>✓ No corrective actions needed.</strong> This roster meets all compliance requirements.
          </AlertDescription>
        </Alert>
      )}

      {/* Suggestions Table */}
      {suggestions.totalIssues > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>
              Review and apply these suggestions to resolve compliance issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Severity</th>
                    <th className="p-3 text-left font-medium">Staff</th>
                    <th className="p-3 text-left font-medium">Issue</th>
                    <th className="p-3 text-left font-medium">Suggested Action</th>
                    <th className="p-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.suggestions.map((s, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-3">
                        {s.severity === 'critical' && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Critical
                          </Badge>
                        )}
                        {s.severity === 'warning' && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Warning
                          </Badge>
                        )}
                        {s.severity === 'info' && (
                          <Badge variant="outline" className="gap-1">
                            Info
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 font-medium">{s.staffName}</td>
                      <td className="p-3 text-muted-foreground">{s.issue}</td>
                      <td className="p-3">{s.suggestion}</td>
                      <td className="p-3 text-center">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleApply(s)}
                          className="gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Apply
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Critical Issues Alert */}
            {suggestions.criticalIssues > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>⚠️ {suggestions.criticalIssues} Critical Issue(s) Detected:</strong> These require immediate attention to ensure legal compliance with Working Time Regulations.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
