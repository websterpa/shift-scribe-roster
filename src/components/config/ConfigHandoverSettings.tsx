
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ConfigFormData } from '@/hooks/useConfigForm';

interface ConfigHandoverSettingsProps {
  formData: ConfigFormData;
  onFormDataChange: (data: ConfigFormData) => void;
}

export const ConfigHandoverSettings = ({ formData, onFormDataChange }: ConfigHandoverSettingsProps) => {
  console.log('🔄 ConfigHandoverSettings component rendered');

  const handleHandshakeChange = (value: string) => {
    const numValue = Number(value) as 0 | 15 | 30 | 45 | 60;
    console.log('🤝 ConfigHandoverSettings: Handshake minutes changed:', numValue);
    onFormDataChange({ ...formData, handshake_minutes: numValue });
  };

  const handleStartDateChange = (value: string) => {
    console.log('📅 ConfigHandoverSettings: Start date changed:', value);
    onFormDataChange({ ...formData, start_date: value });
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="handshake_minutes">Handover Time</Label>
        <Select 
          value={formData.handshake_minutes.toString()} 
          onValueChange={handleHandshakeChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">No handover (0 minutes)</SelectItem>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="45">45 minutes</SelectItem>
            <SelectItem value="60">60 minutes</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Time for shift handover between operators</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="start_date">Start Date</Label>
        <Input
          id="start_date"
          type="date"
          value={formData.start_date}
          onChange={(e) => handleStartDateChange(e.target.value)}
        />
      </div>
    </>
  );
};
