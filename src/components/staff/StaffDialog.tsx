import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingState } from '@/components/ui/loading-state';
import { validateForm, staffValidationSchema, showValidationToast, showSuccessToast } from '@/utils/formValidation';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface StaffMember {
  id?: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  hire_date: string;
  is_active: boolean;
  role?: string;
  hourly_rate?: number;
  min_hours_per_week?: number;
  max_hours_per_week?: number;
  eligible_shifts?: string[];
  is_shift_worker?: boolean;
}

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMember?: StaffMember | null;
  onSuccess: () => void;
}

const AVAILABLE_SHIFTS = ['Early', 'Late', 'Night', 'Day'];
const AVAILABLE_ROLES = ['Security Officer', 'Senior Officer', 'Supervisor', 'Manager'];

export const StaffDialog: React.FC<StaffDialogProps> = ({
  open,
  onOpenChange,
  staffMember,
  onSuccess
}) => {
  const { user, isAuthenticated } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<StaffMember>>({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
    role: 'Security Officer',
    hourly_rate: 15.50,
    min_hours_per_week: 37,
    max_hours_per_week: 48,
    eligible_shifts: ['Early', 'Late', 'Night', 'Day'],
    is_shift_worker: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (staffMember) {
      setFormData({
        ...staffMember,
        hire_date: staffMember.hire_date || new Date().toISOString().split('T')[0],
        eligible_shifts: staffMember.eligible_shifts || ['Early', 'Late', 'Night', 'Day']
      });
    } else {
      setFormData({
        employee_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true,
        role: 'Security Officer',
        hourly_rate: 15.50,
        min_hours_per_week: 37,
        max_hours_per_week: 48,
        eligible_shifts: ['Early', 'Late', 'Night', 'Day'],
        is_shift_worker: true
      });
    }
    setErrors({});
  }, [staffMember, open]);

  const handleInputChange = (field: keyof StaffMember, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleShiftToggle = (shift: string, checked: boolean) => {
    const currentShifts = formData.eligible_shifts || [];
    const newShifts = checked 
      ? [...currentShifts, shift]
      : currentShifts.filter(s => s !== shift);
    
    handleInputChange('eligible_shifts', newShifts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check authentication status
    if (!isAuthenticated || !user) {
      console.error('User not authenticated');
      showValidationToast({ general: 'You must be logged in to perform this action' });
      return;
    }

    console.log('Authenticated user:', user.id);
    
    // Use the correct field names for validation
    const validation = validateForm(formData, staffValidationSchema);

    if (!validation.isValid) {
      setErrors(validation.errors);
      showValidationToast(validation.errors);
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        employee_id: formData.employee_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        hire_date: formData.hire_date,
        is_active: formData.is_active,
        role: formData.role,
        hourly_rate: formData.hourly_rate,
        min_hours_per_week: formData.min_hours_per_week,
        max_hours_per_week: formData.max_hours_per_week,
        eligible_shifts: formData.eligible_shifts,
        is_shift_worker: formData.is_shift_worker,
        user_id: user.id // Use the authenticated user's ID
      };

      console.log('Data being saved:', dataToSave);

      let result;
      if (staffMember?.id) {
        result = await supabase
          .from('staff_profiles')
          .update(dataToSave)
          .eq('id', staffMember.id);
      } else {
        result = await supabase
          .from('staff_profiles')
          .insert([dataToSave]);
      }

      console.log('Supabase result:', result);

      if (result.error) {
        console.error('Supabase error:', result.error);
        throw result.error;
      }

      showSuccessToast(
        staffMember ? 'Staff member updated successfully' : 'Staff member created successfully'
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving staff member:', error);
      showValidationToast({ general: error.message || 'Failed to save staff member' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {staffMember ? 'Edit Staff Member' : 'Add New Staff Member'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                value={formData.employee_id || ''}
                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                placeholder="EMP001"
              />
              {errors.employee_id && (
                <p className="text-sm text-red-600 mt-1">{errors.employee_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="john.doe@company.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name || ''}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="John"
              />
              {errors.first_name && (
                <p className="text-sm text-red-600 mt-1">{errors.first_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name || ''}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Doe"
              />
              {errors.last_name && (
                <p className="text-sm text-red-600 mt-1">{errors.last_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+44 7000 000000"
              />
            </div>

            <div>
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date || ''}
                onChange={(e) => handleInputChange('hire_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role || ''}
                onValueChange={(value) => handleInputChange('role', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="hourly_rate">Hourly Rate (£)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourly_rate || ''}
                onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value))}
                placeholder="15.50"
              />
              {errors.hourly_rate && (
                <p className="text-sm text-red-600 mt-1">{errors.hourly_rate}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_hours">Min Hours/Week</Label>
              <Input
                id="min_hours"
                type="number"
                min="0"
                max="168"
                value={formData.min_hours_per_week || ''}
                onChange={(e) => handleInputChange('min_hours_per_week', parseInt(e.target.value))}
                placeholder="37"
              />
            </div>

            <div>
              <Label htmlFor="max_hours">Max Hours/Week</Label>
              <Input
                id="max_hours"
                type="number"
                min="0"
                max="168"
                value={formData.max_hours_per_week || ''}
                onChange={(e) => handleInputChange('max_hours_per_week', parseInt(e.target.value))}
                placeholder="48"
              />
            </div>
          </div>

          <div>
            <Label>Eligible Shifts</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {AVAILABLE_SHIFTS.map(shift => (
                <label key={shift} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.eligible_shifts?.includes(shift) || false}
                    onCheckedChange={(checked) => handleShiftToggle(shift, checked as boolean)}
                  />
                  <span>{shift}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <Checkbox
                checked={formData.is_active || false}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <span>Active</span>
            </label>

            <label className="flex items-center space-x-2">
              <Checkbox
                checked={formData.is_shift_worker || false}
                onCheckedChange={(checked) => handleInputChange('is_shift_worker', checked)}
              />
              <span>Shift Worker</span>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoadingState size="sm" spinnerOnly className="mr-2" />
                  Saving...
                </>
              ) : (
                staffMember ? 'Update' : 'Create'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
