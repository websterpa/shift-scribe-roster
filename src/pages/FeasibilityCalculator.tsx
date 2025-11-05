import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Calculator, ArrowRight, AlertTriangle, CheckCircle2, Save, FileText, Download, Loader2, Trash2 } from 'lucide-react';
import { calculateFeasibility, type FeasibilityInput } from '@/services/feasibility/calculateFeasibility';
import { UtilisationChart, type UtilisationData } from '@/components/Feasibility/UtilisationChart';
import { DEFAULT_WTD_RULES } from '@/engine2/constraints/wtdRules';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip, Legend, LabelList, Cell, ReferenceLine } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { simulateWTD, getWTDSimulationSummary, type WTDSimulationSummary } from '@/utils/feasibility/wtdSimulation';
import { Switch } from '@/components/ui/switch';
import { recommendAdjustments, type AdjustmentRecommendation } from '@/services/feasibility/recommendAdjustments';
import { 
  saveScenario, 
  loadScenarios, 
  deleteScenario, 
  type FeasibilityScenario,
  type SaveScenarioInput 
} from '@/services/feasibility/scenarios';
import { diagnosePattern, type RestViolation } from '@/engine2/constraints/wtdDiagnostics';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { computeWTDStatus, type WTDStatus } from '@/services/feasibility/computeWTDStatus';
import { firstDateForCycleIndex } from '@/lib/cycleMapping';
import { format } from 'date-fns';
import { 
  detectSystem, 
  activeShiftKeys, 
  countShiftsInCycle, 
  weeklyRequired, 
  calculateCoverage,
  type System,
  type ShiftKey 
} from '@/services/feasibility/staffingBreakdown';

