
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';
import { ConfigFormData } from '@/hooks/useConfigForm';

interface ConfigFormProps {
  formData: ConfigFormData;
  onFormDataChange: (data: ConfigFormData) => void;
}

export const ConfigForm = ({ formData, onFormDataChange }: ConfigFormProps) => {
  console.log('🔄 ConfigForm component rendered');

  const handleFieldChange = (field: keyof ConfigFormData, value: any) => {
    console.log(`📝 ConfigForm: ${field} changed:`, value);
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Configuration Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="config_name">Configuration Name</Label>
          <Input
            id="config_name"
            value={formData.config_name}
            onChange={(e) => handleFieldChange('config_name', e.target.value)}
            placeholder="e.g. CCTV Control Room Standard"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cycle_length">Cycle Length (weeks)</Label>
          <Select 
            value={formData.cycle_length_weeks.toString()} 
            onValueChange={(value) => handleFieldChange('cycle_length_weeks', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 weeks</SelectItem>
              <SelectItem value="4">4 weeks</SelectItem>
              <SelectItem value="6">6 weeks</SelectItem>
              <SelectItem value="8">8 weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shift_type">Shift Type</Label>
          <Select 
            value={formData.shift_type} 
            onValueChange={(value: '8h' | '12h') => handleFieldChange('shift_type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8h">8 Hour Shifts</SelectItem>
              <SelectItem value="12h">12 Hour Shifts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="site_start_time">Site Start Time</Label>
          <Input
            id="site_start_time"
            type="time"
            value={formData.site_start_time}
            onChange={(e) => handleFieldChange('site_start_time', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select 
            value={formData.timezone} 
            onValueChange={(value) => handleFieldChange('timezone', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Europe/London">Europe/London</SelectItem>
              <SelectItem value="America/New_York">America/New_York</SelectItem>
              <SelectItem value="America/Chicago">America/Chicago</SelectItem>
              <SelectItem value="America/Denver">America/Denver</SelectItem>
              <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
              <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
              <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
              <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
              <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
              <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
              <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="operational_hours">Operational Hours per Day</Label>
          <Input
            id="operational_hours"
            type="number"
            value={formData.operational_hours_per_day}
            onChange={(e) => handleFieldChange('operational_hours_per_day', parseInt(e.target.value) || 24)}
            min="1"
            max="24"
          />
        </div>
      </CardContent>
    </Card>
  );
};
