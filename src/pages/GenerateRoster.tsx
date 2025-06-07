
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/loading-state';
import { Settings, Calendar, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useRosterGeneration } from '@/hooks/useRosterGeneration';

const GenerateRoster = () => {
  console.log('🔄 GenerateRoster component rendered');
  
  const {
    configs,
    selectedConfigId,
    selectedConfig,
    rosterName,
    staffList,
    isGenerating,
    isLoading,
    generatedVersionId,
    errors,
    setSelectedConfigId,
    setRosterName,
    handleGenerateRoster,
    refreshData
  } = useRosterGeneration(null);

  console.log('📊 GenerateRoster state:', {
    configsCount: configs.length,
    selectedConfigId,
    selectedConfig: selectedConfig?.config_name,
    rosterName,
    staffCount: staffList.length,
    isGenerating,
    isLoading,
    generatedVersionId,
    errors
  });

  const handleButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🚀 Generate Roster button clicked!');
    console.log('🛠️ GenerateRoster click, config:', selectedConfig?.config_name, 'versionName:', rosterName);
    console.log('📋 Staff list:', staffList.length, 'members');
    
    try {
      console.log('📞 Calling handleGenerateRoster...');
      await handleGenerateRoster();
      console.log('✅ handleGenerateRoster completed successfully');
    } catch (error) {
      console.error('❌ Error in handleButtonClick:', error);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading roster configuration data..." />;
  }

  // Safe check for canGenerate
  const canGenerate = Boolean(selectedConfig && rosterName && rosterName.trim() && staffList.length > 0 && !isGenerating);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Generate Roster</h1>
        <p className="text-gray-600">
          Create optimized shift schedules based on your configuration and staff availability.
        </p>
      </div>
      
      {/* Debug Information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 text-sm flex items-center justify-between">
            Debug Information
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-blue-700">
          <div>Configs loaded: {configs.length}</div>
          <div>Staff members: {staffList.length}</div>
          <div>Selected config: {selectedConfig?.config_name || 'None'}</div>
          <div>Roster name: {rosterName || 'Empty'}</div>
          <div>Is generating: {String(isGenerating)}</div>
          <div>Can generate: {String(canGenerate)}</div>
          {generatedVersionId && <div>Generated version ID: {generatedVersionId}</div>}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Generation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config">Select Configuration:</Label>
            <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a configuration..." />
              </SelectTrigger>
              <SelectContent>
                {configs.length === 0 ? (
                  <SelectItem value="no-configs" disabled>
                    No configurations available
                  </SelectItem>
                ) : (
                  configs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.config_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {configs.length === 0 && (
              <p className="text-sm text-gray-500">
                No configurations found. Create one in Roster Config first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rosterName">
              Roster Name: <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rosterName"
              type="text"
              placeholder="e.g. June 2025 Month 1"
              value={rosterName}
              onChange={(e) => setRosterName(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">This name will be saved with your roster version</p>
          </div>

          {/* Error Messages */}
          {Object.entries(errors).map(([key, message]) => (
            message && (
              <div key={key} className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {message}
                </p>
              </div>
            )
          ))}

          {/* Success Message */}
          {generatedVersionId && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Roster generated successfully! Version ID: {generatedVersionId}
              </p>
            </div>
          )}

          {/* Validation Warnings */}
          {staffList.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                No staff members found. Add staff members first.
              </p>
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={handleButtonClick}
            disabled={!canGenerate}
            type="button"
          >
            {isGenerating ? (
              <>
                <LoadingState size="sm" spinnerOnly className="mr-2" />
                Generating Roster...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Generate Roster
              </>
            )}
          </Button>

          {/* Helper Text */}
          {!canGenerate && (
            <div className="text-xs text-gray-500">
              {isGenerating && "Please wait while the roster is being generated..."}
              {!isGenerating && !selectedConfig && "Please select a configuration first."}
              {!isGenerating && selectedConfig && !rosterName.trim() && "Please enter a roster name."}
              {!isGenerating && selectedConfig && rosterName.trim() && staffList.length === 0 && "No staff members available for roster generation."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateRoster;
