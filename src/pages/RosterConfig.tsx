
import React from 'react';
import { ConfigSelector } from '@/components/config/ConfigSelector';
import { ConfigForm } from '@/components/config/ConfigForm';
import { ConfigHandoverSettings } from '@/components/config/ConfigHandoverSettings';
import { ConfigStaffingRequirements } from '@/components/config/ConfigStaffingRequirements';
import { ConfigPreview } from '@/components/config/ConfigPreview';
import { ConfigActions } from '@/components/config/ConfigActions';
import { useConfigForm } from '@/hooks/useConfigForm';
import { useConfigActions } from '@/hooks/useConfigActions';
import { useNavigate } from 'react-router-dom';

const RosterConfig = () => {
  console.log('🔄 RosterConfig component rendered');
  
  const { configId, formData, setFormData, loading } = useConfigForm();
  const { saving, saveConfig, handleGenerateRoster } = useConfigActions();
  const navigate = useNavigate();

  console.log('📊 RosterConfig form data:', formData);

  const handleConfigSelect = (selectedConfigId: string) => {
    console.log('📂 RosterConfig: Config selected for loading:', selectedConfigId);
    if (selectedConfigId) {
      // Navigate to the same page but with the selected config ID
      navigate(`/roster-config?configId=${selectedConfigId}`);
    }
  };

  if (loading) {
    console.log('⏳ RosterConfig: Showing loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {configId ? 'Edit Configuration' : 'Create Roster Configuration'}
        </h1>
      </div>

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
    </div>
  );
};

export default RosterConfig;
