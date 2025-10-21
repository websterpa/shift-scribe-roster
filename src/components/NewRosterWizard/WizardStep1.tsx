
import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Moon, Sun, Sunset } from 'lucide-react';
import { WizardStepProps } from './types';

export function WizardStep1({ config, setConfig }: WizardStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Shift Framework Selection</h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium mb-3 block">Shift System</Label>
            <RadioGroup
              value={config.shiftType}
              onValueChange={(value: '8h' | '12h') => setConfig(prev => ({ ...prev, shiftType: value, template: '' }))}
              className="gap-4"
            >
              <Card className={`cursor-pointer transition-all ${config.shiftType === '8h' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="8h" id="8h" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="8h" className="cursor-pointer text-base font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        8-Hour Shifts
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Three shift types covering 24 hours
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Badge variant="secondary" className="gap-1">
                          <Sun className="h-3 w-3" /> E - Early (06:00-14:00)
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Sunset className="h-3 w-3" /> L - Late (14:00-22:00)
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Moon className="h-3 w-3" /> N - Night (22:00-06:00)
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${config.shiftType === '12h' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="12h" id="12h" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="12h" className="cursor-pointer text-base font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        12-Hour Shifts
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Two shift types covering 24 hours
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Badge variant="secondary" className="gap-1">
                          <Sun className="h-3 w-3" /> D - Day (06:00-18:00)
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Moon className="h-3 w-3" /> N - Night (18:00-06:00)
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
