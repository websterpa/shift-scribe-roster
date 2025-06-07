
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface StaffingRequirements {
  day_shift_staff: number;
  night_shift_staff: number;
  early_shift_staff?: number;
  late_shift_staff?: number;
}

interface ConfigStaffingRequirementsProps {
  formData: any;
  onFormDataChange: (data: any) => void;
}

export function ConfigStaffingRequirements({ formData, onFormDataChange }: ConfigStaffingRequirementsProps) {
  const updateStaffingRequirement = (field: keyof StaffingRequirements, value: number) => {
    const staffingRequirements = formData.staffing_requirements || {};
    onFormDataChange({
      ...formData,
      staffing_requirements: {
        ...staffingRequirements,
        [field]: value
      }
    });
  };

  const staffingRequirements = formData.staffing_requirements || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Resources Required per Shift</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {formData.shift_type === '12h' ? (
          <>
            <div>
              <Label htmlFor="day_shift_staff">Day Shift Staff Required</Label>
              <Input
                id="day_shift_staff"
                type="number"
                min="1"
                value={staffingRequirements.day_shift_staff || 1}
                onChange={(e) => updateStaffingRequirement('day_shift_staff', parseInt(e.target.value) || 1)}
                placeholder="Number of staff for day shift"
              />
            </div>
            <div>
              <Label htmlFor="night_shift_staff">Night Shift Staff Required</Label>
              <Input
                id="night_shift_staff"
                type="number"
                min="1"
                value={staffingRequirements.night_shift_staff || 1}
                onChange={(e) => updateStaffingRequirement('night_shift_staff', parseInt(e.target.value) || 1)}
                placeholder="Number of staff for night shift"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="early_shift_staff">Early Shift Staff Required</Label>
              <Input
                id="early_shift_staff"
                type="number"
                min="1"
                value={staffingRequirements.early_shift_staff || 1}
                onChange={(e) => updateStaffingRequirement('early_shift_staff', parseInt(e.target.value) || 1)}
                placeholder="Number of staff for early shift"
              />
            </div>
            <div>
              <Label htmlFor="late_shift_staff">Late Shift Staff Required</Label>
              <Input
                id="late_shift_staff"
                type="number"
                min="1"
                value={staffingRequirements.late_shift_staff || 1}
                onChange={(e) => updateStaffingRequirement('late_shift_staff', parseInt(e.target.value) || 1)}
                placeholder="Number of staff for late shift"
              />
            </div>
            <div>
              <Label htmlFor="night_shift_staff">Night Shift Staff Required</Label>
              <Input
                id="night_shift_staff"
                type="number"
                min="1"
                value={staffingRequirements.night_shift_staff || 1}
                onChange={(e) => updateStaffingRequirement('night_shift_staff', parseInt(e.target.value) || 1)}
                placeholder="Number of staff for night shift"
              />
            </div>
          </>
        )}
        
        <div className="text-sm text-gray-600 mt-4">
          <p>These settings determine how many staff members are required to work each shift type to ensure adequate coverage.</p>
        </div>
      </CardContent>
    </Card>
  );
}
