
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings, Plus, FileText } from 'lucide-react';
import { fetchAllConfigs } from '@/utils/configHelpers';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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

interface ConfigSelectorProps {
  currentConfigId?: string | null;
  onConfigSelect: (configId: string) => void;
}

export const ConfigSelector = ({ currentConfigId, onConfigSelect }: ConfigSelectorProps) => {
  console.log('🔄 ConfigSelector component rendered');
  
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfigId, setSelectedConfigId] = useState<string>(currentConfigId || '');
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔄 ConfigSelector: useEffect triggered');
    loadConfigurations();
  }, []);

  useEffect(() => {
    if (currentConfigId) {
      setSelectedConfigId(currentConfigId);
    }
  }, [currentConfigId]);

  const loadConfigurations = async () => {
    try {
      console.log('📥 ConfigSelector: Loading configurations...');
      setLoading(true);
      const data = await fetchAllConfigs();
      setConfigs(data);
      console.log('✅ ConfigSelector: Loaded configurations:', data.length);
    } catch (error) {
      console.error('❌ ConfigSelector: Error loading configurations:', error);
      toast({
        title: "Error loading configurations",
        description: "Failed to load saved configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (configId: string) => {
    console.log('📂 ConfigSelector: Configuration selected:', configId);
    setSelectedConfigId(configId);
    onConfigSelect(configId);
  };

  const handleCreateNew = () => {
    console.log('➕ ConfigSelector: Creating new configuration');
    setSelectedConfigId('');
    navigate('/roster-config');
  };

  if (loading) {
    console.log('⏳ ConfigSelector: Showing loading state');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Load Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading configurations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Load Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="config-select">Select Existing Configuration</Label>
          <Select 
            value={selectedConfigId} 
            onValueChange={handleConfigChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a saved configuration..." />
            </SelectTrigger>
            <SelectContent>
              {configs.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <div>
                      <div className="font-medium">{config.config_name}</div>
                      <div className="text-xs text-gray-500">
                        {config.shift_type} • {config.cycle_length_weeks} weeks • Created {new Date(config.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        <Button 
          onClick={handleCreateNew}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Configuration
        </Button>

        {configs.length === 0 && (
          <div className="text-center py-4">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No saved configurations found</p>
            <Button onClick={handleCreateNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Configuration
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
