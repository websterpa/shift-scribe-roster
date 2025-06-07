
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Plus } from 'lucide-react';

interface ConfigActionsProps {
  saving: boolean;
  configId: string | null;
  onSave: () => void;
  onGenerateRoster: () => void;
}

export const ConfigActions = ({ saving, configId, onSave, onGenerateRoster }: ConfigActionsProps) => {
  console.log('🔄 ConfigActions component rendered');

  return (
    <div className="flex gap-2 pt-4">
      <Button 
        onClick={() => {
          console.log('💾 ConfigActions: Save Config button clicked');
          onSave();
        }}
        disabled={saving}
        className="flex-1"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : (configId ? 'Update Configuration' : 'Save Configuration')}
      </Button>

      <Button 
        onClick={() => {
          console.log('🚀 ConfigActions: Generate Roster button clicked');
          onGenerateRoster();
        }}
        disabled={saving}
        variant="outline"
        className="flex-1"
      >
        <Plus className="w-4 h-4 mr-2" />
        Generate Roster
      </Button>
    </div>
  );
};
