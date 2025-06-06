
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Settings } from 'lucide-react';
import { RosterGenerationSettings } from '@/components/roster/RosterGenerationSettings';
import { MultiWeekRoster } from '@/components/roster/MultiWeekRoster';
import { useRosterGeneration } from '@/hooks/useRosterGeneration';
import { LoadingState } from '@/components/ui/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';

const GenerateRoster = () => {
  console.log('Rendering GenerateRoster page');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const configIdFromUrl = searchParams.get('configId');
  console.log('Config ID from URL:', configIdFromUrl);
  
  const {
    configs,
    selectedConfigId,
    selectedConfig,
    rosterName,
    staffList,
    isGenerating,
    isLoading,
    errors,
    setSelectedConfigId,
    setRosterName,
    handleGenerateRoster,
    refreshData
  } = useRosterGeneration(configIdFromUrl);

  if (isLoading) {
    console.log('GenerateRoster is in loading state');
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Generate Roster</h1>
        <LoadingState message="Loading roster data..." />
      </div>
    );
  }

  console.log('GenerateRoster loaded', { 
    configsCount: configs.length,
    selectedConfig: selectedConfig?.config_name,
    staffCount: staffList.length,
    hasErrors: Object.keys(errors || {}).length > 0
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Generate Roster</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/my-configurations')}>
            <Settings className="h-4 w-4 mr-2" />
            My Configurations
          </Button>
          <Button variant="outline" onClick={() => navigate('/my-rosters')}>
            <Calendar className="h-4 w-4 mr-2" />
            My Rosters
          </Button>
        </div>
      </div>

      {errors?.general && (
        <Alert variant="destructive">
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RosterGenerationSettings
            configs={configs}
            selectedConfig={selectedConfig}
            selectedConfigId={selectedConfigId}
            rosterName={rosterName}
            staffCount={staffList.length}
            isGenerating={isGenerating}
            errors={errors}
            onSelectConfig={setSelectedConfigId}
            onRosterNameChange={setRosterName}
            onGenerateRoster={handleGenerateRoster}
            onRefresh={refreshData}
          />
        </div>

        <div className="lg:col-span-2">
          {selectedConfig ? (
            <MultiWeekRoster 
              staffList={staffList}
              config={selectedConfig}
              showWeeks={selectedConfig.cycle_length_weeks || 4}
            />
          ) : (
            <Card className="h-full flex items-center justify-center p-6 bg-gray-50">
              <p className="text-gray-500">Select a configuration to preview the roster</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateRoster;
