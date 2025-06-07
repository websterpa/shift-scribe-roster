
import React from 'react';
import { ConfigForm } from '@/components/config/ConfigForm';
import { ConfigHandoverSettings } from '@/components/config/ConfigHandoverSettings';
import { ConfigStaffingRequirements } from '@/components/config/ConfigStaffingRequirements';
import { ConfigPreview } from '@/components/config/ConfigPreview';
import { ConfigActions } from '@/components/config/ConfigActions';
import { useConfigForm } from '@/hooks/useConfigForm';
import { useConfigActions } from '@/hooks/useConfigActions';

const RosterConfig = () => {
  console.log('🔄 RosterConfig component rendered');
  
  const { configId, formData, setFormData, loading } = useConfigForm();
  const { saving, saveConfig, handleGenerateRoster } = useConfigActions();

  console.log('📊 RosterConfig form data:', formData);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
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
