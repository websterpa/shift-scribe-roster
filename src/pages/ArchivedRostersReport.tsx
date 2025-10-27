import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Archive, Eye, AlertCircle, Loader2, Download, Calendar, User, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/errorLogger';
import { toast } from '@/hooks/use-toast';
import { utils, writeFile } from 'xlsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const logger = createLogger('ArchivedRostersReport');

interface ArchivedRoster {
  id: string;
  tenant_id: string | null;
  month: string;
  archived_at: string;
  archived_by: string | null;
  reason: string | null;
}

interface Assignment {
  id: string;
  staff_id: string;
  date: string;
  shift_code: string;
  shift_start?: string;
  shift_end?: string;
  hours?: number;
  cost?: number;
  version_id: string;
}

const ArchivedRostersReport = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ArchivedRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoster, setSelectedRoster] = useState<ArchivedRoster | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const fetchArchivedRosters = async () => {
      try {
        logger.info('Fetching archived rosters');
        
        const { data: archivedData, error: fetchError } = await supabase
          .from('archived_rosters')
          .select('id, tenant_id, month, archived_at, archived_by, reason')
          .order('archived_at', { ascending: false });

        if (fetchError) {
          logger.error(new Error('Failed to fetch archived rosters'), { error: fetchError });
          setError(fetchError.message);
          return;
        }

        setData(archivedData || []);
        logger.info('Archived rosters fetched successfully', { count: archivedData?.length || 0 });
      } catch (err) {
        logger.error(new Error('Unexpected error fetching archived rosters'), { error: err });
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedRosters();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Compute summary for chart
  const summary = data.reduce((acc, r) => {
    const key = r.month;
    const existing = acc.find(i => i.month === key);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ month: key, count: 1, archivedAt: r.archived_at });
    }
    return acc;
  }, [] as Array<{ month: string; count: number; archivedAt: string }>)
    .sort((a, b) => a.month.localeCompare(b.month)); // Sort chronologically

  const handleViewRoster = async (roster: ArchivedRoster) => {
    setSelectedRoster(roster);
    setDetailOpen(true);
    setLoadingDetails(true);

    try {
      logger.info('Fetching archived roster details', { id: roster.id });

      const { data: rosterData, error: fetchError } = await supabase
        .from('archived_rosters')
        .select('assignments')
        .eq('id', roster.id)
        .maybeSingle();

      if (fetchError) {
        logger.error(new Error('Failed to fetch roster details'), { error: fetchError });
        toast({
          title: "Error loading roster",
          description: fetchError.message,
          variant: "destructive"
        });
        return;
      }

      if (!rosterData) {
        logger.warn('No roster data found', { id: roster.id });
        setAssignments([]);
        return;
      }

      const parsedAssignments = Array.isArray(rosterData.assignments) 
        ? (rosterData.assignments as unknown as Assignment[])
        : [];
      
      setAssignments(parsedAssignments);
      logger.info('Roster details loaded', { assignmentCount: parsedAssignments.length });
    } catch (err) {
      logger.error(new Error('Unexpected error loading roster details'), { error: err });
      toast({
        title: "Error",
        description: "Failed to load roster details",
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedRoster || assignments.length === 0) return;

    const ws = utils.json_to_sheet(assignments);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Roster');
    writeFile(wb, `Archived_Roster_${selectedRoster.month}.xlsx`);

    toast({
      title: "Roster exported successfully",
      description: `Exported ${assignments.length} assignments to Excel file`
    });
  };

  const handleRestoreRoster = async () => {
    if (!selectedRoster) return;

    setRestoring(true);
    try {
      logger.info('Restoring archived roster', { id: selectedRoster.id });

      // Fetch the full archived roster data
      const { data: archivedData, error: fetchError } = await supabase
        .from('archived_rosters')
        .select('assignments, month, tenant_id, version_id')
        .eq('id', selectedRoster.id)
        .maybeSingle();

      if (fetchError || !archivedData) {
        throw new Error(fetchError?.message || 'Failed to fetch archived roster');
      }

      const parsedAssignments = Array.isArray(archivedData.assignments)
        ? (archivedData.assignments as unknown as Assignment[])
        : [];

      if (parsedAssignments.length === 0) {
        throw new Error('No assignments found in archived roster');
      }

      // Calculate date range for the month
      const [year, month] = archivedData.month.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const monthStart = `${archivedData.month}-01`;
      const monthEnd = `${archivedData.month}-${String(daysInMonth).padStart(2, '0')}`;

      // Delete current active assignments for this month
      const { error: deleteError } = await supabase
        .from('roster_assignments')
        .delete()
        .gte('date', monthStart)
        .lte('date', monthEnd);

      if (deleteError) {
        throw new Error(`Failed to clear existing assignments: ${deleteError.message}`);
      }

      // Insert archived assignments as new active roster
      const assignmentsToInsert = parsedAssignments.map(a => ({
        ...a,
        version_id: archivedData.version_id || a.version_id
      }));

      const { error: insertError } = await supabase
        .from('roster_assignments')
        .insert(assignmentsToInsert);

      if (insertError) {
        throw new Error(`Failed to restore assignments: ${insertError.message}`);
      }

      logger.info('Roster restored successfully', {
        month: archivedData.month,
        assignmentCount: parsedAssignments.length
      });

      toast({
        title: "Roster restored successfully",
        description: `Restored ${parsedAssignments.length} assignments for ${archivedData.month}`
      });

      setShowRestoreDialog(false);
      setDetailOpen(false);
    } catch (err) {
      logger.error(new Error('Failed to restore roster'), { error: err });
      toast({
        title: "Restore failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setRestoring(false);
    }
  };

  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const key = assignment.staff_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/reports')}
          title="Back to Reports"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <Archive className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Archived Rosters</h1>
            <p className="text-sm text-muted-foreground">
              View and export previous roster versions
            </p>
          </div>
        </div>
      </div>

      {/* Summary Chart */}
      {!loading && !error && data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Archive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={summary}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Archived Roster History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Loading archived rosters...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 border border-destructive rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No archived rosters found</p>
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Tenant ID</TableHead>
                    <TableHead>Archived At</TableHead>
                    <TableHead>Archived By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((roster) => (
                    <TableRow key={roster.id}>
                      <TableCell className="font-medium">{roster.month}</TableCell>
                      <TableCell>
                        {roster.tenant_id ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {roster.tenant_id.substring(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(roster.archived_at)}</TableCell>
                      <TableCell>
                        {roster.archived_by ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {roster.archived_by.substring(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {roster.reason || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRoster(roster)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Archived Roster Details
            </SheetTitle>
            <SheetDescription>
              {selectedRoster && `${selectedRoster.month} - ${selectedRoster.reason || 'Archived'}`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Metadata */}
            {selectedRoster && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Month:</span>
                  <span>{selectedRoster.month}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Archived By:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {selectedRoster.archived_by?.substring(0, 8) || 'System'}...
                  </code>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Archived At:</span>
                  <span>{formatDate(selectedRoster.archived_at)}</span>
                </div>
                {selectedRoster.tenant_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Tenant ID:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {selectedRoster.tenant_id.substring(0, 12)}...
                    </code>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Assignments ({assignments.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={assignments.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Assignments Table */}
            {loadingDetails && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Loading assignments...</span>
              </div>
            )}

            {!loadingDetails && assignments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No assignments found in this archive
              </div>
            )}

            {!loadingDetails && assignments.length > 0 && (
              <div className="space-y-6">
                {Object.entries(groupedAssignments).map(([staffId, staffAssignments]) => (
                  <div key={staffId} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Staff: <code className="text-xs bg-muted px-2 py-1 rounded">{staffId.substring(0, 8)}...</code>
                      <Badge variant="secondary" className="ml-auto">
                        {staffAssignments.length} shifts
                      </Badge>
                    </h4>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Shift</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staffAssignments.map((assignment, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{assignment.date}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{assignment.shift_code}</Badge>
                              </TableCell>
                              <TableCell>{assignment.hours || '—'}</TableCell>
                              <TableCell className="text-right">
                                {assignment.cost ? `£${assignment.cost.toFixed(2)}` : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Restore Button */}
            {!loadingDetails && assignments.length > 0 && (
              <div className="pt-6 border-t">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => setShowRestoreDialog(true)}
                  disabled={restoring}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore as Active Roster
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Archived Roster?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current active roster for <strong>{selectedRoster?.month}</strong> with this archived version.
              <br /><br />
              • Current active assignments will be permanently deleted
              <br />
              • {assignments.length} archived assignments will be restored
              <br /><br />
              This action cannot be undone. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreRoster}
              disabled={restoring}
              className="bg-primary"
            >
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore Roster'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArchivedRostersReport;