const FeasibilityCalculator = () => {
  console.log('🧮 FeasibilityCalculator component rendered');

  const navigate = useNavigate();

  // Fetch available patterns
  const { data: patterns, isLoading: patternsLoading } = useQuery({
    queryKey: ['site-patterns'],
    queryFn: async () => {
      console.log('🔍 Fetching patterns from site_patterns table...');
      const { data, error } = await supabase
        .from('site_patterns')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('❌ Error fetching patterns:', error);
        throw error;
      }
      console.log('✅ Patterns loaded:', data?.length, 'patterns', data);
      return data;
    }
  });

  // Form state
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [shiftLengthHours, setShiftLengthHours] = useState<number>(8);
  const [requiredShiftsPerDay, setRequiredShiftsPerDay] = useState<number>(3);
  const [bufferPct, setBufferPct] = useState<number>(10);
  const [staffCount, setStaffCount] = useState<string>('');
  const [standardContractHours, setStandardContractHours] = useState<number>(37.5);
  const wtdRules = DEFAULT_WTD_RULES;

  // Result state
  const [result, setResult] = useState<ReturnType<typeof calculateFeasibility> | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showWTDSimulation, setShowWTDSimulation] = useState<boolean>(true);
  const [wtdSummary, setWtdSummary] = useState<WTDSimulationSummary | null>(null);
  const [recommendations, setRecommendations] = useState<AdjustmentRecommendation[]>([]);

  // Scenario management state
  const [scenarioName, setScenarioName] = useState<string>('');
  const [scenarios, setScenarios] = useState<FeasibilityScenario[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState<boolean>(false);

  // Rest diagnostics state
  const [restViolations, setRestViolations] = useState<RestViolation[]>([]);
  
  // Unified WTD status
  const [wtdStatus, setWtdStatus] = useState<WTDStatus | null>(null);
  
  // Per-shift staffing requirements
  const [requiredPerDay, setRequiredPerDay] = useState<Partial<Record<ShiftKey, number>>>({});

  // Load saved scenarios on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      setIsLoadingScenarios(true);
      try {
        const data = await loadScenarios();
        setScenarios(data);
      } catch (error) {
        console.error('Error loading scenarios:', error);
      } finally {
        setIsLoadingScenarios(false);
      }
    };
    fetchScenarios();
  }, []);

  // Load saved scenarios on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      setIsLoadingScenarios(true);
      try {
        const data = await loadScenarios();
        setScenarios(data);
      } catch (error) {
        console.error('Error loading scenarios:', error);
      } finally {
        setIsLoadingScenarios(false);
      }
    };
    fetchScenarios();
  }, []);

  const selectedPattern = patterns?.find(p => p.id === selectedPatternId);
  
  // Detect shift system
  const system: System = detectSystem(shiftLengthHours);
  
  // Clear irrelevant shift keys when system changes
  useEffect(() => {
    const keys = activeShiftKeys(system);
    setRequiredPerDay(prev => {
      const updated: Partial<Record<ShiftKey, number>> = {};
      keys.forEach(k => {
        if (prev[k] !== undefined) {
          updated[k] = prev[k];
        }
      });
      return updated;
    });
  }, [system]);

  // Save current scenario
  const handleSaveScenario = async () => {
    if (!selectedPattern || !result) {
      toast.error('No results to save - please select a pattern first');
      return;
    }

    const name = scenarioName.trim() || 
      `${selectedPattern.name} – ${new Date().toLocaleDateString()}`;

    setIsSaving(true);
    try {
      const scenarioData: SaveScenarioInput = {
        name,
        pattern_id: selectedPattern.id,
        pattern_name: selectedPattern.name,
        staff_count: staffCount ? Number(staffCount) : null,
        shift_length: shiftLengthHours,
        buffer_percent: bufferPct,
        required_shifts_per_day: requiredShiftsPerDay,
        avg_weekly_hours: result.hoursPerStaffPerWeek,
        required_staff: result.requiredStaff,
        utilization_pct: result.utilizationPct,
        is_wtd_compliant: wtdStatus?.success ?? false,
        total_breaches: wtdStatus?.metrics.breachWeeks.length ?? 0,
        avg_rolling: wtdStatus?.metrics.rollingAvg ?? null,
        max_rolling: wtdStatus?.metrics.maxRolling ?? null,
        recommendations,
        standard_contract_hours: standardContractHours
      };

      await saveScenario(scenarioData);
      toast.success('Scenario saved successfully');
      
      // Reload scenarios
      const updatedScenarios = await loadScenarios();
      setScenarios(updatedScenarios);
      setScenarioName('');
    } catch (error) {
      console.error('Error saving scenario:', error);
      toast.error('Failed to save scenario');
    } finally {
      setIsSaving(false);
    }
  };

  // Load a saved scenario
  const handleLoadScenario = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    console.log('📂 Loading scenario:', scenario.name);

    // Restore pattern
    if (scenario.pattern_id) {
      setSelectedPatternId(scenario.pattern_id);
    }

    // Restore inputs
    setShiftLengthHours(Number(scenario.shift_length));
    setBufferPct(Number(scenario.buffer_percent));
    setRequiredShiftsPerDay(scenario.required_shifts_per_day);
    if (scenario.staff_count) {
      setStaffCount(String(scenario.staff_count));
    }

    toast.success(`Loaded scenario: ${scenario.name}`);
  };

  // Delete a scenario
  const handleDeleteScenario = async (scenarioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this scenario?')) return;

    try {
      await deleteScenario(scenarioId);
      toast.success('Scenario deleted');
      const updatedScenarios = await loadScenarios();
      setScenarios(updatedScenarios);
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast.error('Failed to delete scenario');
    }
  };

  // Recalculate on input change
  useEffect(() => {
    if (!selectedPattern) {
      setResult(null);
      return;
    }

    try {
      const input: FeasibilityInput = {
        pattern: {
          sequence: Array.isArray(selectedPattern.sequence) 
            ? (selectedPattern.sequence as string[])
            : [],
          cycle_length: selectedPattern.cycle_length,
          avg_weekly_hours: selectedPattern.avg_weekly_hours,
          teams_required: selectedPattern.teams_required
        },
        shiftLengthHours,
        requiredShiftsPerDay,
        bufferPercent: bufferPct,
        currentStaffCount: staffCount ? Number(staffCount) : undefined,
        standardContractHours,
        wtdRules
      };

      const calculatedResult = calculateFeasibility(input);
      setResult(calculatedResult);
      console.log('📊 Feasibility calculated:', calculatedResult);
    } catch (error) {
      console.error('❌ Error calculating feasibility:', error);
      toast.error('Error calculating feasibility');
    }
  }, [selectedPattern, shiftLengthHours, requiredShiftsPerDay, wtdRules, bufferPct, staffCount]);

  // Calculate WTD simulation data
  const wtdSimulationData = result && selectedPattern && showWTDSimulation
    ? simulateWTD({
        pattern: { 
          sequence: Array.isArray(selectedPattern.sequence) 
            ? (selectedPattern.sequence as string[]) 
            : [] 
        },
        shift_length: shiftLengthHours,
        weeks: 17
      })
    : null;

  const nonCompliantWeeks = wtdSimulationData?.filter(w => !w.compliant).length ?? 0;
  const complianceRate = wtdSimulationData 
    ? ((17 - nonCompliantWeeks) / 17 * 100).toFixed(1) 
    : '0';

  // Compute unified WTD status when simulation data or pattern changes
  useEffect(() => {
    if (wtdSimulationData && wtdSimulationData.length > 0 && selectedPattern) {
      const summary = getWTDSimulationSummary(wtdSimulationData);
      setWtdSummary(summary);
      
      // Compute unified WTD status
      const status = computeWTDStatus({
        pattern: {
          sequence: Array.isArray(selectedPattern.sequence)
            ? (selectedPattern.sequence as string[])
            : []
        },
        shiftLength: shiftLengthHours,
        simulation: wtdSimulationData,
        wtdRules
      });
      setWtdStatus(status);
      
      // Generate recommendations if there are violations
      if (!status.success && selectedPattern) {
        const recs = recommendAdjustments(
          selectedPattern,
          summary.totalBreaches,
          summary.avgRolling,
          summary.maxRolling
        );
        setRecommendations(recs);
      } else {
        setRecommendations([]);
      }
    } else {
      setWtdSummary(null);
      setWtdStatus(null);
      setRecommendations([]);
    }
  }, [wtdSimulationData, selectedPattern, shiftLengthHours, wtdRules]);

  // Diagnose rest violations when pattern or shift config changes (for chip highlighting)
  useEffect(() => {
    if (!selectedPattern || !selectedPattern.sequence) {
      setRestViolations([]);
      return;
    }

    const sequence = Array.isArray(selectedPattern.sequence)
      ? (selectedPattern.sequence as string[])
      : [];

    if (sequence.length === 0) {
      setRestViolations([]);
      return;
    }

    const shiftSystem = shiftLengthHours === 12 ? '12h' : '8h';
    const diagnostics = diagnosePattern(sequence, { shiftSystem });
    setRestViolations(diagnostics.violations);
    
    console.log('🔬 Rest diagnostics:', diagnostics);
  }, [selectedPattern, shiftLengthHours]);
  
  // Clear stale WTD status when inputs change
  useEffect(() => {
    setWtdStatus(null);
  }, [selectedPattern?.id, shiftLengthHours, bufferPct]);

  const handleSaveSetup = () => {
    if (!result || !selectedPattern) return;

    const feasibilityConfig = {
      patternId: selectedPatternId,
      patternName: selectedPattern.name,
      shiftLength: shiftLengthHours,
      requiredShiftsPerDay,
      bufferPct,
      staffCount: staffCount ? Number(staffCount) : null,
      requiredStaff: result.requiredStaff,
      standardContractHours,
      timestamp: new Date().toISOString(),
      system,
      requiredPerDay
    };

    localStorage.setItem('feasibilityConfig', JSON.stringify(feasibilityConfig));
    toast.success('Configuration saved! Use it in Roster Setup.');
  };

  // Jump to first violation in monthly calendar (if calendar is rendered)
  const jumpToFirstViolation = () => {
    if (!restViolations?.length || !selectedPattern) {
      toast.error('No violations to jump to');
      return;
    }
    
    const v = restViolations[0];
    const cycleLen = selectedPattern.cycle_length;
    
    // Use current month (or default to current date)
    const now = new Date();
    const visibleMonthStartISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    
    // Use pattern_start_date if available, otherwise use month start
    const cycleStartISO = (selectedPattern as any).pattern_start_date ?? visibleMonthStartISO;
    
    const targetDate = firstDateForCycleIndex(visibleMonthStartISO, cycleStartISO, cycleLen, v.toIdx);
    
    if (!targetDate) {
      toast.error('Could not find violation date in current month');
      return;
    }
    
    const id = `day-${format(targetDate, 'yyyy-MM-dd')}`;
    const el = document.getElementById(id);
    
    if (!el) {
      toast.info(`Violation on day ${v.toIdx + 1} (${format(targetDate, 'MMM d, yyyy')}) - calendar not visible on this page`);
      return;
    }
    
    // Try virtualizer first
    const dayIndex = targetDate.getDate() - 1;
    const virtualizer = (window as any).__calendarVirtualizer__;
    
    if (virtualizer?.scrollToIndex) {
      virtualizer.scrollToIndex(dayIndex, { align: 'center' });
    } else {
      // Fallback to DOM scroll
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
    
    // Brief highlight
    el.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
    setTimeout(() => {
      el.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
    }, 2000);
    
    toast.success(`Jumped to violation on ${format(targetDate, 'MMM d, yyyy')}`);
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

  const applyRecommendation = (rec: AdjustmentRecommendation) => {
    console.log('🔧 Applying recommendation:', rec.action);
    
    if (rec.type === 'shift_reduction') {
      if (rec.action.includes('1 hour')) {
        setShiftLengthHours(prev => Math.max(6, prev - 1));
        toast.success('Shift length reduced by 1 hour');
      } else if (rec.action.includes('0.5')) {
        setShiftLengthHours(prev => Math.max(6, prev - 0.5));
        toast.success('Shift length reduced by 0.5 hours');
      }
    } else if (rec.type === 'staff_increase') {
      if (rec.action.includes('by 2')) {
        setStaffCount(prev => String(Number(prev || 0) + 2));
        toast.success('Staff count increased by 2');
      } else if (rec.action.includes('by 1')) {
        setStaffCount(prev => String(Number(prev || 0) + 1));
        toast.success('Staff count increased by 1');
      }
    } else if (rec.type === 'pattern_change') {
      if (rec.action.includes('4-On 4-Off')) {
        const fourOnPattern = patterns?.find(p => p.name.toLowerCase().includes('4-on 4-off'));
        if (fourOnPattern) {
          setSelectedPatternId(fourOnPattern.id);
          toast.success('Switched to 4-On 4-Off pattern');
        } else {
          toast.error('4-On 4-Off pattern not found');
        }
      } else if (rec.action.includes('8-hour')) {
        setShiftLengthHours(8);
        toast.success('Switched to 8-hour shifts');
      } else {
        toast.info(rec.description);
      }
    }
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
      pdf.text(`Required Shifts Per Day: ${requiredShiftsPerDay}`, 40, 110);
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
      pdf.text(`Standard Contract Hours: ${result.standardContractHours}h/week`, 40, 300);
      pdf.text(`Available Hours/Week: ${result.availableHoursPerWeek.toFixed(1)}h`, 40, 320);
      pdf.text(`Overtime Gap/Week: ${result.overtimeGapPerWeek.toFixed(1)}h`, 40, 340);
      
      if (result.surplus !== null) {
        pdf.text(`Surplus/Deficit: ${result.surplus > 0 ? '+' : ''}${result.surplus.toFixed(1)}`, 40, 360);
      }
      
      pdf.text(`WTD Compliant: ${result.isWTDCompliant ? 'Yes' : 'No'}`, 40, 380);
      
      // Capture chart if available
      const chartEl = document.querySelector('.recharts-wrapper') as HTMLElement;
      if (chartEl && staffCount && Number(staffCount) > 0) {
        const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 40, 410, 500, 250);
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

  const exportCSV = () => {
    if (!result || !selectedPattern) return;

    try {
      const rows = [
        ['Shift Scribe – Feasibility Report'],
        ['Generated', new Date().toLocaleString()],
        [''],
        ['Configuration'],
        ['Pattern', selectedPattern.name],
        ['System', selectedPattern.system],
        ['Cycle Length (weeks)', selectedPattern.cycle_length.toString()],
        ['Shift Length (hours)', shiftLengthHours.toString()],
        ['Required Shifts Per Day', requiredShiftsPerDay.toString()],
        ['Buffer %', bufferPct.toString()],
        ...(staffCount ? [['Current Staff Count', staffCount]] : []),
        [''],
        ['Results'],
        ['Work Ratio', `${(result.workRatio * 100).toFixed(1)}%`],
        ['Avg Weekly Hours Per Staff', `${result.hoursPerStaffPerWeek.toFixed(1)}h`],
        ['Weekly Demand', `${result.weeklyHoursRequired.toFixed(1)}h`],
        ['Required Staff', result.requiredStaff.toString()],
        ['Utilization', `${result.utilizationPct.toFixed(1)}%`],
        ['Standard Contract Hours', `${result.standardContractHours}h/week`],
        ['Available Hours/Week', `${result.availableHoursPerWeek.toFixed(1)}h`],
        ['Overtime Gap/Week', `${result.overtimeGapPerWeek.toFixed(1)}h`],
        ...(result.surplus !== null ? [['Surplus/Deficit', result.surplus > 0 ? `+${result.surplus.toFixed(1)}` : result.surplus.toFixed(1)]] : []),
        ['WTD Compliant', wtdStatus?.success ? 'Yes' : 'No'],
        ...(wtdStatus ? [['17-Week Rolling Avg', `${wtdStatus.metrics.rollingAvg.toFixed(1)}h`]] : []),
        ...(wtdStatus && wtdStatus.metrics.breachWeeks.length > 0 
          ? [['Weeks Exceeding Limit', wtdStatus.metrics.breachWeeks.length.toString()]] 
          : []),
        [''],
        ['WTD Constraints'],
        ['Max Weekly Hours', `${wtdRules.max_weekly_hours}h`],
        ['Min Daily Rest', `${wtdRules.min_daily_rest_hours}h`],
        ['Max Consecutive Days', wtdRules.max_consec_days.toString()],
        ['Max Consecutive Nights', wtdRules.max_consec_nights.toString()],
      ];

      if (result.warnings.length > 0) {
        rows.push(['']);
        rows.push(['Warnings']);
        result.warnings.forEach(warning => rows.push(['', warning]));
      }

      const csvContent = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Feasibility_Report_${selectedPattern.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('CSV report exported successfully');
    } catch (error) {
      console.error('❌ Error exporting CSV:', error);
      toast.error('Failed to export CSV report');
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
          requiredShiftsPerDay,
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
          standardContractHours: result.standardContractHours,
          availableHoursPerWeek: result.availableHoursPerWeek,
          overtimeGapPerWeek: result.overtimeGapPerWeek,
          isWTDCompliant: wtdStatus?.success ?? false,
          wtdMetrics: wtdStatus ? {
            rollingAvg: wtdStatus.metrics.rollingAvg,
            maxRolling: wtdStatus.metrics.maxRolling,
            breachWeeks: wtdStatus.metrics.breachWeeks,
            violations: wtdStatus.messages
          } : null,
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
                <SelectContent className="z-50 bg-popover">
                  {patterns?.length ? (
                    patterns.map(pattern => (
                      <SelectItem key={pattern.id} value={pattern.id}>
                        {pattern.name} ({pattern.system}) - {Array.isArray(pattern.sequence) ? pattern.sequence.join(' ') : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-muted-foreground text-sm">No patterns found</div>
                  )}
                </SelectContent>
              </Select>
              {selectedPattern && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground mb-2">
                      Cycle: {selectedPattern.cycle_length} weeks • System: {selectedPattern.system}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <TooltipProvider>
                        {Array.isArray(selectedPattern.sequence) && selectedPattern.sequence.map((code, i) => {
                          const codeStr = String(code);
                          const isViolationTo = restViolations.some(v => v.toIdx === i);
                          const isViolationFrom = restViolations.some(v => v.fromIdx === i);
                          const violation = restViolations.find(v => v.toIdx === i);
                          
                          const chipClasses = cn(
                            "inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-all",
                            isViolationTo 
                              ? "ring-2 ring-red-500 bg-red-50 text-red-900" 
                              : isViolationFrom
                              ? "ring-1 ring-red-300 bg-red-50/50 text-red-800"
                              : "bg-muted text-foreground"
                          );
                          
                          const chip = (
                            <span key={i} className={chipClasses}>
                              {codeStr}
                              <small className="ml-1 opacity-60">{i + 1}</small>
                            </span>
                          );
                          
                          if (violation) {
                            return (
                              <Tooltip key={i}>
                                <TooltipTrigger asChild>
                                  {chip}
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-semibold text-red-600">⚠ Rest Violation</p>
                                  <p className="text-xs mt-1">
                                    Day {violation.toIdx + 1}: {violation.fromCode}→{violation.toCode} only{' '}
                                    <strong>{violation.restHours.toFixed(1)}h</strong> rest
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    (needs ≥ 11h between shifts)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }
                          
                          return chip;
                        })}
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  {restViolations.length > 0 && (
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold mb-1">
                              {restViolations.length} rest violation{restViolations.length > 1 ? 's' : ''} detected
                            </p>
                            <ul className="text-xs space-y-0.5 ml-4 list-disc">
                              {restViolations.map((v, idx) => (
                                <li key={idx}>
                                  Day {v.toIdx + 1}: {v.fromCode}→{v.toCode} only {v.restHours.toFixed(1)}h rest (needs ≥ 11h)
                                </li>
                              ))}
                            </ul>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={jumpToFirstViolation}
                            className="shrink-0 h-7 text-xs"
                          >
                            Jump to Day
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
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

            {/* Standard Contract Hours */}
            <div className="space-y-2">
              <Label htmlFor="standardContractHours">Standard Contract Hours (per week)</Label>
              <Input
                id="standardContractHours"
                type="number"
                min="0"
                max="60"
                step="0.5"
                value={standardContractHours}
                onChange={(e) => setStandardContractHours(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Site-level standard hours for all staff (operational capacity baseline)</p>
            </div>

            {/* Per-Shift Staffing Requirements */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Per-Shift Staffing</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {system === '12h' ? '12-hour system uses D/N shifts' : '8-hour system uses E/L/N shifts'}
                </p>
              </div>
              
              {activeShiftKeys(system).map(shiftKey => (
                <div key={shiftKey} className="space-y-2">
                  <Label htmlFor={`shift-${shiftKey}`}>
                    {shiftKey === 'E' ? 'Early' : shiftKey === 'L' ? 'Late' : shiftKey === 'N' ? 'Night' : 'Day'} 
                    {' '}({shiftKey}) - Required/Day
                  </Label>
                  <Input
                    id={`shift-${shiftKey}`}
                    type="number"
                    min="0"
                    max="50"
                    placeholder="0"
                    value={requiredPerDay[shiftKey] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      setRequiredPerDay(prev => ({
                        ...prev,
                        [shiftKey]: val
                      }));
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Legacy Required Shifts Per Day (kept for backward compatibility) */}
            <div className="space-y-2">
              <Label htmlFor="reqShifts">Required Shifts Per Day (legacy)</Label>
              <Input
                id="reqShifts"
                type="number"
                min="1"
                max="10"
                value={requiredShiftsPerDay}
                onChange={(e) => setRequiredShiftsPerDay(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Total staff needed per shift period</p>
            </div>

            {/* WTD Rules Display */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-xs text-muted-foreground">WTD Constraints</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Max Weekly Hours: <span className="font-semibold">{wtdRules.max_weekly_hours}h</span></div>
                <div>Min Daily Rest: <span className="font-semibold">{wtdRules.min_daily_rest_hours}h</span></div>
                <div>Max Consec Days: <span className="font-semibold">{wtdRules.max_consec_days}</span></div>
                <div>Max Consec Nights: <span className="font-semibold">{wtdRules.max_consec_nights}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>Calculated staffing requirements</CardDescription>
            {result && (
              <div className="flex items-center gap-2 pt-2">
                <Switch 
                  id="wtd-simulation" 
                  checked={showWTDSimulation}
                  onCheckedChange={setShowWTDSimulation}
                />
                <Label htmlFor="wtd-simulation" className="text-sm cursor-pointer">
                  Show 17-Week WTD Simulation
                </Label>
              </div>
            )}
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

                {/* Operational Capacity */}
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-semibold">Operational Capacity</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Standard Contract Hours/Week:</span>
                    <span className="font-medium">{result.standardContractHours}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available Hours/Week:</span>
                    <span className="font-medium">{result.availableHoursPerWeek.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Overtime Gap/Week:</span>
                    <span className={cn(
                      "font-medium",
                      result.overtimeGapPerWeek > 0 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {result.overtimeGapPerWeek.toFixed(1)}h
                    </span>
                  </div>
                </div>

                {/* Pattern Workload Distribution */}
                <div className="mt-4">
                  <UtilisationChart
                    data={[
                      { 
                        metric: 'Active Days', 
                        value: result.activeDaysInCycle,
                        unit: ' days'
                      },
                      { 
                        metric: 'Rest Days', 
                        value: result.restDaysInCycle,
                        unit: ' days'
                      },
                      { 
                        metric: 'Buffer', 
                        value: result.bufferPct,
                        unit: '%'
                      },
                      {
                        metric: 'Hours/Staff/Week',
                        value: result.hoursPerStaffPerWeek,
                        unit: ' h'
                      }
                    ]}
                    title="Pattern Analysis"
                    description="Workload distribution across the pattern cycle"
                  />
                </div>

                {/* Per-Shift Staffing Breakdown */}
                {selectedPattern && Object.keys(requiredPerDay).length > 0 && (
                  <Card className="mt-4 border-muted">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Per-Shift Staffing Breakdown</CardTitle>
                      <CardDescription className="text-sm">
                        {system === '12h' ? '12-hour system (D/N shifts)' : '8-hour system (E/L/N shifts)'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2 font-semibold">Shift</th>
                              <th className="text-right py-2 px-2 font-semibold">Req/Day</th>
                              <th className="text-right py-2 px-2 font-semibold">Req/Week</th>
                              {selectedPattern.sequence && (
                                <>
                                  <th className="text-right py-2 px-2 font-semibold">In Pattern</th>
                                  {staffCount && Number(staffCount) > 0 && (
                                    <th className="text-right py-2 px-2 font-semibold">Coverage</th>
                                  )}
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {activeShiftKeys(system).map(shiftKey => {
                              const reqPerDay = requiredPerDay[shiftKey] || 0;
                              const weeklyReq = weeklyRequired(requiredPerDay, system, 7);
                              const cycleCounts = countShiftsInCycle(
                                Array.isArray(selectedPattern.sequence) 
                                  ? (selectedPattern.sequence as string[])
                                  : [],
                                system
                              );
                              
                              let coverage = 0;
                              if (staffCount && Number(staffCount) > 0 && selectedPattern.cycle_length) {
                                const coverageMap = calculateCoverage(
                                  cycleCounts,
                                  weeklyReq,
                                  selectedPattern.cycle_length,
                                  Number(staffCount)
                                );
                                coverage = coverageMap[shiftKey];
                              }
                              
                              const shiftLabel = 
                                shiftKey === 'E' ? 'Early' : 
                                shiftKey === 'L' ? 'Late' : 
                                shiftKey === 'N' ? 'Night' : 
                                'Day';
                              
                              return (
                                <tr key={shiftKey} className="border-b last:border-0">
                                  <td className="py-2 px-2 font-medium">
                                    {shiftLabel} ({shiftKey})
                                  </td>
                                  <td className="text-right py-2 px-2">
                                    {reqPerDay || '-'}
                                  </td>
                                  <td className="text-right py-2 px-2">
                                    {weeklyReq[shiftKey] || '-'}
                                  </td>
                                  {selectedPattern.sequence && (
                                    <>
                                      <td className="text-right py-2 px-2">
                                        {cycleCounts[shiftKey] || 0}
                                      </td>
                                      {staffCount && Number(staffCount) > 0 && (
                                        <td className="text-right py-2 px-2">
                                          <span className={cn(
                                            "font-semibold",
                                            coverage >= 100 ? "text-emerald-600" :
                                            coverage >= 80 ? "text-amber-600" :
                                            "text-red-600"
                                          )}>
                                            {coverage.toFixed(0)}%
                                          </span>
                                        </td>
                                      )}
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {staffCount && Number(staffCount) > 0 && (
                        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                          <p>
                            Coverage = (shifts provided per week ÷ shifts required per week) × 100%
                          </p>
                          <p className="mt-1">
                            <span className="text-emerald-600 font-semibold">≥100%</span> = adequate,{' '}
                            <span className="text-amber-600 font-semibold">80-99%</span> = understaffed,{' '}
                            <span className="text-red-600 font-semibold">&lt;80%</span> = critical
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Unified WTD Status Banner */}
                {wtdStatus && (
                  <div className="mt-4">
                    {wtdStatus.level === 'success' && (
                      <Alert className="bg-emerald-50 border-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertDescription className="text-emerald-800">
                          <p className="font-semibold">{wtdStatus.messages[0]}</p>
                          <div className="text-xs mt-2 space-y-1">
                            <p>• 17-week rolling average: {wtdStatus.metrics.rollingAvg.toFixed(1)}h/week (limit: 48h)</p>
                            <p>• Daily rest (11h): ✓ Compliant</p>
                            <p>• Weekly rest (24h): ✓ Compliant</p>
                            <p>• Consecutive limits: ✓ Compliant</p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {wtdStatus.level === 'warning' && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          <p className="font-semibold">⚠ WTD Compliance Warnings</p>
                          <ul className="text-xs mt-2 space-y-1 list-disc pl-4">
                            {wtdStatus.messages.map((msg, i) => (
                              <li key={i}>{msg}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {wtdStatus.level === 'error' && (
                      <Alert variant="destructive" className="bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <p className="font-semibold">🚫 WTD Compliance Violations</p>
                          <ul className="text-xs mt-2 space-y-1 list-disc pl-4">
                            {wtdStatus.messages.map((msg, i) => (
                              <li key={i}>{msg}</li>
                            ))}
                          </ul>
                          <div className="text-xs mt-3 pt-2 border-t border-red-300">
                            <p className="font-medium">Key Metrics:</p>
                            <div className="mt-1 space-y-0.5">
                              <p>• 17-week rolling average: <strong>{wtdStatus.metrics.rollingAvg.toFixed(1)}h/week</strong> {wtdStatus.metrics.rollingAvg > 48 && '(exceeds 48h limit)'}</p>
                              <p>• Peak rolling average: <strong>{wtdStatus.metrics.maxRolling.toFixed(1)}h/week</strong></p>
                              {wtdStatus.metrics.breachWeeks.length > 0 && (
                                <p>• Weeks exceeding limit: {wtdStatus.metrics.breachWeeks.length} week(s)</p>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

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
                          <ChartTooltip 
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

                {/* 17-Week WTD Simulation */}
                {showWTDSimulation && wtdSimulationData && (
                  <Card className="mt-4 border-muted">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">17-Week WTD Compliance Simulation</CardTitle>
                      <CardDescription className="text-sm">
                        Rolling average weekly hours (limit: 48 h) — compliance{' '}
                        <span className={
                          parseFloat(complianceRate) === 100 
                            ? 'text-primary font-semibold' 
                            : 'text-destructive font-semibold'
                        }>
                          {complianceRate}%
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 mb-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart 
                            data={wtdSimulationData} 
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                          >
                            <XAxis 
                              dataKey="week" 
                              label={{ value: 'Week', position: 'insideBottomRight', offset: -5 }}
                            />
                            <YAxis 
                              domain={[30, 60]} 
                              label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                            />
                            <ChartTooltip 
                              formatter={(value: number) => `${value} h`}
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem'
                              }}
                            />
                            <ReferenceLine 
                              y={48} 
                              stroke="hsl(var(--destructive))" 
                              strokeDasharray="4 2" 
                              label={{ value: '48 h limit', fill: 'hsl(var(--destructive))' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="rolling_avg" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2} 
                              dot={false}
                              name="Rolling Avg"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Recommendations for fixing violations */}
                      {recommendations.length > 0 && wtdStatus && !wtdStatus.success && (
                        <Card className="border-orange-200 bg-orange-50/50 mt-3">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              Suggested Corrective Actions
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Apply these adjustments to restore WTD compliance
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {recommendations.map((rec, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-start justify-between gap-3 p-3 bg-card rounded-lg border"
                              >
                                <div className="flex-1 space-y-1">
                                  <p className="font-medium text-sm">{rec.action}</p>
                                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                                  <div className="flex gap-2 items-center mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      rec.priority === 'high' 
                                        ? 'bg-red-100 text-red-700' 
                                        : rec.priority === 'medium'
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {rec.priority} priority
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => applyRecommendation(rec)}
                                  className="shrink-0"
                                >
                                  Apply
                                </Button>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                )}


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
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      onClick={exportPDF} 
                      variant="default"
                      size="sm"
                      disabled={isExporting || !result.isWTDCompliant}
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-1" />
                      )}
                      PDF
                    </Button>
                    <Button 
                      onClick={exportCSV} 
                      variant="outline"
                      size="sm"
                      disabled={isExporting}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      CSV
                    </Button>
                    <Button 
                      onClick={exportJSON} 
                      variant="outline"
                      size="sm"
                      disabled={isExporting}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      JSON
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

                {/* Compare Scenarios Link */}
                <Button 
                  onClick={() => navigate('/scenarios/compare')}
                  variant="outline"
                  className="w-full mt-2"
                  disabled={scenarios.length < 1}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Compare Scenarios
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scenario Management */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Save or Load Scenario</CardTitle>
              <CardDescription>Persist and compare different configuration setups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Save Section */}
              <div className="space-y-2">
                <Label htmlFor="scenarioName">Save Current Configuration</Label>
                <div className="flex gap-2">
                  <Input
                    id="scenarioName"
                    placeholder="Enter scenario name (optional)"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSaveScenario}
                    disabled={isSaving || !result}
                    variant="secondary"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-generated name if left blank: {selectedPattern?.name} – {new Date().toLocaleDateString()}
                </p>
              </div>

              {/* Load Section */}
              <div className="space-y-2 pt-4 border-t">
                <Label>Load Saved Scenario ({scenarios.length})</Label>
                {isLoadingScenarios ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : scenarios.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {scenarios.map((scenario) => (
                      <div
                        key={scenario.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => handleLoadScenario(scenario.id!)}
                      >
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">{scenario.name}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{scenario.pattern_name}</span>
                            <span>Staff: {scenario.staff_count ?? 'N/A'}</span>
                            <span>Shift: {scenario.shift_length}h</span>
                            <span className={scenario.is_wtd_compliant ? 'text-green-600' : 'text-destructive'}>
                              {scenario.is_wtd_compliant ? '✅ Compliant' : '⚠️ Breaches: ' + scenario.total_breaches}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteScenario(scenario.id!, e)}
                          className="shrink-0 ml-2"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription className="text-sm">
                      No saved scenarios yet. Configure a pattern and click "Save" above.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FeasibilityCalculator;
