import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Archive, Eye, AlertCircle, Loader2, Download, Calendar, User, RotateCcw, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/errorLogger';
import { toast } from '@/hooks/use-toast';
import { utils, writeFile } from 'xlsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTenant } from '@/features/tenant/useTenant';

const logger = createLogger('ArchivedRostersReport');

interface RosterVersion {
  id: string;
  tenant_id: string | null;
  config_id: string;
  version_number: number;
  label: string | null;
  generated_at: string;
  config: {
    config_name: string;
  } | null;
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
  const { tenantId, loading: tenantLoading } = useTenant();
  const [data, setData] = useState<RosterVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoster, setSelectedRoster] = useState<RosterVersion | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (tenantLoading || !tenantId) return;

    const fetchRosterVersions = async () => {
      try {
        logger.info('Fetching roster versions', { tenantId });
        
        const { data: versionsData, error: fetchError } = await supabase
          .from('roster_versions')
          .select(`
            id,
            tenant_id,
            config_id,
            version_number,
            label,
            generated_at,
            config:config_id(config_name)
          `)
          .eq('tenant_id', tenantId)
          .order('generated_at', { ascending: false });

        if (fetchError) {
          logger.error(new Error('Failed to fetch roster versions'), { error: fetchError });
          setError(fetchError.message);
          return;
        }

        setData(versionsData || []);
        logger.info('Roster versions fetched successfully', { count: versionsData?.length || 0 });
      } catch (err) {
        logger.error(new Error('Unexpected error fetching roster versions'), { error: err });
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRosterVersions();
  }, [tenantId, tenantLoading]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Compute summary for chart - group by month
  const summary = data.reduce((acc, r) => {
    const monthKey = new Date(r.generated_at).toISOString().substring(0, 7); // YYYY-MM
    const existing = acc.find(i => i.month === monthKey);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ month: monthKey, count: 1, generatedAt: r.generated_at });
    }
    return acc;
  }, [] as Array<{ month: string; count: number; generatedAt: string }>)
    .sort((a, b) => a.month.localeCompare(b.month));

  const handleViewRoster = async (roster: RosterVersion) => {
    setSelectedRoster(roster);
    setDetailOpen(true);
    setLoadingDetails(true);

    try {
      logger.info('Fetching roster version assignments', { versionId: roster.id });

      const { data: assignmentsData, error: fetchError } = await supabase
        .from('roster_assignments')
        .select('*')
        .eq('version_id', roster.id)
        .order('date', { ascending: true });

      if (fetchError) {
        logger.error(new Error('Failed to fetch assignments'), { error: fetchError });
        toast({
          title: "Error loading assignments",
          description: fetchError.message,
          variant: "destructive"
        });
        return;
      }

      setAssignments(assignmentsData || []);
      logger.info('Assignments loaded', { assignmentCount: assignmentsData?.length || 0 });
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

    const exportData = assignments.map(a => ({
      staff_id: a.staff_id,
      date: a.date,
      shift_code: a.shift_code,
      hours: a.hours || 8,
      cost: a.cost || 0
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Roster');
    const filename = `Roster_v${selectedRoster.version_number}_${selectedRoster.label || 'export'}.xlsx`;
    writeFile(wb, filename);

    toast({
      title: "Roster exported successfully",
      description: `Exported ${assignments.length} assignments to Excel file`
    });
  };

  const handleRestoreRoster = async () => {
    if (!selectedRoster || !tenantId) return;

    setRestoring(true);
    try {
      logger.info('Duplicating roster version', { versionId: selectedRoster.id });

      if (assignments.length === 0) {
        throw new Error('No assignments found in this version');
      }

      // Get the config for this version
      const { data: configData, error: configError } = await supabase
        .from('roster_config')
        .select('*')
        .eq('id', selectedRoster.config_id)
        .single();

      if (configError || !configData) {
        throw new Error('Failed to fetch configuration');
      }

      // Get the next version number
      const { data: existingVersions } = await supabase
        .from('roster_versions')
        .select('version_number')
        .eq('config_id', selectedRoster.config_id)
        .eq('tenant_id', tenantId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = existingVersions && existingVersions.length > 0
        ? existingVersions[0].version_number + 1
        : 1;

      // Create new version
      const { data: newVersion, error: versionError } = await supabase
        .from('roster_versions')
        .insert({
          tenant_id: tenantId,
          config_id: selectedRoster.config_id,
          version_number: nextVersion,
          label: `Copy of ${selectedRoster.label || `v${selectedRoster.version_number}`}`
        })
        .select()
        .single();

      if (versionError || !newVersion) {
        throw new Error(`Failed to create new version: ${versionError?.message}`);
      }

      // Duplicate assignments
      const newAssignments = assignments.map(a => ({
        version_id: newVersion.id,
        tenant_id: tenantId,
        staff_id: a.staff_id,
        date: a.date,
        shift_code: a.shift_code,
        shift_start: a.shift_start,
        shift_end: a.shift_end,
        hours: a.hours,
        cost: a.cost
      }));

      const { error: insertError } = await supabase
        .from('roster_assignments')
        .insert(newAssignments);

      if (insertError) {
        throw new Error(`Failed to duplicate assignments: ${insertError.message}`);
      }

      logger.info('Roster version duplicated successfully', {
        oldVersion: selectedRoster.version_number,
        newVersion: nextVersion,
        assignmentCount: newAssignments.length
      });

      toast({
        title: "Roster duplicated successfully",
        description: `Created new version ${nextVersion} with ${newAssignments.length} assignments`
      });

      setShowRestoreDialog(false);
      setDetailOpen(false);
      
      // Refresh the list
      window.location.reload();
    } catch (err) {
      logger.error(new Error('Failed to duplicate roster'), { error: err });
      toast({
        title: "Duplication failed",
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
          <History className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Roster Version History</h1>
            <p className="text-sm text-muted-foreground">
              View and manage all saved roster versions for your organization
            </p>
          </div>
        </div>
      </div>

      {/* Summary Chart */}
      {!loading && !error && data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Version History Overview</CardTitle>
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
          <CardTitle>Saved Roster Versions</CardTitle>
        </CardHeader>
        <CardContent>
          {(loading || tenantLoading) && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Loading roster versions...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 border border-destructive rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          )}

          {!loading && !tenantLoading && !error && data.length === 0 && (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No roster versions found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Generate your first roster to see it here
              </p>
            </div>
          )}

          {!loading && !tenantLoading && !error && data.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((version) => (
                    <TableRow key={version.id}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">v{version.version_number}</Badge>
                      </TableCell>
                      <TableCell>{version.label || 'Untitled'}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {version.config?.config_name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(version.generated_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRoster(version)}
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
              <History className="h-5 w-5" />
              Roster Version Details
            </SheetTitle>
            <SheetDescription>
              {selectedRoster && `Version ${selectedRoster.version_number} - ${selectedRoster.label || 'Untitled'}`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Metadata */}
            {selectedRoster && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">Version {selectedRoster.version_number}</Badge>
                  <span className="font-medium">{selectedRoster.label || 'Untitled'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Generated:</span>
                  <span>{formatDate(selectedRoster.generated_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Configuration:</span>
                  <span>{selectedRoster.config?.config_name || 'Unknown'}</span>
                </div>
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
                  Duplicate as New Version
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
            <AlertDialogTitle>Duplicate Roster Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new roster version based on <strong>v{selectedRoster?.version_number}</strong> ({selectedRoster?.label || 'Untitled'}).
              <br /><br />
              • {assignments.length} assignments will be copied to the new version
              <br />
              • Original version will remain unchanged
              <br /><br />
              This is useful for creating variations of existing rosters.
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
                  Duplicating...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Duplicate Version
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArchivedRostersReport;
