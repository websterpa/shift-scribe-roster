import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Eye, Download, FileText, Trash, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RosterEditDialog } from '@/components/roster/RosterEditDialog';

interface RosterVersion {
  id: string;
  version_name: string;
  version_number: number;
  generated_at: string;
  config: {
    config_name: string;
    shift_type: string;
    cycle_length_weeks: number;
  } | null;
  assignment_count?: number;
}

const MyRosters = () => {
  const [rosters, setRosters] = useState<RosterVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingRosterId, setDeletingRosterId] = useState<string | null>(null);
  const [editingRoster, setEditingRoster] = useState<RosterVersion | null>(null);

  useEffect(() => {
    loadRosters();
  }, []);

  const loadRosters = async () => {
    try {
      console.log('📊 Loading roster versions...');
      setLoading(true);

      // Fetch roster versions with their configurations
      const { data: versions, error: versionsError } = await supabase
        .from('roster_versions')
        .select(`
          id,
          version_name,
          version_number,
          generated_at,
          config:roster_config(
            config_name,
            shift_type,
            cycle_length_weeks
          )
        `)
        .order('generated_at', { ascending: false });

      if (versionsError) {
        console.error('❌ Error loading roster versions:', versionsError);
        toast({
          title: "Error loading rosters",
          description: versionsError.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Loaded roster versions:', versions?.length || 0);

      // Count assignments for each version
      const rostersWithCounts = await Promise.all(
        (versions || []).map(async (version) => {
          try {
            const { count, error: countError } = await supabase
              .from('roster_assignments')
              .select('*', { count: 'exact', head: true })
              .eq('version_id', version.id);

            if (countError) {
              console.warn('⚠️ Error counting assignments for version:', version.id, countError);
            }

            return {
              ...version,
              assignment_count: count || 0
            };
          } catch (error) {
            console.warn('⚠️ Exception counting assignments for version:', version.id, error);
            return {
              ...version,
              assignment_count: 0
            };
          }
        })
      );

      setRosters(rostersWithCounts);
      console.log('✅ Processed roster data with assignment counts');
    } catch (error: any) {
      console.error('❌ Exception loading rosters:', error);
      toast({
        title: "Error loading rosters",
        description: "Failed to load roster data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewRoster = (roster: RosterVersion) => {
    console.log('👁️ Viewing roster:', roster.version_name);
    window.location.href = `/roster/${roster.id}`;
  };

  const handleEditRoster = (roster: RosterVersion) => {
    console.log('✏️ Editing roster:', roster.version_name);
    setEditingRoster(roster);
  };

  const handleExportRoster = (roster: RosterVersion) => {
    console.log('📄 Exporting roster:', roster.version_name);
    toast({
      title: "Feature coming soon",
      description: "Roster export will be available in the next update",
    });
  };

  const handleDeleteRoster = async (rosterId: string, rosterName: string) => {
    console.log('🗑️ MyRosters: Deleting roster:', rosterId);
    
    try {
      setDeletingRosterId(rosterId);
      
      // First delete all roster assignments for this version
      const { error: assignmentsError } = await supabase
        .from('roster_assignments')
        .delete()
        .eq('version_id', rosterId);
      
      if (assignmentsError) {
        console.error('❌ MyRosters: Error deleting roster assignments:', assignmentsError);
        throw assignmentsError;
      }
      
      // Then delete the roster version
      const { error: versionError } = await supabase
        .from('roster_versions')
        .delete()
        .eq('id', rosterId);
      
      if (versionError) {
        console.error('❌ MyRosters: Error deleting roster version:', versionError);
        throw versionError;
      }
      
      console.log('✅ MyRosters: Roster deleted successfully');
      toast({
        title: "Roster deleted",
        description: `"${rosterName}" has been permanently deleted`,
      });
      
      // Reload rosters
      await loadRosters();
    } catch (error: any) {
      console.error('❌ MyRosters: Exception deleting roster:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete roster. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingRosterId(null);
    }
  };

  const handleRosterUpdated = () => {
    setEditingRoster(null);
    loadRosters(); // Reload the rosters list
  };

  if (loading) {
    return <LoadingState message="Loading your rosters..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Rosters</h1>
        <p className="text-gray-600">
          View, manage, and export your generated shift rosters.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generated Rosters ({rosters.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rosters.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rosters generated yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first roster to see it here. Generated rosters will appear with options to view and export.
              </p>
              <Button onClick={() => window.location.href = '/generate-roster'}>
                <Calendar className="h-4 w-4 mr-2" />
                Generate Your First Roster
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Roster Name</th>
                    <th className="text-left py-3 px-4 font-medium">Configuration</th>
                    <th className="text-left py-3 px-4 font-medium">Version</th>
                    <th className="text-left py-3 px-4 font-medium">Shift Type</th>
                    <th className="text-left py-3 px-4 font-medium">Assignments</th>
                    <th className="text-left py-3 px-4 font-medium">Generated</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rosters.map((roster) => (
                    <tr key={roster.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{roster.version_name}</div>
                      </td>
                      <td className="py-3 px-4">{roster.config?.config_name || 'Unknown'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          v{roster.version_number}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {roster.config?.shift_type || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {roster.assignment_count || 0} assignments
                          {roster.config?.cycle_length_weeks && (
                            <div className="text-xs text-gray-500">
                              {roster.config.cycle_length_weeks} weeks
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {new Date(roster.generated_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRoster(roster)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRoster(roster)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportRoster(roster)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingRosterId === roster.id}
                              >
                                <Trash className="h-4 w-4 mr-1" />
                                {deletingRosterId === roster.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Roster</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{roster.version_name}"? This will permanently remove all shift assignments and data for this roster. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteRoster(roster.id, roster.version_name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Roster
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingRoster && (
        <RosterEditDialog
          roster={editingRoster}
          open={!!editingRoster}
          onClose={() => setEditingRoster(null)}
          onRosterUpdated={handleRosterUpdated}
        />
      )}
    </div>
  );
};

export default MyRosters;
