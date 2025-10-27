import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Users, XCircle, RefreshCw } from 'lucide-react';
import { useEligibilityDebug } from './useEligibilityDebug';
import { Skeleton } from '@/components/ui/skeleton';

interface EligibilityInspectorProps {
  monthISO: string;
  shiftSystem: '8h' | '12h';
  className?: string;
}

export function EligibilityInspector({ monthISO, shiftSystem, className }: EligibilityInspectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showOnlyExcluded, setShowOnlyExcluded] = React.useState(false);
  const { report, loading, error, refresh } = useEligibilityDebug(monthISO, shiftSystem);

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to analyze staff eligibility: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !report) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const filteredStaff = showOnlyExcluded 
    ? report.staffDetails.filter(s => !s.isEligible)
    : report.staffDetails;

  // Determine severity level
  const getSeverity = () => {
    if (report.eligibleCount >= 11) return 'success';
    if (report.eligibleCount >= 8) return 'warning';
    return 'error';
  };

  const severity = getSeverity();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Eligibility Analysis
            </CardTitle>
            <CardDescription>
              Understanding why staff are included or excluded from generation
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{report.totalStaff}</div>
            <div className="text-xs text-muted-foreground">Total Staff</div>
          </div>
          <div className={`text-center p-3 rounded-lg ${
            severity === 'success' ? 'bg-green-50 dark:bg-green-950' :
            severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950' :
            'bg-red-50 dark:bg-red-950'
          }`}>
            <div className={`text-2xl font-bold ${
              severity === 'success' ? 'text-green-600 dark:text-green-400' :
              severity === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {report.eligibleCount}
            </div>
            <div className="text-xs text-muted-foreground">Eligible</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{report.excludedCount}</div>
            <div className="text-xs text-muted-foreground">Excluded</div>
          </div>
        </div>

        {/* Warning if too few eligible */}
        {report.eligibleCount < 11 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only {report.eligibleCount} eligible staff found. At least 11 are recommended for roster generation.
              Review exclusion reasons below and update staff availability status.
            </AlertDescription>
          </Alert>
        )}

        {/* Top Exclusion Reasons */}
        {report.excludedCount > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Top Exclusion Reasons:</h4>
            <div className="space-y-1">
              {Object.entries(report.exclusionReasons)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{reason}</span>
                    <Badge variant="outline">{count} staff</Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Detailed Staff List */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>View Detailed Staff List</span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-3">
            {/* Filter Toggle */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnlyExcluded(!showOnlyExcluded)}
              >
                {showOnlyExcluded ? 'Show All Staff' : 'Show Only Excluded'}
              </Button>
            </div>

            {/* Staff Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Eligible Shifts</TableHead>
                    <TableHead>Exclusion Reasons</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No staff members to display
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((staff) => (
                      <TableRow key={staff.staffId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {staff.isEligible ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            {staff.staffName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              staff.details.availabilityStatus === 'active' ? 'default' :
                              staff.details.availabilityStatus === 'temporarily_unavailable' ? 'secondary' :
                              'outline'
                            }
                          >
                            {staff.details.availabilityStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {staff.details.role}
                        </TableCell>
                        <TableCell className="text-sm">
                          {staff.details.eligibleShifts.length > 0 
                            ? staff.details.eligibleShifts.join(', ')
                            : 'None configured'}
                        </TableCell>
                        <TableCell>
                          {staff.isEligible ? (
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                              ✓ Eligible
                            </Badge>
                          ) : (
                            <div className="space-y-1">
                              {staff.reasonsExcluded.map((reason, idx) => (
                                <Badge key={idx} variant="destructive" className="mr-1">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Quick Actions */}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>To fix eligibility issues:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Go to Settings → Staff Management</li>
                  <li>Update staff "Availability Status" to "active"</li>
                  <li>Ensure "Eligible Shifts" are configured for {shiftSystem} system</li>
                  <li>Mark staff as "Shift Worker" if they should be scheduled</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
