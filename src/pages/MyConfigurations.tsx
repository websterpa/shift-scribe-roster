
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { fetchAllConfigs } from '@/utils/configHelpers';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Search, Settings, Calendar, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ConfigItem {
  id: string;
  config_name: string;
  cycle_length_weeks: number;
  shift_type: string;
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
  created_at: string;
}

const MyConfigurations = () => {
  console.log('🔄 MyConfigurations component rendered');
  
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingConfigId, setDeletingConfigId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔄 MyConfigurations: useEffect triggered');
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      console.log('📥 MyConfigurations: Loading configurations...');
      setLoading(true);
      const data = await fetchAllConfigs();
      setConfigs(data);
      console.log('✅ MyConfigurations: Loaded configurations:', data.length);
    } catch (error) {
      console.error('❌ MyConfigurations: Error loading configurations:', error);
      toast({
        title: "Error loading configurations",
        description: "Failed to load saved configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfig = async (configId: string, configName: string) => {
    console.log('🗑️ MyConfigurations: Deleting configuration:', configId);
    
    try {
      setDeletingConfigId(configId);
      
      // First, check if there are any rosters using this configuration
      const { data: rosters, error: rostersError } = await supabase
        .from('roster_versions')
        .select('id')
        .eq('config_id', configId);
      
      if (rostersError) {
        console.error('❌ MyConfigurations: Error checking rosters:', rostersError);
        throw rostersError;
      }
      
      // Delete associated rosters and their assignments first
      if (rosters && rosters.length > 0) {
        console.log('🗑️ MyConfigurations: Deleting associated rosters and assignments...');
        
        // Delete roster assignments for all versions
        for (const roster of rosters) {
          const { error: assignmentsError } = await supabase
            .from('roster_assignments')
            .delete()
            .eq('version_id', roster.id);
          
          if (assignmentsError) {
            console.error('❌ MyConfigurations: Error deleting assignments:', assignmentsError);
            throw assignmentsError;
          }
        }
        
        // Delete roster versions
        const { error: versionsError } = await supabase
          .from('roster_versions')
          .delete()
          .eq('config_id', configId);
        
        if (versionsError) {
          console.error('❌ MyConfigurations: Error deleting roster versions:', versionsError);
          throw versionsError;
        }
      }
      
      // Finally, delete the configuration
      const { error } = await supabase
        .from('roster_config')
        .delete()
        .eq('id', configId);
      
      if (error) {
        console.error('❌ MyConfigurations: Error deleting configuration:', error);
        throw error;
      }
      
      console.log('✅ MyConfigurations: Configuration deleted successfully');
      toast({
        title: "Configuration deleted",
        description: `"${configName}" and all associated rosters have been deleted`,
      });
      
      // Reload configurations
      await loadConfigurations();
    } catch (error: any) {
      console.error('❌ MyConfigurations: Exception deleting configuration:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingConfigId(null);
    }
  };

  const handleEditConfig = (configId: string) => {
    console.log('✏️ MyConfigurations: Editing config:', configId);
    navigate(`/roster-config?configId=${configId}`);
  };

  const handleGenerateWithConfig = (configId: string) => {
    console.log('🚀 MyConfigurations: Generating roster with config:', configId);
    navigate(`/generate-roster?configId=${configId}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('🔍 MyConfigurations: Search term changed:', value);
    setSearchTerm(value);
  };

  const handleCreateNew = () => {
    console.log('➕ MyConfigurations: Creating new configuration');
    navigate('/roster-config');
  };

  const filteredConfigs = configs.filter(config =>
    config.config_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('📊 MyConfigurations: Filtered configs:', filteredConfigs.length, 'of', configs.length);

  if (loading) {
    console.log('⏳ MyConfigurations: Showing loading state');
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Configurations</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading configurations...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Configurations</h1>
        <Button onClick={handleCreateNew}>
          <Settings className="h-4 w-4 mr-2" />
          Create New Configuration
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Saved Roster Configurations
          </CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search configurations..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredConfigs.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No configurations match your search' : 'No saved configurations found'}
              </p>
              <Button onClick={handleCreateNew}>
                Create Your First Configuration
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Configuration Name</th>
                    <th className="text-left py-3 px-4 font-medium">Cycle Length</th>
                    <th className="text-left py-3 px-4 font-medium">Shift Type</th>
                    <th className="text-left py-3 px-4 font-medium">Operational Hours</th>
                    <th className="text-left py-3 px-4 font-medium">Start Date</th>
                    <th className="text-left py-3 px-4 font-medium">Created</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConfigs.map((config) => (
                    <tr key={config.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{config.config_name}</td>
                      <td className="py-3 px-4">{config.cycle_length_weeks} weeks</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {config.shift_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">{config.operational_hours_per_day}h/day</td>
                      <td className="py-3 px-4">
                        {new Date(config.start_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(config.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditConfig(config.id)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateWithConfig(config.id)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Generate Roster
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingConfigId === config.id}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {deletingConfigId === config.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{config.config_name}"? This will also delete all rosters generated from this configuration. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteConfig(config.id, config.config_name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Configuration
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
    </div>
  );
};

export default MyConfigurations;
