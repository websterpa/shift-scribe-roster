
import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { WizardStepProps } from './types';

export function WizardStep1({ config, setConfig }: WizardStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Shift Basics</h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Shift Length</Label>
            <RadioGroup
              value={config.shiftType}
              onValueChange={(value: '8h' | '12h') => setConfig(prev => ({ ...prev, shiftType: value, template: '' }))}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="8h" id="8h" />
                <Label htmlFor="8h">8-Hour Shifts</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="12h" id="12h" />
                <Label htmlFor="12h">12-Hour Shifts</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-medium">Operational Window</Label>
            <RadioGroup
              value={config.operationalWindow}
              onValueChange={(value: '16h' | '24h' | 'custom') => setConfig(prev => ({ ...prev, operationalWindow: value }))}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="24h" id="24h" />
                <Label htmlFor="24h">24 Hours (24/7 Operation)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="16h" id="16h" />
                <Label htmlFor="16h">16 Hours (Day/Evening Only)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom Hours</Label>
              </div>
            </RadioGroup>
          </div>

          {config.operationalWindow === 'custom' && (
            <div>
              <Label htmlFor="customHours">Hours per Day</Label>
              <Input
                id="customHours"
                type="number"
                min="8"
                max="24"
                value={config.customHours || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, customHours: parseInt(e.target.value) || undefined }))}
                placeholder="Enter hours per day"
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
