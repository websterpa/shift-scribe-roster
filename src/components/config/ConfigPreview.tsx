
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfigFormData } from '@/hooks/useConfigForm';

interface ConfigPreviewProps {
  formData: ConfigFormData;
}

export const ConfigPreview = ({ formData }: ConfigPreviewProps) => {
  console.log('🔄 ConfigPreview component rendered');

  const staffingRequirements = formData.staffing_requirements || {};

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
        
        <div className="p-3 bg-blue-50 rounded-lg space-y-2">
          <div className="font-medium text-blue-900">Staffing Requirements</div>
          {formData.shift_type === '12h' ? (
            <>
              <div className="text-sm"><strong>Day Shift:</strong> {staffingRequirements.day_shift_staff || 2} staff</div>
              <div className="text-sm"><strong>Night Shift:</strong> {staffingRequirements.night_shift_staff || 2} staff</div>
            </>
          ) : (
            <>
              <div className="text-sm"><strong>Early Shift:</strong> {staffingRequirements.early_shift_staff || 1} staff</div>
              <div className="text-sm"><strong>Late Shift:</strong> {staffingRequirements.late_shift_staff || 1} staff</div>
              <div className="text-sm"><strong>Night Shift:</strong> {staffingRequirements.night_shift_staff || 1} staff</div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
