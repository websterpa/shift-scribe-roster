
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { WizardStepProps, StaffingRequirements } from './types';

export function WizardStep2({ config, setConfig, staffList }: WizardStepProps) {
  const updateStaffingRequirement = (field: keyof StaffingRequirements, value: number) => {
    setConfig(prev => ({
      ...prev,
      staffingRequirements: {
        ...prev.staffingRequirements,
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Staff & Cycle Configuration</h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="staffCount" className="text-base font-medium">Number of Staff</Label>
              <Input
                id="staffCount"
                type="number"
                min="1"
                max={staffList.length}
                value={config.staffCount}
                onChange={(e) => setConfig(prev => ({ ...prev, staffCount: parseInt(e.target.value) || 0 }))}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Available: {staffList.length} staff members
              </p>
            </div>

            <div>
              <Label htmlFor="cycleLength" className="text-base font-medium">Cycle Length (Days)</Label>
              <Select value={config.cycleLength.toString()} onValueChange={(value) => setConfig(prev => ({ ...prev, cycleLength: parseInt(value) }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days (1 Week)</SelectItem>
                  <SelectItem value="14">14 Days (2 Weeks)</SelectItem>
                  <SelectItem value="28">28 Days (4 Weeks)</SelectItem>
                  <SelectItem value="35">35 Days (5 Weeks)</SelectItem>
                  <SelectItem value="42">42 Days (6 Weeks)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="startDate" className="text-base font-medium">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
              className="mt-1"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Shift Staffing Requirements
                <Badge variant="outline" className="ml-auto">
                  {config.shiftType === '12h' ? '12-Hour (D/N)' : '8-Hour (E/L/N)'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {config.shiftType === '12h' ? (
                  <>
                    <div>
                      <Label htmlFor="day_shift_staff">Day Shift Staff</Label>
                      <Input
                        id="day_shift_staff"
                        type="number"
                        min="1"
                        value={config.staffingRequirements.day_shift_staff}
                        onChange={(e) => updateStaffingRequirement('day_shift_staff', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="night_shift_staff">Night Shift Staff</Label>
                      <Input
                        id="night_shift_staff"
                        type="number"
                        min="1"
                        value={config.staffingRequirements.night_shift_staff}
                        onChange={(e) => updateStaffingRequirement('night_shift_staff', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="early_shift_staff">Early Shift Staff</Label>
                      <Input
                        id="early_shift_staff"
                        type="number"
                        min="1"
                        value={config.staffingRequirements.early_shift_staff || 1}
                        onChange={(e) => updateStaffingRequirement('early_shift_staff', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="late_shift_staff">Late Shift Staff</Label>
                      <Input
                        id="late_shift_staff"
                        type="number"
                        min="1"
                        value={config.staffingRequirements.late_shift_staff || 1}
                        onChange={(e) => updateStaffingRequirement('late_shift_staff', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="night_shift_staff_8h">Night Shift Staff</Label>
                      <Input
                        id="night_shift_staff_8h"
                        type="number"
                        min="1"
                        value={config.staffingRequirements.night_shift_staff}
                        onChange={(e) => updateStaffingRequirement('night_shift_staff', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {config.shiftType === '12h' 
                  ? 'Set how many staff are needed for Day and Night shifts in a 12-hour system.'
                  : 'Set how many staff are needed for Early, Late, and Night shifts in an 8-hour system.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
