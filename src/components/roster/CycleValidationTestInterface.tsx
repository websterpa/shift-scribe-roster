import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, TestTube, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';
import { generateEnhancedRosterCycle, validateEnhancedCycle, CycleValidationResult } from '@/utils/roster/enhancedCycleIntegration';
import { StaffMember } from '@/types/roster';

interface TestStaff {
  id: string;
  first_name: string;
  last_name: string;
  is_shift_worker: boolean;
  eligible_shifts: string[];
}

export const CycleValidationTestInterface = () => {
  const [cycleLengthWeeks, setCycleLengthWeeks] = useState(2);
  const [shiftType, setShiftType] = useState<'8h' | '12h'>('12h');
  const [operationalHours, setOperationalHours] = useState(24);
  const [handshakeMinutes, setHandshakeMinutes] = useState(15);
  
  const [testStaff, setTestStaff] = useState<TestStaff[]>([
    { id: '1', first_name: 'Alice', last_name: 'Johnson', is_shift_worker: true, eligible_shifts: ['Day', 'Night'] },
    { id: '2', first_name: 'Bob', last_name: 'Smith', is_shift_worker: true, eligible_shifts: ['Day', 'Night'] },
    { id: '3', first_name: 'Carol', last_name: 'Brown', is_shift_worker: true, eligible_shifts: ['Early', 'Late', 'Night'] },
    { id: '4', first_name: 'David', last_name: 'Wilson', is_shift_worker: false, eligible_shifts: [] }
  ]);
  
  const [generatedCycle, setGeneratedCycle] = useState<Record<number, Record<number, Record<string, string>>> | null>(null);
  const [validationResult, setValidationResult] = useState<CycleValidationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('1');

  useEffect(() => {
    // Update test staff eligible shifts based on shift type
    if (shiftType === '12h') {
      setTestStaff(prev => prev.map(staff => ({
        ...staff,
        eligible_shifts: staff.is_shift_worker ? ['Day', 'Night'] : []
      })));
    } else {
      setTestStaff(prev => prev.map(staff => ({
        ...staff,
        eligible_shifts: staff.is_shift_worker ? ['Early', 'Late', 'Night'] : []
      })));
    }
  }, [shiftType]);

  const handleGenerateAndValidate = async () => {
    setIsGenerating(true);
    try {
      console.log('🧪 Starting cycle generation test...');
      
      const staffList: StaffMember[] = testStaff.map(staff => ({
        ...staff,
        employee_id: staff.id,
        email: `${staff.first_name.toLowerCase()}@test.com`,
        hire_date: '2024-01-01',
        is_active: true,
        availability_status: 'active' as const,
        min_hours_per_week: 37,
        max_hours_per_week: 48,
        opted_out_wtd: false,
        days_off_per_week: 2,
        hourly_rate: 25,
        holiday_multiplier: 1.5,
        leave_allowance_days: 25
      }));

      // Generate cycle
      const cycle = generateEnhancedRosterCycle(
        staffList,
        cycleLengthWeeks,
        shiftType,
        operationalHours,
        handshakeMinutes
      );
      
      setGeneratedCycle(cycle);
      
      // Validate cycle
      const validation = validateEnhancedCycle(cycle, staffList, shiftType);
      setValidationResult(validation);
      
      console.log('🧪 Test completed:', {
        isValid: validation.isValid,
        score: validation.overallScore,
        violationCount: validation.violations.length
      });
      
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case 'D': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'N': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'E': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'L': return 'bg-green-100 text-green-800 border-green-300';
      case 'R': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderStaffPattern = (staffId: string) => {
    if (!generatedCycle) return null;

    const pattern: string[] = [];
    Object.keys(generatedCycle).sort((a, b) => parseInt(a) - parseInt(b)).forEach(weekStr => {
      const week = parseInt(weekStr);
      for (let day = 0; day < 7; day++) {
        pattern.push(generatedCycle[week][day][staffId] || 'R');
      }
    });

    const staff = testStaff.find(s => s.id === staffId);
    const staffViolations = validationResult?.staffViolations[staffId] || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">
            {staff?.first_name} {staff?.last_name}
            {staffViolations.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {staffViolations.length} violations
              </Badge>
            )}
          </h4>
          <div className="text-sm text-muted-foreground">
            Eligible: {staff?.eligible_shifts.join(', ') || 'None'}
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {pattern.map((shift, index) => {
            const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            const dayName = dayNames[index % 7];
            const weekNum = Math.floor(index / 7) + 1;
            
            return (
              <div key={index} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  {index % 7 === 0 && `W${weekNum}`}
                  <br />
                  {dayName}
                </div>
                <Badge className={`${getShiftColor(shift)} font-mono text-sm w-8 h-8 flex items-center justify-center`}>
                  {shift}
                </Badge>
              </div>
            );
          })}
        </div>
        
        {staffViolations.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {staffViolations.map((violation, index) => (
                  <div key={index}>• {violation}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const renderValidationSummary = () => {
    if (!validationResult) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Validation Results</h3>
          <div className="flex items-center gap-2">
            {validationResult.isValid ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`text-lg font-bold ${getScoreColor(validationResult.overallScore)}`}>
              {validationResult.overallScore.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <Progress 
          value={validationResult.overallScore} 
          className="h-3"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Overall Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Valid Roster:</span>
                  <Badge variant={validationResult.isValid ? "default" : "destructive"}>
                    {validationResult.isValid ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Violations:</span>
                  <span className="font-mono">{validationResult.violations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Staff with Issues:</span>
                  <span className="font-mono">{Object.keys(validationResult.staffViolations).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rule Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {validationResult.violations.length === 0 ? (
                  <div className="text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    All rules followed
                  </div>
                ) : (
                  validationResult.violations.slice(0, 3).map((violation, index) => (
                    <div key={index} className="text-red-600 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs">{violation}</span>
                    </div>
                  ))
                )}
                {validationResult.violations.length > 3 && (
                  <div className="text-muted-foreground text-xs">
                    ... and {validationResult.violations.length - 3} more violations
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Enhanced Cycle Validation Test Interface
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weeks">Cycle Length (weeks)</Label>
            <Input
              id="weeks"
              type="number"
              min="1"
              max="8"
              value={cycleLengthWeeks}
              onChange={(e) => setCycleLengthWeeks(parseInt(e.target.value) || 2)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Shift Type</Label>
            <Select value={shiftType} onValueChange={(value: '8h' | '12h') => setShiftType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (D/N)</SelectItem>
                <SelectItem value="8h">8-hour (E/L/N)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Operational Hours</Label>
            <Input
              type="number"
              min="8"
              max="24"
              value={operationalHours}
              onChange={(e) => setOperationalHours(parseInt(e.target.value) || 24)}
            />
          </div>
          
          <div className="flex items-end">
            <Button 
              onClick={handleGenerateAndValidate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Generate & Validate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {generatedCycle && validationResult && (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Validation Summary</TabsTrigger>
              <TabsTrigger value="patterns">Staff Patterns</TabsTrigger>
              <TabsTrigger value="raw">Raw Data</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              {renderValidationSummary()}
            </TabsContent>
            
            <TabsContent value="patterns" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Staff Member</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {testStaff.map(staff => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {renderStaffPattern(selectedStaffId)}
            </TabsContent>
            
            <TabsContent value="raw" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Generated Cycle Data</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                  {JSON.stringify(generatedCycle, null, 2)}
                </pre>
                
                <h4 className="font-medium">Validation Result</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                  {JSON.stringify(validationResult, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Quick Test Presets */}
        <div className="space-y-2">
          <h4 className="font-medium">Quick Test Scenarios</h4>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCycleLengthWeeks(1);
                setShiftType('12h');
                setTimeout(handleGenerateAndValidate, 100);
              }}
            >
              1-week 12h
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCycleLengthWeeks(2);
                setShiftType('8h');
                setTimeout(handleGenerateAndValidate, 100);
              }}
            >
              2-week 8h
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCycleLengthWeeks(4);
                setShiftType('12h');
                setTimeout(handleGenerateAndValidate, 100);
              }}
            >
              4-week 12h
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
