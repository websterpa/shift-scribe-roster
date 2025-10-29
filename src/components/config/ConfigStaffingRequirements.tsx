
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Info, TrendingUp, AlertTriangle } from 'lucide-react';
import { calculateOptimalStaffing, StaffingRecommendation, validateStaffingAgainstRequirements, fetchStaffMembers } from '@/services/roster/helpers';
import { StaffMember } from '@/types/roster';
import { toast } from '@/hooks/use-toast';

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
  const [recommendation, setRecommendation] = useState<StaffingRecommendation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<StaffMember[]>([]);

  useEffect(() => {
    loadStaffData();
  }, []);

  const loadStaffData = async () => {
    try {
      const staff = await fetchStaffMembers();
      setCurrentStaff(staff);
    } catch (error) {
      console.error('Failed to load staff data:', error);
    }
  };

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

  const handleAutoCalculate = async () => {
    if (!formData.operational_hours_per_day || !formData.shift_type || !formData.cycle_length_weeks) {
      toast({
        title: "Missing Configuration",
        description: "Please complete basic configuration before auto-calculating staffing requirements.",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    try {
      console.log('🧮 Auto-calculating staffing requirements...');
      
      const calculationParams = {
        operationalHoursPerDay: formData.operational_hours_per_day,
        shiftType: formData.shift_type as '8h' | '12h',
        cycleWeeks: formData.cycle_length_weeks,
        handshakeMinutes: formData.handshake_minutes || 0,
        averageHourlyRate: 16.50 // Can be made configurable later
      };

      const staffingRecommendation = calculateOptimalStaffing(currentStaff, calculationParams);
      setRecommendation(staffingRecommendation);
      setShowCalculation(true);

      // Apply recommendations to form
      applyRecommendationsToForm(staffingRecommendation);

      toast({
        title: "Staffing Calculated",
        description: "Auto-calculated staffing requirements have been applied. Review the calculation details below.",
      });

    } catch (error) {
      console.error('Error calculating staffing:', error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate optimal staffing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const applyRecommendationsToForm = (rec: StaffingRecommendation) => {
    const newRequirements: StaffingRequirements = { ...formData.staffing_requirements };

    for (const calc of rec.calculations) {
      switch (calc.shiftType) {
        case 'Day':
          newRequirements.day_shift_staff = calc.recommendedStaff;
          break;
        case 'Night':
          newRequirements.night_shift_staff = calc.recommendedStaff;
          break;
        case 'Early':
          newRequirements.early_shift_staff = calc.recommendedStaff;
          break;
        case 'Late':
          newRequirements.late_shift_staff = calc.recommendedStaff;
          break;
      }
    }

    onFormDataChange({
      ...formData,
      staffing_requirements: newRequirements
    });
  };

  const staffingRequirements = formData.staffing_requirements || {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Staff Resources Required per Shift</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoCalculate}
              disabled={isCalculating}
              className="flex items-center gap-2"
            >
              {isCalculating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" />
                  Auto-Calculate
                </>
              )}
            </Button>
          </div>
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
            <p className="mt-2 text-blue-600">💡 Use "Auto-Calculate" to get intelligent recommendations based on your operational requirements and current staff.</p>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Results */}
      {showCalculation && recommendation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Staffing Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Total Required Staff</p>
                <p className="text-2xl font-bold">{recommendation.totalRequiredStaff}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Recommended (with buffer)</p>
                <p className="text-2xl font-bold text-blue-600">{recommendation.totalRecommendedStaff}</p>
              </div>
            </div>

            {/* Per-Shift Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium">Shift Breakdown:</h4>
              {recommendation.calculations.map((calc, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{calc.shiftType} Shift</span>
                    <span className="text-sm text-gray-600">
                      {calc.requiredStaff} required • {calc.recommendedStaff} recommended
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {calc.reasoning.map((reason, idx) => (
                      <p key={idx}>• {reason}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Assumptions */}
            {recommendation.assumptions.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Calculation Assumptions:</strong>
                  <ul className="mt-1 ml-4 list-disc text-sm">
                    {recommendation.assumptions.map((assumption, index) => (
                      <li key={index}>{assumption}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {recommendation.warnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnings:</strong>
                  <ul className="mt-1 ml-4 list-disc text-sm">
                    {recommendation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Cost Implications */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Cost Implications:</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Minimum Weekly Cost</p>
                  <p className="font-bold">£{recommendation.costImplications.minimumWeeklyCost.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Recommended Weekly Cost</p>
                  <p className="font-bold text-blue-600">£{recommendation.costImplications.recommendedWeeklyCost.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Annual Difference</p>
                  <p className="font-bold text-orange-600">£{recommendation.costImplications.annualSavings.toFixed(0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
