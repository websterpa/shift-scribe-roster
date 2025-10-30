
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
  availability_status: 'active' | 'temporarily_unavailable' | 'inactive';
  unavailability_reason?: string;
  unavailable_from?: string;
  expected_return_date?: string;
  unavailability_notes?: string;
  role?: string;
  hourly_rate?: number;
  min_hours_per_week?: number;
  max_hours_per_week?: number;
  eligible_shifts?: string[];
  is_shift_worker?: boolean;
  opted_out_wtd?: boolean;
  pattern_id?: string | null;
  pattern_offset?: number;
}

/**
 * Shift Pattern interface for staff assignment
 * Note: Database table is 'public.site_patterns' but internally referred to as 'ShiftPattern'
 */
interface ShiftPattern {
  id: string;
  name: string;
  system: string;
  sequence: string[];
}

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMember?: StaffMember | null;
  onSuccess: () => void;
}

const AVAILABLE_SHIFTS = ['Early', 'Late', 'Night', 'Day'];
const AVAILABLE_ROLES = ['CCTV Operator', 'Senior Operator', 'Supervisor', 'Manager'];
const UNAVAILABILITY_REASONS = [
  'Maternity Leave',
  'Paternity Leave', 
  'Long-term Sick Leave',
  'Training/Education',
  'Secondment',
  'Sabbatical',
  'Military Service',
  'Bereavement Leave',
  'Extended Leave',
  'Other'
];

