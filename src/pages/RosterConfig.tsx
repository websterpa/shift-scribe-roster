
import React from 'react';
import { ConfigSelector } from '@/components/config/ConfigSelector';
import { ConfigForm } from '@/components/config/ConfigForm';
import { ConfigHandoverSettings } from '@/components/config/ConfigHandoverSettings';
import { ConfigStaffingRequirements } from '@/components/config/ConfigStaffingRequirements';
import { ConfigPreview } from '@/components/config/ConfigPreview';
import { ConfigActions } from '@/components/config/ConfigActions';
import RosterSettings from '@/components/roster/RosterSettings';
import { useConfigForm } from '@/hooks/useConfigForm';
import { useConfigActions } from '@/hooks/useConfigActions';
import { useNavigate, useSearchParams } from 'react-router-dom';

const RosterConfig = () => {
  console.log('🔄 RosterConfig component rendered');
  
  const { configId, formData, setFormData, loading } = useConfigForm();
  const { saving, saveConfig, handleGenerateRoster } = useConfigActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  console.log('📊 RosterConfig form data:', formData);

  const handleConfigSelect = (selectedConfigId: string) => {
    console.log('📂 RosterConfig: Config selected for loading:', selectedConfigId);
    if (selectedConfigId) {
      // Navigate to the same page but with the selected config ID
      navigate(`/roster-config?configId=${selectedConfigId}`);
    }
  };

  const handleSaveConfiguration = (config: any) => {
    console.log('💾 RosterConfig: Configuration saved from RosterSettings:', config);
    // Update form data with the config from RosterSettings
    setFormData({
      ...formData,
      config_name: config.config_name || formData.config_name,
      cycle_length_weeks: config.cycle_length_weeks,
      shift_type: config.shift_type,
      operational_hours_per_day: config.operational_hours_per_day,
      handshake_minutes: config.handshake_minutes,
      start_date: config.start_date
    });
    
    // Navigate to configurations page after successful save
    navigate('/my-configurations');
  };

  if (loading) {
    console.log('⏳ RosterConfig: Showing loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading configuration...</div>
      </div>
    );
  }

  // Check if we should show the RosterSettings component (when configId is present or creating new)
  const showRosterSettings = configId || searchParams.has('action');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {configId ? 'Edit Configuration' : 'Create Roster Configuration'}
        </h1>
      </div>

      {showRosterSettings ? (
        // Show the comprehensive RosterSettings component when editing or creating
        <RosterSettings
          onSaveConfig={handleSaveConfiguration}
          defaultCycle={formData.cycle_length_weeks}
          defaultShift={formData.shift_type}
          defaultOpsHours={formData.operational_hours_per_day}
          defaultHandshake={formData.handshake_minutes}
        />
      ) : (
        // Show the original component layout for overview/selection
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ConfigSelector 
              currentConfigId={configId} 
              onConfigSelect={handleConfigSelect}
            />
            <ConfigForm formData={formData} onFormDataChange={setFormData} />
            <ConfigHandoverSettings formData={formData} onFormDataChange={setFormData} />
            <ConfigStaffingRequirements formData={formData} onFormDataChange={setFormData} />
            <ConfigActions 
              saving={saving}
              configId={configId}
              onSave={() => saveConfig(formData)}
              onGenerateRoster={() => handleGenerateRoster(formData)}
            />
          </div>
          
          <div className="space-y-6">
            <ConfigPreview formData={formData} />
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterConfig;
