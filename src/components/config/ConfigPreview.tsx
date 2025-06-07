
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfigFormData } from '@/hooks/useConfigForm';

interface ConfigPreviewProps {
  formData: ConfigFormData;
}

export const ConfigPreview = ({ formData }: ConfigPreviewProps) => {
  console.log('🔄 ConfigPreview component rendered');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
          <div><strong>Name:</strong> {formData.config_name || 'Unnamed Configuration'}</div>
          <div><strong>Cycle:</strong> {formData.cycle_length_weeks} weeks</div>
          <div><strong>Shifts:</strong> {formData.shift_type}</div>
          <div><strong>Daily Hours:</strong> {formData.operational_hours_per_day} hours</div>
          <div><strong>Handover:</strong> {formData.handshake_minutes} minutes</div>
          <div><strong>Start Date:</strong> {formData.start_date || 'Not set'}</div>
        </div>
      </CardContent>
    </Card>
  );
};