export const StaffDialog: React.FC<StaffDialogProps> = ({
  open,
  onOpenChange,
  staffMember,
  onSuccess
}) => {
  const { user, isAuthenticated } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [formData, setFormData] = useState<Partial<StaffMember>>({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
    availability_status: 'active',
    unavailability_reason: '',
    unavailable_from: '',
    expected_return_date: '',
    unavailability_notes: '',
    role: 'CCTV Operator',
    hourly_rate: 15.50,
    min_hours_per_week: 37,
    max_hours_per_week: 48,
    eligible_shifts: ['Early', 'Late', 'Night', 'Day'],
    is_shift_worker: true,
    opted_out_wtd: true,
    pattern_id: null,
    pattern_offset: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available patterns
  useEffect(() => {
    const fetchPatterns = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('site_patterns')
        .select('id, name, system, sequence')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching patterns:', error);
        return;
      }
      
      // Cast sequence from Json to string[]
      const typedPatterns: ShiftPattern[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        system: p.system,
        sequence: Array.isArray(p.sequence) 
          ? p.sequence.filter((s): s is string => typeof s === 'string')
          : []
      }));
      
      setPatterns(typedPatterns);
    };
    
    if (open) {
      fetchPatterns();
    }
  }, [open, user]);

  useEffect(() => {
    const initializeForm = async () => {
      if (staffMember) {
        setFormData({
          ...staffMember,
          hire_date: staffMember.hire_date || new Date().toISOString().split('T')[0],
          eligible_shifts: staffMember.eligible_shifts || ['Early', 'Late', 'Night', 'Day'],
          availability_status: staffMember.availability_status || 'active',
          pattern_offset: staffMember.pattern_offset ?? 0
        });
      } else {
        // For new staff, auto-assign first available pattern
        let defaultPatternId = null;
        
        if (user) {
          const { data } = await supabase
            .from('site_patterns')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          defaultPatternId = data?.id || null;
        }
        
        setFormData({
          employee_id: '',
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          hire_date: new Date().toISOString().split('T')[0],
          is_active: true,
          availability_status: 'active',
          unavailability_reason: '',
          unavailable_from: '',
          expected_return_date: '',
          unavailability_notes: '',
          role: 'CCTV Operator',
          hourly_rate: 15.50,
          min_hours_per_week: 37,
          max_hours_per_week: 48,
          eligible_shifts: ['Early', 'Late', 'Night', 'Day'],
          is_shift_worker: true,
          opted_out_wtd: true,
          pattern_id: defaultPatternId,
          pattern_offset: 0
        });
      }
      setErrors({});
    };
    
    if (open) {
      initializeForm();
    }
  }, [staffMember, open, user]);

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
        availability_status: formData.availability_status,
        unavailability_reason: formData.unavailability_reason || null,
        unavailable_from: formData.unavailable_from || null,
        expected_return_date: formData.expected_return_date || null,
        unavailability_notes: formData.unavailability_notes || null,
        role: formData.role,
        hourly_rate: formData.hourly_rate,
        min_hours_per_week: formData.min_hours_per_week,
        max_hours_per_week: formData.max_hours_per_week,
        eligible_shifts: formData.eligible_shifts,
        is_shift_worker: formData.is_shift_worker,
        opted_out_wtd: formData.opted_out_wtd ?? true,
        pattern_id: formData.pattern_id || null,
        pattern_offset: formData.pattern_offset ?? 0,
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

      // Invalidate staff cache after mutation
      const { invalidateCache } = await import('@/lib/cache');
      invalidateCache(/^staff_/);

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

  const showUnavailabilityFields = formData.availability_status === 'temporarily_unavailable';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

            <div>
              <Label htmlFor="pattern_id">Shift Pattern</Label>
              <Select
                value={formData.pattern_id || 'none'}
                onValueChange={(value) => handleInputChange('pattern_id', value === 'none' ? null : value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select a pattern" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="none">No pattern assigned</SelectItem>
                  {patterns.map(pattern => (
                    <SelectItem key={pattern.id} value={pattern.id}>
                      {pattern.name} ({pattern.system})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Repeating shift pattern for this staff member
              </p>
            </div>

            <div>
              <Label htmlFor="pattern_offset">Pattern Offset (Days)</Label>
              <Input
                id="pattern_offset"
                type="number"
                min="0"
                max="365"
                value={formData.pattern_offset ?? 0}
                onChange={(e) => handleInputChange('pattern_offset', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Starting day in the pattern sequence (0 = start at beginning)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="availability_status">Availability Status</Label>
              <Select
                value={formData.availability_status || 'active'}
                onValueChange={(value) => handleInputChange('availability_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select availability status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="temporarily_unavailable">Temporarily Unavailable</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showUnavailabilityFields && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg">
                <div>
                  <Label htmlFor="unavailability_reason">Reason for Unavailability</Label>
                  <Select
                    value={formData.unavailability_reason || ''}
                    onValueChange={(value) => handleInputChange('unavailability_reason', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNAVAILABILITY_REASONS.map(reason => (
                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="unavailable_from">Unavailable From</Label>
                  <Input
                    id="unavailable_from"
                    type="date"
                    value={formData.unavailable_from || ''}
                    onChange={(e) => handleInputChange('unavailable_from', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="expected_return_date">Expected Return Date</Label>
                  <Input
                    id="expected_return_date"
                    type="date"
                    value={formData.expected_return_date || ''}
                    onChange={(e) => handleInputChange('expected_return_date', e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="unavailability_notes">Additional Notes</Label>
                  <Textarea
                    id="unavailability_notes"
                    value={formData.unavailability_notes || ''}
                    onChange={(e) => handleInputChange('unavailability_notes', e.target.value)}
                    placeholder="Any additional information about the unavailability..."
                    rows={3}
                  />
                </div>
              </div>
            )}
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
              <span>Active (Legacy)</span>
            </label>

            <label className="flex items-center space-x-2">
              <Checkbox
                checked={formData.is_shift_worker || false}
                onCheckedChange={(checked) => handleInputChange('is_shift_worker', checked)}
              />
              <span>Shift Worker</span>
            </label>

            <label className="flex items-center space-x-2">
              <Checkbox
                checked={formData.opted_out_wtd ?? true}
                onCheckedChange={(checked) => handleInputChange('opted_out_wtd', checked)}
              />
              <span className="font-medium">WTD Opt-Out</span>
            </label>
          </div>

          <div className="text-xs text-muted-foreground mt-1 ml-1">
            Staff with WTD opt-out are not subject to the 48-hour weekly average limit
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
