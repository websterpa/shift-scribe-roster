import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { calculateFeasibility, PatternSequence, RequiredShifts, WTDRules } from '@/utils/feasibility/capacityCalculator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FeasibilityCalculator = () => {
  console.log('🧮 FeasibilityCalculator component rendered');

  const navigate = useNavigate();

  // Fetch available patterns
  const { data: patterns, isLoading: patternsLoading } = useQuery({
    queryKey: ['site-patterns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_patterns')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Form state
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [shiftLengthHours, setShiftLengthHours] = useState<number>(8);
  const [requiredShifts, setRequiredShifts] = useState<RequiredShifts>({
    E: 2,
    L: 2,
    N: 1
  });
  const [wtdRules] = useState<WTDRules>({
    maxWeeklyHours: 48,
    minDailyRestHours: 11,
    minWeeklyRestHours: 24
  });

  // Result state
  const [result, setResult] = useState<ReturnType<typeof calculateFeasibility> | null>(null);

  // Get selected pattern
  const selectedPattern = patterns?.find(p => p.id === selectedPatternId);

  // Recalculate on input change
  useEffect(() => {
    if (!selectedPattern) {
      setResult(null);
      return;
    }

    try {
      const patternSequence: PatternSequence = {
        sequence: Array.isArray(selectedPattern.sequence) 
          ? (selectedPattern.sequence as string[])
          : []
      };

      const calculatedResult = calculateFeasibility(
        patternSequence,
        requiredShifts,
        shiftLengthHours,
        wtdRules
      );

      setResult(calculatedResult);
      console.log('📊 Feasibility calculated:', calculatedResult);
    } catch (error) {
      console.error('❌ Error calculating feasibility:', error);
      toast.error('Error calculating feasibility');
    }
  }, [selectedPattern, shiftLengthHours, requiredShifts, wtdRules]);

  const handleAddToRoster = () => {
    if (!result || !selectedPattern) return;

    // Navigate to roster builder with pre-filled data
    const params = new URLSearchParams({
      patternId: selectedPatternId,
      recommendedStaff: result.requiredStaff.toString(),
      shiftLength: shiftLengthHours.toString()
    });

    navigate(`/roster/builder?${params.toString()}`);
    toast.success(`Recommended ${result.requiredStaff} staff members`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-primary" />
          Feasibility Calculator
        </h1>
        <p className="text-gray-600 mt-2">
          Calculate minimum staff requirements based on patterns, shift durations, and WTD constraints
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Define your roster requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pattern Selection */}
            <div className="space-y-2">
              <Label htmlFor="pattern">Shift Pattern</Label>
              <Select
                value={selectedPatternId}
                onValueChange={setSelectedPatternId}
                disabled={patternsLoading}
              >
                <SelectTrigger id="pattern">
                  <SelectValue placeholder={patternsLoading ? "Loading patterns..." : "Select a pattern"} />
                </SelectTrigger>
                <SelectContent>
                  {patterns?.map(pattern => (
                    <SelectItem key={pattern.id} value={pattern.id}>
                      {pattern.name} ({pattern.system}) - {Array.isArray(pattern.sequence) ? pattern.sequence.join(' ') : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPattern && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Pattern: {Array.isArray(selectedPattern.sequence) ? selectedPattern.sequence.join(' ') : ''}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cycle: {selectedPattern.cycle_length} weeks • System: {selectedPattern.system}
                  </p>
                </div>
              )}
            </div>

            {/* Shift Length */}
            <div className="space-y-2">
              <Label htmlFor="shiftLength">Shift Length (hours)</Label>
              <Input
                id="shiftLength"
                type="number"
                min="1"
                max="24"
                value={shiftLengthHours}
                onChange={(e) => setShiftLengthHours(Number(e.target.value))}
              />
            </div>

            {/* Required Shifts */}
            <div className="space-y-3">
              <Label>Daily Shift Requirements</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="reqE" className="text-xs">Early (E)</Label>
                  <Input
                    id="reqE"
                    type="number"
                    min="0"
                    value={requiredShifts.E || 0}
                    onChange={(e) => setRequiredShifts({ ...requiredShifts, E: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="reqL" className="text-xs">Late (L)</Label>
                  <Input
                    id="reqL"
                    type="number"
                    min="0"
                    value={requiredShifts.L || 0}
                    onChange={(e) => setRequiredShifts({ ...requiredShifts, L: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="reqN" className="text-xs">Night (N)</Label>
                  <Input
                    id="reqN"
                    type="number"
                    min="0"
                    value={requiredShifts.N || 0}
                    onChange={(e) => setRequiredShifts({ ...requiredShifts, N: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="reqD" className="text-xs">Day (D - 12h)</Label>
                  <Input
                    id="reqD"
                    type="number"
                    min="0"
                    value={requiredShifts.D || 0}
                    onChange={(e) => setRequiredShifts({ ...requiredShifts, D: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* WTD Rules Display */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-xs text-muted-foreground">WTD Constraints</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Max Weekly Hours: <span className="font-semibold">{wtdRules.maxWeeklyHours}h</span></div>
                <div>Min Daily Rest: <span className="font-semibold">{wtdRules.minDailyRestHours}h</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>Calculated staffing requirements</CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a pattern to calculate requirements</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground">Required Staff</p>
                    <p className="text-3xl font-bold text-primary">{result.requiredStaff}</p>
                  </div>
                  <div className="p-4 bg-secondary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Utilization</p>
                    <p className="text-3xl font-bold">{result.utilizationPct.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Work Ratio:</span>
                    <span className="font-medium">{(result.workRatio * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hours per Staff/Week:</span>
                    <span className="font-medium">{result.hoursPerStaffPerWeek.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Weekly Hours:</span>
                    <span className="font-medium">{result.weeklyHoursRequired.toFixed(1)}h</span>
                  </div>
                </div>

                {/* WTD Compliance */}
                <div className="pt-4 border-t">
                  {result.isWTDCompliant ? (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Pattern is WTD compliant
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Pattern exceeds WTD limits
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="space-y-2">
                    {result.warnings.map((warning, idx) => (
                      <Alert key={idx} className="bg-yellow-50 border-yellow-200">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800 text-sm">
                          {warning}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Action Button */}
                <Button 
                  onClick={handleAddToRoster} 
                  className="w-full"
                  disabled={!result.isWTDCompliant || result.requiredStaff === 0}
                >
                  Add to Roster Builder
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeasibilityCalculator;
