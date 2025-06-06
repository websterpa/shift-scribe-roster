
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Settings } from 'lucide-react';
import { RosterGenerationSettings } from '@/components/roster/RosterGenerationSettings';
import { MultiWeekRoster } from '@/components/roster/MultiWeekRoster';
import { useRosterGeneration } from '@/hooks/useRosterGeneration';
import { LoadingState } from '@/components/ui/loading-state';

const GenerateRoster = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const configIdFromUrl = searchParams.get('configId');
  
  const {
    configs,
    selectedConfigId,
    selectedConfig,
    rosterName,
    staffList,
    isGenerating,
    isLoading,
    setSelectedConfigId,
    setRosterName,
    handleGenerateRoster
  } = useRosterGeneration(configIdFromUrl);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Generate Roster</h1>
        <LoadingState message="Loading roster data..." />
      </div>
    );
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RosterGenerationSettings
            configs={configs}
            selectedConfig={selectedConfig}
            selectedConfigId={selectedConfigId}
            rosterName={rosterName}
            staffCount={staffList.length}
            isGenerating={isGenerating}
            onSelectConfig={setSelectedConfigId}
            onRosterNameChange={setRosterName}
            onGenerateRoster={handleGenerateRoster}
          />
        </div>

        <div className="lg:col-span-2">
          {selectedConfig && (
            <MultiWeekRoster 
              staffList={staffList}
              config={selectedConfig}
              showWeeks={selectedConfig.cycle_length_weeks || 4}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateRoster;
