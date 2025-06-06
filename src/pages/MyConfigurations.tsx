
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchAllConfigs } from '@/utils/configHelpers';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Search, Settings, Calendar, Clock, Edit } from 'lucide-react';

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
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const data = await fetchAllConfigs();
      setConfigs(data);
      console.log('Loaded configurations:', data.length);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast({
        title: "Error loading configurations",
        description: "Failed to load saved configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadConfig = (configId: string) => {
    navigate(`/roster-config?configId=${configId}`);
  };

  const handleEditConfig = (configId: string) => {
    navigate(`/roster-config?configId=${configId}`);
  };

  const handleGenerateWithConfig = (configId: string) => {
    navigate(`/roster-config?configId=${configId}&action=generate`);
  };

  const filteredConfigs = configs.filter(config =>
    config.config_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
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
        <Button onClick={() => navigate('/roster-config')}>
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <Button onClick={() => navigate('/roster-config')}>
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
