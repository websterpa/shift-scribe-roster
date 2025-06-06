
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Eye, FileText, RefreshCcw, Loader2 } from 'lucide-react';
import { continueRoster } from '@/utils/roster/continueRoster';

interface RosterVersion {
  id: string;
  version_name: string | null;
  version_number: number;
  generated_at: string;
  config_id: string;
  roster_config: {
    config_name: string;
  } | null;
}

const MyRosters = () => {
  const [rosters, setRosters] = useState<RosterVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [continuingRoster, setContinuingRoster] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadRosters();
  }, []);

  const loadRosters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('roster_versions')
        .select(`
          id,
          version_name,
          version_number,
          generated_at,
          config_id,
          roster_config (
            config_name
          )
        `)
        .order('generated_at', { ascending: false });

      if (error) {
        console.error('Error loading rosters:', error);
        throw error;
      }

      setRosters(data || []);
      console.log('Loaded roster versions:', data?.length || 0);
    } catch (error) {
      console.error('Error loading rosters:', error);
      toast({
        title: "Error loading rosters",
        description: "Failed to load saved rosters",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewRoster = (rosterId: string) => {
    navigate(`/roster-view/${rosterId}`);
  };

  const handleContinueRoster = async (configId: string) => {
    try {
      setContinuingRoster(configId);
      console.log('Continuing roster for config:', configId);
      
      const newVersionId = await continueRoster(configId);
      
      console.log('Successfully continued roster:', newVersionId);
      toast({
        title: "Roster continued successfully",
        description: "A new roster version has been generated continuing the pattern",
      });
      
      // Refresh the roster list to show the new version
      await loadRosters();
      
    } catch (error: any) {
      console.error('Error continuing roster:', error);
      toast({
        title: "Failed to continue roster",
        description: error?.message || "Failed to continue the roster pattern",
        variant: "destructive",
      });
    } finally {
      setContinuingRoster(null);
    }
  };

  const filteredRosters = rosters.filter(roster =>
    (roster.version_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (roster.roster_config?.config_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Rosters</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading rosters...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Rosters</h1>
        <Button onClick={() => navigate('/roster-config')}>
          <Calendar className="h-4 w-4 mr-2" />
          Generate New Roster
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generated Roster Versions
          </CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search rosters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredRosters.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No rosters match your search' : 'No rosters generated yet'}
              </p>
              <Button onClick={() => navigate('/roster-config')}>
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
                    <th className="text-left py-3 px-4 font-medium">Generated Date</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRosters.map((roster) => (
                    <tr key={roster.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        {roster.version_name || `Version ${roster.version_number}`}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {roster.roster_config?.config_name || 'Unknown Config'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        v{roster.version_number}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(roster.generated_at).toLocaleDateString()} {new Date(roster.generated_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRoster(roster.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleContinueRoster(roster.config_id)}
                            disabled={continuingRoster === roster.config_id}
                          >
                            {continuingRoster === roster.config_id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Continuing...
                              </>
                            ) : (
                              <>
                                <RefreshCcw className="h-4 w-4 mr-1" />
                                Continue Pattern
                              </>
                            )}
                          </Button>
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

export default MyRosters;
