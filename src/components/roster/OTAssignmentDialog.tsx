import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { OTOptions } from '@/utils/shiftWindowResolver';
import { validateOTRequest } from '@/services/roster/helpers';

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  hourly_rate?: number;
  eligible_shifts: string[];
}

interface OTAssignmentDialogProps {
  /** Available staff members for OT assignment */
  availableStaff: StaffMember[];
  /** Selected date for the OT assignment */
  selectedDate: string;
  /** Site configuration for defaults and validation */
  siteConfig: {
    shift_type: '8h' | '12h';
    site_start_time: string;
    timezone: string;
    default_ot_hours?: number;
    default_ot_start_local_time?: string;
  };
  /** Callback when OT assignment is created */
  onCreateOT: (assignment: {
    staffId: string;
    date: string;
    otOptions: OTOptions;
  }) => Promise<void>;
  /** Optional trigger element */
  children?: React.ReactNode;
}

export const OTAssignmentDialog: React.FC<OTAssignmentDialogProps> = ({
  availableStaff,
  selectedDate,
  siteConfig,
  onCreateOT,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [otHours, setOtHours] = useState<number>(siteConfig.default_ot_hours || (siteConfig.shift_type === '12h' ? 12 : 8));
  const [otStartTime, setOtStartTime] = useState<string>(siteConfig.default_ot_start_local_time || siteConfig.site_start_time);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStaff = availableStaff.find(s => s.id === selectedStaffId);
  const systemDefaultHours = siteConfig.shift_type === '12h' ? 12 : 8;

  const handleSubmit = async () => {
    if (!selectedStaffId) {
      toast({
        title: "Staff Selection Required",
        description: "Please select a staff member for the OT assignment.",
        variant: "destructive"
      });
      return;
    }

    const validation = validateOTRequest({
      staffId: selectedStaffId,
      dateISO: selectedDate,
      otHours,
      otStartLocalTime: otStartTime
    });

    if (!validation.valid) {
      toast({
        title: "Invalid OT Configuration",
        description: validation.errors.join(", "),
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const otOptions: OTOptions = {
        otHours,
        otStartLocalTime: otStartTime
      };

      await onCreateOT({
        staffId: selectedStaffId,
        date: selectedDate,
        otOptions
      });

      toast({
        title: "OT Assignment Created",
        description: `${selectedStaff?.first_name} ${selectedStaff?.last_name} assigned ${otHours}h OT starting at ${otStartTime}`,
      });

      // Reset form and close dialog
      setSelectedStaffId('');
      setOtHours(siteConfig.default_ot_hours || systemDefaultHours);
      setOtStartTime(siteConfig.default_ot_start_local_time || siteConfig.site_start_time);
      setIsOpen(false);

    } catch (error) {
      console.error('Failed to create OT assignment:', error);
      toast({
        title: "Failed to Create OT Assignment",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateEstimatedCost = () => {
    if (!selectedStaff?.hourly_rate || !otHours) return null;
    
    const date = new Date(selectedDate);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const multiplier = isWeekend ? 2.0 : 1.5; // OT multipliers
    
    return selectedStaff.hourly_rate * otHours * multiplier;
  };

  const estimatedCost = calculateEstimatedCost();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add OT Coverage
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Create Overtime Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date and Basic Info */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              Date: {new Date(selectedDate).toLocaleDateString()}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {siteConfig.timezone}
            </Badge>
          </div>

          {/* Staff Selection */}
          <div className="space-y-2">
            <Label htmlFor="staff-select">Staff Member</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member for OT..." />
              </SelectTrigger>
              <SelectContent>
                {availableStaff.map(staff => (
                  <SelectItem key={staff.id} value={staff.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{staff.first_name} {staff.last_name}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        £{staff.hourly_rate?.toFixed(2) || '15.50'}/h
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* OT Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ot-hours">
                OT Duration (hours)
                {siteConfig.default_ot_hours && (
                  <span className="text-muted-foreground ml-1 font-normal">
                    (Default: {siteConfig.default_ot_hours}h)
                  </span>
                )}
              </Label>
              <Input
                id="ot-hours"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={otHours}
                onChange={(e) => setOtHours(parseFloat(e.target.value) || 0)}
                className="text-center"
              />
              <p className="text-xs text-muted-foreground">
                Common: 3h, 4h, 6h, 8h. Decimals allowed (e.g., 3.5h).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ot-start-time">
                OT Start Time
                {siteConfig.default_ot_start_local_time && (
                  <span className="text-muted-foreground ml-1 font-normal">
                    (Default: {siteConfig.default_ot_start_local_time})
                  </span>
                )}
              </Label>
              <Input
                id="ot-start-time"
                type="time"
                value={otStartTime}
                onChange={(e) => setOtStartTime(e.target.value)}
                className="text-center"
              />
              <p className="text-xs text-muted-foreground">
                Local time in {siteConfig.timezone}
              </p>
            </div>
          </div>

          {/* Common OT Patterns */}
          <div className="space-y-2">
            <Label>Quick Patterns</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Morning Top-up", hours: 4, time: "10:00" },
                { label: "Afternoon Cover", hours: 6, time: "14:00" },
                { label: "Evening Cover", hours: 3, time: "18:00" },
                { label: "Night Cover", hours: 8, time: "22:00" }
              ].map(pattern => (
                <Button
                  key={pattern.label}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOtHours(pattern.hours);
                    setOtStartTime(pattern.time);
                  }}
                  className="text-xs"
                >
                  {pattern.label} ({pattern.hours}h @ {pattern.time})
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Cost Estimation */}
          {estimatedCost && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Estimated Cost</h4>
                    <p className="text-sm text-muted-foreground">
                      {otHours}h × £{selectedStaff?.hourly_rate?.toFixed(2)} × OT multiplier
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      £{estimatedCost.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Includes OT premium
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Warnings */}
          {otHours > 12 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                Long OT shift ({otHours}h) - ensure rest rules and WTR compliance
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedStaffId || !otHours}
              className="gap-2"
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Create OT Assignment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OTAssignmentDialog;