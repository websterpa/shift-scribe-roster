import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Calculator, ArrowRight, AlertTriangle, CheckCircle2, Save, FileText, Download, Loader2 } from 'lucide-react';
import { calculateFeasibility, PatternSequence, RequiredShifts, WTDRules } from '@/utils/feasibility/capacityCalculator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList, Cell } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [bufferPct, setBufferPct] = useState<number>(10);
  const [staffCount, setStaffCount] = useState<string>('');
  const [wtdRules] = useState<WTDRules>({
    maxWeeklyHours: 48,
    minDailyRestHours: 11,
    minWeeklyRestHours: 24
  });

  // Result state
  const [result, setResult] = useState<ReturnType<typeof calculateFeasibility> | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

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
        wtdRules,
        bufferPct,
        staffCount ? Number(staffCount) : undefined
      );

      setResult(calculatedResult);
      console.log('📊 Feasibility calculated:', calculatedResult);
    } catch (error) {
      console.error('❌ Error calculating feasibility:', error);
      toast.error('Error calculating feasibility');
    }
  }, [selectedPattern, shiftLengthHours, requiredShifts, wtdRules, bufferPct, staffCount]);

  const handleSaveSetup = () => {
    if (!result || !selectedPattern) return;

    const feasibilityConfig = {
      patternId: selectedPatternId,
      patternName: selectedPattern.name,
      shiftLength: shiftLengthHours,
      requiredShifts,
      bufferPct,
      staffCount: staffCount ? Number(staffCount) : null,
      requiredStaff: result.requiredStaff,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('feasibilityConfig', JSON.stringify(feasibilityConfig));
    toast.success('Configuration saved! Use it in Roster Setup.');
  };

  const getSurplusIndicator = () => {
    if (result?.surplus === null) return null;
    
    const surplus = result.surplus;
    if (surplus > 1) {
      return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Surplus' };
    } else if (surplus < -1) {
      return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Deficit' };
    }
    return { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Balanced' };
  };

  const exportPDF = async () => {
    if (!result || !selectedPattern) return;

    setIsExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      
      // Header
      pdf.setFontSize(20);
      pdf.text('Shift Scribe – Feasibility Report', 40, 40);
      
      // Pattern details
      pdf.setFontSize(12);
      pdf.text(`Pattern: ${selectedPattern.name}`, 40, 70);
      pdf.text(`Shift Length: ${shiftLengthHours}h`, 40, 90);
      pdf.text(`Required Shifts: E=${requiredShifts.E || 0}, L=${requiredShifts.L || 0}, N=${requiredShifts.N || 0}, D=${requiredShifts.D || 0}`, 40, 110);
      pdf.text(`Buffer: ${bufferPct}%`, 40, 130);
      if (staffCount) {
        pdf.text(`Current Staff: ${staffCount}`, 40, 150);
      }
      
      // Calculations
      pdf.setFontSize(14);
      pdf.text('Calculated Results:', 40, 180);
      pdf.setFontSize(12);
      pdf.text(`Work Ratio: ${(result.workRatio * 100).toFixed(1)}%`, 40, 200);
      pdf.text(`Avg Weekly Hours/Staff: ${result.hoursPerStaffPerWeek.toFixed(1)}h`, 40, 220);
      pdf.text(`Weekly Demand: ${result.weeklyHoursRequired.toFixed(1)}h`, 40, 240);
      pdf.text(`Required Staff: ${result.requiredStaff.toFixed(1)}`, 40, 260);
      pdf.text(`Utilisation: ${result.utilizationPct.toFixed(1)}%`, 40, 280);
      
      if (result.surplus !== null) {
        pdf.text(`Surplus/Deficit: ${result.surplus > 0 ? '+' : ''}${result.surplus.toFixed(1)}`, 40, 300);
      }
      
      pdf.text(`WTD Compliant: ${result.isWTDCompliant ? 'Yes' : 'No'}`, 40, 320);
      
      // Capture chart if available
      const chartEl = document.querySelector('.recharts-wrapper') as HTMLElement;
      if (chartEl && staffCount && Number(staffCount) > 0) {
        const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 40, 350, 500, 250);
      }
      
      // Footer
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 40, pdf.internal.pageSize.height - 40);
      pdf.text('Shift Scribe v1.0 – Feasibility Calculator', 40, pdf.internal.pageSize.height - 25);
      
      pdf.save(`Feasibility_Report_${selectedPattern.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF report exported successfully');
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      toast.error('Failed to export PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  const exportJSON = () => {
    if (!result || !selectedPattern) return;

    try {
      const data = {
        metadata: {
          timestamp: new Date().toISOString(),
          generatedBy: 'Shift Scribe Feasibility Calculator',
          version: '1.0'
        },
        configuration: {
          pattern: {
            id: selectedPatternId,
            name: selectedPattern.name,
            sequence: selectedPattern.sequence,
            system: selectedPattern.system
          },
          shiftLengthHours,
          requiredShifts,
          bufferPct,
          staffCount: staffCount ? Number(staffCount) : null,
          wtdRules
        },
        results: {
          workRatio: result.workRatio,
          hoursPerStaffPerWeek: result.hoursPerStaffPerWeek,
          weeklyHoursRequired: result.weeklyHoursRequired,
          requiredStaff: result.requiredStaff,
          utilizationPct: result.utilizationPct,
          surplus: result.surplus,
          isWTDCompliant: result.isWTDCompliant,
          warnings: result.warnings
        }
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Feasibility_Report_${selectedPattern.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('JSON report exported successfully');
    } catch (error) {
      console.error('❌ Error exporting JSON:', error);
      toast.error('Failed to export JSON report');
    }
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

            {/* Buffer Percentage */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label htmlFor="buffer">Buffer %</Label>
                <span className="text-sm font-medium">{bufferPct}%</span>
              </div>
              <Slider
                id="buffer"
                min={0}
                max={20}
                step={1}
                value={[bufferPct]}
                onValueChange={(value) => setBufferPct(value[0])}
              />
              <p className="text-xs text-muted-foreground">Add buffer for flexibility and absences</p>
            </div>

            {/* Staff Count (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="staffCount">Current Staff Count (optional)</Label>
              <Input
                id="staffCount"
                type="number"
                min="0"
                placeholder="Enter current staff count"
                value={staffCount}
                onChange={(e) => setStaffCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Calculate surplus or deficit</p>
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
                    <p className="text-xs text-muted-foreground mt-1">with {result.bufferPct}% buffer</p>
                  </div>
                  <div className="p-4 bg-secondary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Utilization</p>
                    <p className="text-3xl font-bold">{result.utilizationPct.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Surplus/Deficit Indicator */}
                {result.surplus !== null && getSurplusIndicator() && (
                  <div className={`p-4 rounded-lg border ${getSurplusIndicator()!.bg} ${getSurplusIndicator()!.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const Icon = getSurplusIndicator()!.icon;
                        return <Icon className={`h-5 w-5 ${getSurplusIndicator()!.color}`} />;
                      })()}
                      <p className={`font-semibold ${getSurplusIndicator()!.color}`}>
                        {getSurplusIndicator()!.label}
                      </p>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Staff Balance:</span>
                      <span className={`text-2xl font-bold ${getSurplusIndicator()!.color}`}>
                        {result.surplus > 0 ? '+' : ''}{result.surplus.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}

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

                {/* Utilisation Chart */}
                {staffCount && Number(staffCount) > 0 && (
                  <div className="pt-4 border-t">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold mb-1">Staff Utilisation</h3>
                      <p className="text-xs text-muted-foreground">
                        Weekly demand vs supply — current utilisation:{' '}
                        <span className={
                          result.utilizationPct < 80 
                            ? 'text-muted-foreground font-medium' 
                            : result.utilizationPct <= 100 
                            ? 'text-primary font-medium' 
                            : 'text-destructive font-medium'
                        }>
                          {result.utilizationPct.toFixed(1)}%
                        </span>
                        {' '}
                        <span className="font-medium">
                          ({result.utilizationPct > 100 ? 'Overstaffed' : result.utilizationPct >= 80 ? 'Efficient' : 'Understaffed'})
                        </span>
                      </p>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={[
                            { name: 'Required', hours: result.weeklyHoursRequired },
                            { name: 'Available', hours: result.hoursPerStaffPerWeek * Number(staffCount) }
                          ]}
                          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                        >
                          <XAxis dataKey="name" />
                          <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                          <Tooltip 
                            formatter={(value: number) => `${value.toFixed(1)} h`}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '0.5rem'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                            <Cell fill="hsl(var(--primary))" />
                            <Cell fill="hsl(var(--secondary-foreground))" />
                            <LabelList 
                              dataKey="hours" 
                              position="top" 
                              formatter={(value: number) => `${value.toFixed(0)}h`}
                              style={{ fill: 'hsl(var(--foreground))', fontSize: '0.875rem', fontWeight: 600 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

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

                {/* Export Buttons */}
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Export Report</p>
                  <div className="flex gap-3">
                    <Button 
                      onClick={exportPDF} 
                      variant="default"
                      className="flex-1"
                      disabled={isExporting || !result.isWTDCompliant}
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      Export PDF
                    </Button>
                    <Button 
                      onClick={exportJSON} 
                      variant="outline"
                      className="flex-1"
                      disabled={isExporting}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export JSON
                    </Button>
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={handleSaveSetup} 
                  className="w-full"
                  disabled={!result.isWTDCompliant || result.requiredStaff === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Use This Setup
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
