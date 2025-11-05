import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  FileText, 
  AlertTriangle, 
  CheckCircle2,
  Loader2,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { loadScenarios, type FeasibilityScenario } from '@/services/feasibility/scenarios';
import { supabase } from '@/integrations/supabase/client';
import { simulateWTD, getWTDSimulationSummary } from '@/utils/feasibility/wtdSimulation';
import { 
  calculateFeasibility, 
  type FeasibilityInput,
  requiredHoursPerWeek,
  availableHoursPerWeek,
  overtimeSlack,
  fteGap,
  requiredHoursOver17Weeks
} from '@/services/feasibility/calculateFeasibility';
import { DEFAULT_WTD_RULES } from '@/engine2/constraints/wtdRules';
import { pickBestScenario, type ScenarioEval } from '@/services/feasibility/recommendBest';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid,
  ReferenceLine,
  Cell
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface EnrichedScenario extends FeasibilityScenario {
  pattern?: any;
  computed?: {
    hoursPerStaffPerWeek: number;
    requiredStaff: number;
    isWTDCompliant: boolean;
    wtdChecks: any;
    simulation: any[];
    simulationSummary: any;
    // Overtime/capacity metrics (computed on the fly if missing)
    contracted_hours: number;
    required_hours_week: number;
    available_hours_week: number;
    overtime_week: number;
    slack_week: number;
    reqFTE: number;
    haveFTE: number;
    gapFTE: number;
    overtime_17_weeks: number;
  };
}

const ScenarioComparison = () => {
  console.log('🔍 ScenarioComparison component rendered');
  
  const navigate = useNavigate();
  
  const [scenarios, setScenarios] = useState<FeasibilityScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecomputing, setIsRecomputing] = useState(false);
  
  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [compareId1, setCompareId1] = useState<string | null>(null);
  const [compareId2, setCompareId2] = useState<string | null>(null);
  
  const [enrichedScenarios, setEnrichedScenarios] = useState<{
    baseline?: EnrichedScenario;
    compare1?: EnrichedScenario;
    compare2?: EnrichedScenario;
  }>({});
  
  const [recommendedId, setRecommendedId] = useState<string | null>(null);

  // Load all scenarios and restore persisted baseline
  useEffect(() => {
    const fetchScenarios = async () => {
      setIsLoading(true);
      try {
        const data = await loadScenarios();
        setScenarios(data);
        console.log(`✅ Loaded ${data.length} scenarios`);
        
        // Restore persisted baseline from localStorage
        const savedBaselineId = localStorage.getItem('scenarioBaselineId');
        if (savedBaselineId && data.some(s => s.id === savedBaselineId)) {
          setBaselineId(savedBaselineId);
          console.log('✅ Restored baseline from localStorage:', savedBaselineId);
        }
      } catch (error) {
        console.error('❌ Error loading scenarios:', error);
        toast.error('Failed to load scenarios');
      } finally {
        setIsLoading(false);
      }
    };
    fetchScenarios();
  }, []);

  // Enrich and compute scenario data
  const enrichScenario = async (scenario: FeasibilityScenario): Promise<EnrichedScenario> => {
    console.log('🔬 Enriching scenario:', scenario.name);
    
    // Fetch pattern
    let pattern = null;
    if (scenario.pattern_id) {
      const { data, error } = await supabase
        .from('site_patterns')
        .select('*')
        .eq('id', scenario.pattern_id)
        .single();
      
      if (error) {
        console.error('❌ Error fetching pattern:', error);
      } else {
        pattern = data;
      }
    }

    // Recompute feasibility and WTD simulation
    let computed = null;
    if (pattern) {
      try {
        const input: FeasibilityInput = {
          pattern: {
            sequence: Array.isArray(pattern.sequence) ? (pattern.sequence as string[]) : [],
            cycle_length: pattern.cycle_length,
            avg_weekly_hours: pattern.avg_weekly_hours,
            teams_required: pattern.teams_required
          },
          shiftLengthHours: Number(scenario.shift_length),
          requiredShiftsPerDay: scenario.required_shifts_per_day,
          bufferPercent: Number(scenario.buffer_percent),
          currentStaffCount: scenario.staff_count ? Number(scenario.staff_count) : undefined,
          standardContractHours: scenario.standard_contract_hours ?? 37.5,
          wtdRules: DEFAULT_WTD_RULES
        };

        const feasibility = calculateFeasibility(input);
        
        const simulation = simulateWTD({
          pattern: { sequence: input.pattern.sequence },
          shift_length: Number(scenario.shift_length),
          weeks: 17
        });
        
        const simulationSummary = getWTDSimulationSummary(simulation);

        // Compute overtime/capacity metrics (fallback if not in saved scenario)
        const contractedHours = scenario.contracted_hours ?? scenario.standard_contract_hours ?? 37.5;
        const requiredHrsWeek = scenario.required_hours_week ?? feasibility.weeklyHoursRequired;
        const availableHrsWeek = scenario.available_hours_week ?? feasibility.availableHoursPerWeek;
        const overtimeWeek = scenario.overtime_week ?? feasibility.overtimeGapPerWeek;
        const slackWeek = scenario.slack_week ?? Math.max(0, availableHrsWeek - requiredHrsWeek);
        const reqFTE = scenario.reqFTE ?? feasibility.fteRequired;
        const haveFTE = scenario.haveFTE ?? feasibility.fteAvailable;
        const gapFTE = scenario.gapFTE ?? (reqFTE - haveFTE);
        const overtime17Weeks = scenario.overtime_17_weeks ?? (overtimeWeek * 17);

        computed = {
          hoursPerStaffPerWeek: feasibility.hoursPerStaffPerWeek,
          requiredStaff: feasibility.requiredStaff,
          isWTDCompliant: feasibility.isWTDCompliant,
          wtdChecks: feasibility.wtdChecks,
          simulation,
          simulationSummary,
          // Overtime/capacity metrics
          contracted_hours: contractedHours,
          required_hours_week: requiredHrsWeek,
          available_hours_week: availableHrsWeek,
          overtime_week: overtimeWeek,
          slack_week: slackWeek,
          reqFTE,
          haveFTE,
          gapFTE,
          overtime_17_weeks: overtime17Weeks
        };
      } catch (error) {
        console.error('❌ Error computing feasibility:', error);
      }
    }

    return {
      ...scenario,
      pattern,
      computed
    };
  };

  // Recompute all selected scenarios
  const handleRecompute = async () => {
    setIsRecomputing(true);
    try {
      const enriched: any = {};
      
      if (baselineId) {
        const scenario = scenarios.find(s => s.id === baselineId);
        if (scenario) {
          enriched.baseline = await enrichScenario(scenario);
        }
      }
      
      if (compareId1) {
        const scenario = scenarios.find(s => s.id === compareId1);
        if (scenario) {
          enriched.compare1 = await enrichScenario(scenario);
        }
      }
      
      if (compareId2) {
        const scenario = scenarios.find(s => s.id === compareId2);
        if (scenario) {
          enriched.compare2 = await enrichScenario(scenario);
        }
      }
      
      setEnrichedScenarios(enriched);
      toast.success('Scenarios recomputed successfully');
    } catch (error) {
      console.error('❌ Error recomputing scenarios:', error);
      toast.error('Failed to recompute scenarios');
    } finally {
      setIsRecomputing(false);
    }
  };

  // Auto-recompute when selections change
  useEffect(() => {
    if (baselineId || compareId1 || compareId2) {
      handleRecompute();
    }
  }, [baselineId, compareId1, compareId2]);

  // Calculate deltas
  const calculateDelta = (baseline: number | null, compare: number | null): { value: number; direction: 'up' | 'down' | 'neutral' } | null => {
    if (baseline === null || compare === null) return null;
    const delta = compare - baseline;
    return {
      value: delta,
      direction: Math.abs(delta) < 0.01 ? 'neutral' : delta > 0 ? 'up' : 'down'
    };
  };

  // Set recommended scenario as baseline
  const handleSetAsBaseline = () => {
    if (!recommendedId) return;
    
    console.log('🔄 Setting recommended scenario as baseline:', recommendedId);
    
    // Enforce distinct scenarios with swap logic
    let newBaselineId = recommendedId;
    let newCompareId1 = compareId1;
    let newCompareId2 = compareId2;
    
    if (compareId1 === recommendedId) {
      // Swap: old baseline goes to compare slot 1, recommended becomes baseline
      newCompareId1 = baselineId;
    } else if (compareId2 === recommendedId) {
      // Swap: old baseline goes to compare slot 2, recommended becomes baseline
      newCompareId2 = baselineId;
    }
    
    setBaselineId(newBaselineId);
    setCompareId1(newCompareId1);
    setCompareId2(newCompareId2);
    
    // Persist to localStorage
    localStorage.setItem('scenarioBaselineId', newBaselineId);
    
    // Clear recommendation highlight
    setRecommendedId(null);
    
    toast.success('Baseline updated successfully');
  };

  // Recommend best scenario
  const handleRecommendBest = () => {
    console.log('🎯 Recommending best scenario...');
    
    if (!enrichedScenarios.baseline) {
      toast.error('Please select a baseline scenario first');
      return;
    }
    
    const candidates: ScenarioEval[] = [];
    
    if (enrichedScenarios.compare1?.computed?.simulationSummary) {
      candidates.push({
        id: enrichedScenarios.compare1.id,
        name: enrichedScenarios.compare1.name,
        staffCount: enrichedScenarios.compare1.staff_count ?? 0,
        metrics: {
          totalBreaches: enrichedScenarios.compare1.computed.simulationSummary.totalBreaches,
          avgRolling: enrichedScenarios.compare1.computed.simulationSummary.avgRolling
        }
      });
    }
    
    if (enrichedScenarios.compare2?.computed?.simulationSummary) {
      candidates.push({
        id: enrichedScenarios.compare2.id,
        name: enrichedScenarios.compare2.name,
        staffCount: enrichedScenarios.compare2.staff_count ?? 0,
        metrics: {
          totalBreaches: enrichedScenarios.compare2.computed.simulationSummary.totalBreaches,
          avgRolling: enrichedScenarios.compare2.computed.simulationSummary.avgRolling
        }
      });
    }
    
    if (candidates.length === 0) {
      toast.error('Please select at least one comparison scenario');
      return;
    }
    
    const baselineEval: ScenarioEval = {
      id: enrichedScenarios.baseline.id,
      name: enrichedScenarios.baseline.name,
      staffCount: enrichedScenarios.baseline.staff_count ?? 0,
      metrics: {
        totalBreaches: enrichedScenarios.baseline.computed?.simulationSummary?.totalBreaches ?? 0,
        avgRolling: enrichedScenarios.baseline.computed?.simulationSummary?.avgRolling ?? 0
      }
    };
    
    const best = pickBestScenario(baselineEval, candidates);
    
    if (best) {
      setRecommendedId(best.id);
      toast.success(`Recommended: ${best.name}`);
    }
  };

  // Use baseline in roster setup
  const handleUseBaseline = () => {
    if (!enrichedScenarios.baseline) return;
    
    const baseline = enrichedScenarios.baseline;
    const config = {
      patternId: baseline.pattern_id,
      patternName: baseline.pattern_name,
      shiftLength: baseline.shift_length,
      requiredShiftsPerDay: baseline.required_shifts_per_day,
      bufferPct: baseline.buffer_percent,
      staffCount: baseline.staff_count,
      requiredStaff: baseline.computed?.requiredStaff,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('feasibilityConfig', JSON.stringify(config));
    toast.success('Baseline configuration saved for roster setup');
    navigate('/roster-config');
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ['Scenario Comparison Export'],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['Scenario', 'Pattern', 'Staff Count', 'Shift Length', 'Buffer %', 'Contract h/w', 'Req h/w', 'Avail h/w', 'OT h/w', 'Slack h/w', 'Req FTE', 'Have FTE', 'Gap FTE', 'OT 17w h', 'Weekly Hours/Staff', 'Required Staff', 'Total Breaches', 'Avg Rolling', 'WTD Compliant', 'Baseline', 'Recommended']
    ];

    [enrichedScenarios.baseline, enrichedScenarios.compare1, enrichedScenarios.compare2]
      .filter(Boolean)
      .forEach(scenario => {
        if (!scenario) return;
        const c = scenario.computed;
        rows.push([
          scenario.name,
          scenario.pattern_name,
          String(scenario.staff_count ?? 'N/A'),
          String(scenario.shift_length),
          String(scenario.buffer_percent),
          c?.contracted_hours?.toFixed(1) ?? 'N/A',
          c?.required_hours_week?.toFixed(1) ?? 'N/A',
          c?.available_hours_week?.toFixed(1) ?? 'N/A',
          c?.overtime_week?.toFixed(1) ?? 'N/A',
          c?.slack_week?.toFixed(1) ?? 'N/A',
          c?.reqFTE?.toFixed(1) ?? 'N/A',
          c?.haveFTE?.toFixed(1) ?? 'N/A',
          c?.gapFTE?.toFixed(1) ?? 'N/A',
          c?.overtime_17_weeks?.toFixed(1) ?? 'N/A',
          c?.hoursPerStaffPerWeek?.toFixed(1) ?? 'N/A',
          c?.requiredStaff?.toFixed(1) ?? 'N/A',
          String(c?.simulationSummary?.totalBreaches ?? scenario.total_breaches),
          c?.simulationSummary?.avgRolling?.toFixed(1) ?? scenario.avg_rolling?.toFixed(1) ?? 'N/A',
          c?.isWTDCompliant ? 'Yes' : 'No',
          scenario.id === baselineId ? 'Yes' : 'No',
          scenario.id === recommendedId ? 'Yes' : 'No'
        ]);
      });

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scenario-comparison-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  };

  // Export PDF
  const exportPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      pdf.setFontSize(20);
      pdf.text('Scenario Comparison Report', 14, 20);
      
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      
      let y = 40;
      
      [enrichedScenarios.baseline, enrichedScenarios.compare1, enrichedScenarios.compare2]
        .filter(Boolean)
        .forEach((scenario, idx) => {
          if (!scenario) return;
          
          pdf.setFontSize(12);
          let scenarioTitle = `Scenario ${idx + 1}: ${scenario.name}`;
          if (scenario.id === baselineId) scenarioTitle += ' [BASELINE]';
          if (scenario.id === recommendedId) scenarioTitle += ' ⭐ RECOMMENDED';
          pdf.text(scenarioTitle, 14, y);
          y += 6;
          
          pdf.setFontSize(10);
          pdf.text(`Pattern: ${scenario.pattern_name}`, 20, y);
          y += 5;
          pdf.text(`Staff: ${scenario.staff_count ?? 'N/A'}, Shift: ${scenario.shift_length}h, Buffer: ${scenario.buffer_percent}%`, 20, y);
          y += 5;
          pdf.text(`Weekly Hours/Staff: ${scenario.computed?.hoursPerStaffPerWeek.toFixed(1) ?? 'N/A'}h`, 20, y);
          y += 5;
          pdf.text(`Breaches: ${scenario.computed?.simulationSummary?.totalBreaches ?? scenario.total_breaches}, Avg Rolling: ${scenario.computed?.simulationSummary?.avgRolling?.toFixed(1) ?? scenario.avg_rolling?.toFixed(1) ?? 'N/A'}h`, 20, y);
          y += 5;
          
          // Overtime/capacity metrics
          const c = scenario.computed;
          if (c) {
            pdf.text(`Contract: ${c.contracted_hours?.toFixed(1)}h/w, Req: ${c.required_hours_week?.toFixed(1)}h/w, Avail: ${c.available_hours_week?.toFixed(1)}h/w`, 20, y);
            y += 5;
            pdf.text(`OT: ${c.overtime_week?.toFixed(1)}h/w, Slack: ${c.slack_week?.toFixed(1)}h/w, Gap FTE: ${c.gapFTE?.toFixed(1)}, OT 17w: ${c.overtime_17_weeks?.toFixed(1)}h`, 20, y);
            y += 8;
          } else {
            y += 3;
          }
        });

      // Capture charts if available
      const chartEl = document.getElementById('comparison-charts');
      if (chartEl) {
        const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (y + imgHeight > 280) {
          pdf.addPage();
          y = 20;
        }
        
        pdf.addImage(imgData, 'PNG', 14, y, imgWidth, imgHeight);
      }

      pdf.save(`scenario-comparison-${Date.now()}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Render scenario card
  const renderScenarioCard = (scenario: EnrichedScenario | undefined, label: string, isBaseline: boolean) => {
    if (!scenario) {
      return (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">{label}</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground py-12">
            <p>No scenario selected</p>
          </CardContent>
        </Card>
      );
    }

    const { computed } = scenario;
    const isRecommended = scenario.id === recommendedId;

    return (
      <Card className={cn(
        'relative transition-all',
        isBaseline && 'border-primary',
        isRecommended && 'ring-2 ring-green-500 shadow-lg'
      )}>
        {isRecommended && (
          <div className="absolute -top-2 -right-2 z-10 flex gap-2 items-center">
            <span className="rounded-full bg-green-600 text-white text-xs px-2 py-1 shadow-md font-medium">
              ⭐ Recommended
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSetAsBaseline}
              disabled={baselineId === recommendedId}
              title={baselineId === recommendedId ? 'Already baseline' : 'Promote to baseline'}
              className="h-6 text-xs px-2"
            >
              Set as Baseline
            </Button>
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {label}
            {isBaseline && <Badge variant="default">Baseline</Badge>}
          </CardTitle>
          <CardDescription className="text-sm">{scenario.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pattern Info */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Pattern</p>
            <p className="text-sm text-muted-foreground">
              {scenario.pattern_name}
              {scenario.pattern && ` (${scenario.pattern.cycle_length} week cycle)`}
            </p>
            {!scenario.pattern && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">Pattern not found</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Shift Length</p>
              <p className="font-semibold">{scenario.shift_length}h</p>
            </div>
            <div>
              <p className="text-muted-foreground">Staff Count</p>
              <p className="font-semibold">{scenario.staff_count ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Buffer</p>
              <p className="font-semibold">{scenario.buffer_percent}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Shifts/Day</p>
              <p className="font-semibold">{scenario.required_shifts_per_day}</p>
            </div>
          </div>

          {/* Computed Metrics */}
          {computed && (
            <div className="space-y-3 pt-3 border-t">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Hrs/Staff/Week</p>
                  <p className="font-semibold">{computed.hoursPerStaffPerWeek.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Required Staff</p>
                  <p className="font-semibold">{computed.requiredStaff.toFixed(1)}</p>
                </div>
              </div>

              {/* WTD Compliance */}
              <div className="space-y-2">
                <p className="text-sm font-medium">WTD Compliance</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    {computed.wtdChecks.restPeriodsOk ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    )}
                    <span>11h Rest</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {computed.wtdChecks.weeklyAverageOk ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    )}
                    <span>48h Avg</span>
                  </div>
                </div>
              </div>

              {/* 17-Week Summary */}
              <div className="space-y-1">
                <p className="text-sm font-medium">17-Week Simulation</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Breaches</p>
                    <p className={`font-semibold ${computed.simulationSummary.totalBreaches === 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {computed.simulationSummary.totalBreaches}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Rolling</p>
                    <p className={`font-semibold ${computed.simulationSummary.avgRolling <= 48 ? 'text-green-600' : 'text-destructive'}`}>
                      {computed.simulationSummary.avgRolling.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>

              {/* Overall Status */}
              <Badge variant={computed.isWTDCompliant ? 'default' : 'destructive'} className="w-full justify-center">
                {computed.isWTDCompliant ? '✅ Compliant' : '⚠️ Non-Compliant'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Empty state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle>No Scenarios Found</CardTitle>
            <CardDescription>You need to create scenarios in the Feasibility Calculator first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Go to the Feasibility Calculator, configure a pattern, and save it as a scenario to enable comparisons.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/feasibility')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Feasibility Calculator
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare chart data
  const comparisonBarData = [
    {
      metric: 'Total Breaches',
      baseline: enrichedScenarios.baseline?.computed?.simulationSummary?.totalBreaches ?? 0,
      compare1: enrichedScenarios.compare1?.computed?.simulationSummary?.totalBreaches ?? 0,
      compare2: enrichedScenarios.compare2?.computed?.simulationSummary?.totalBreaches ?? 0
    },
    {
      metric: 'Avg Rolling (h)',
      baseline: enrichedScenarios.baseline?.computed?.simulationSummary?.avgRolling ?? 0,
      compare1: enrichedScenarios.compare1?.computed?.simulationSummary?.avgRolling ?? 0,
      compare2: enrichedScenarios.compare2?.computed?.simulationSummary?.avgRolling ?? 0
    }
  ];

  // Prepare 17-week simulation overlay
  const weeks = Array.from({ length: 17 }, (_, i) => i + 1);
  const simulationData = weeks.map(week => {
    const dataPoint: any = { week };
    
    if (enrichedScenarios.baseline?.computed?.simulation) {
      dataPoint.baseline = enrichedScenarios.baseline.computed.simulation[week - 1]?.rolling_avg ?? 0;
    }
    
    if (enrichedScenarios.compare1?.computed?.simulation) {
      dataPoint.compare1 = enrichedScenarios.compare1.computed.simulation[week - 1]?.rolling_avg ?? 0;
    }
    
    if (enrichedScenarios.compare2?.computed?.simulation) {
      dataPoint.compare2 = enrichedScenarios.compare2.computed.simulation[week - 1]?.rolling_avg ?? 0;
    }
    
    return dataPoint;
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/feasibility')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feasibility Calculator
        </Button>
        
        <h1 className="text-3xl font-bold flex items-center gap-3">
          Scenario Comparison Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Compare saved feasibility scenarios side-by-side with live WTD simulation
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Scenarios to Compare</CardTitle>
          <CardDescription>Choose up to 3 scenarios and recompute their metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="baseline">Baseline (A)</Label>
              <Select value={baselineId} onValueChange={setBaselineId}>
                <SelectTrigger id="baseline">
                  <SelectValue placeholder="Select baseline" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {scenarios.map(s => (
                    <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compare1">Compare (B)</Label>
              <Select value={compareId1} onValueChange={setCompareId1}>
                <SelectTrigger id="compare1">
                  <SelectValue placeholder="Select scenario" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="">None</SelectItem>
                  {scenarios.filter(s => s.id !== baselineId).map(s => (
                    <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compare2">Compare (C)</Label>
              <Select value={compareId2} onValueChange={setCompareId2}>
                <SelectTrigger id="compare2">
                  <SelectValue placeholder="Select scenario" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="">None</SelectItem>
                  {scenarios.filter(s => s.id !== baselineId && s.id !== compareId1).map(s => (
                    <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleRecompute} disabled={isRecomputing || !baselineId}>
              {isRecomputing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Recompute
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={handleRecommendBest}
              disabled={!enrichedScenarios.baseline || (!compareId1 && !compareId2)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Recommend Best Scenario
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={handleUseBaseline}
              disabled={!enrichedScenarios.baseline}
            >
              Use Baseline in Roster Setup
            </Button>

            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={!enrichedScenarios.baseline}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={!enrichedScenarios.baseline}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          {recommendedId && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Recommendation criteria (in order):</span> Fewest WTD breaches → Rolling avg ≤48h (or closest) → Minimal staff increase vs baseline.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {renderScenarioCard(enrichedScenarios.baseline, 'Baseline (A)', true)}
        {renderScenarioCard(enrichedScenarios.compare1, 'Compare (B)', false)}
        {renderScenarioCard(enrichedScenarios.compare2, 'Compare (C)', false)}
      </div>

      {/* Comprehensive Comparison Table */}
      {enrichedScenarios.baseline && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Overtime & Capacity Analysis</CardTitle>
            <CardDescription>Sortable comparison of staffing metrics across scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Scenario</th>
                    <th className="text-right p-2 font-medium">Contract h/w</th>
                    <th className="text-right p-2 font-medium">Req h/w</th>
                    <th className="text-right p-2 font-medium">Avail h/w</th>
                    <th className="text-right p-2 font-medium">OT h/w</th>
                    <th className="text-right p-2 font-medium">Slack h/w</th>
                    <th className="text-right p-2 font-medium">Req FTE</th>
                    <th className="text-right p-2 font-medium">Have FTE</th>
                    <th className="text-right p-2 font-medium">Gap FTE</th>
                    <th className="text-right p-2 font-medium">OT (17w) h</th>
                  </tr>
                </thead>
                <tbody>
                  {[enrichedScenarios.baseline, enrichedScenarios.compare1, enrichedScenarios.compare2]
                    .filter(Boolean)
                    .map((scenario, idx) => {
                      if (!scenario) return null;
                      const c = scenario.computed;
                      const isBaseline = scenario.id === baselineId;
                      const isRecommended = scenario.id === recommendedId;
                      return (
                        <tr 
                          key={scenario.id} 
                          className={cn(
                            'border-b',
                            isBaseline && 'bg-primary/5',
                            isRecommended && 'bg-green-50'
                          )}
                        >
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{scenario.name}</span>
                              {isBaseline && <Badge variant="default" className="text-xs">Baseline</Badge>}
                              {isRecommended && <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">⭐</Badge>}
                            </div>
                          </td>
                          <td className="text-right p-2">{c?.contracted_hours?.toFixed(1) ?? '—'}</td>
                          <td className="text-right p-2">{c?.required_hours_week?.toFixed(1) ?? '—'}</td>
                          <td className="text-right p-2">{c?.available_hours_week?.toFixed(1) ?? '—'}</td>
                          <td className={cn('text-right p-2', c && c.overtime_week > 0 && 'text-destructive font-semibold')}>
                            {c?.overtime_week != null ? c.overtime_week.toFixed(1) : '—'}
                          </td>
                          <td className={cn('text-right p-2', c && c.slack_week > 0 && 'text-green-600 font-semibold')}>
                            {c?.slack_week != null ? c.slack_week.toFixed(1) : '—'}
                          </td>
                          <td className="text-right p-2">{c?.reqFTE?.toFixed(1) ?? '—'}</td>
                          <td className="text-right p-2">{c?.haveFTE?.toFixed(1) ?? '—'}</td>
                          <td className={cn('text-right p-2', c && c.gapFTE > 0 && 'text-destructive font-semibold', c && c.gapFTE < 0 && 'text-green-600')}>
                            {c?.gapFTE != null ? (c.gapFTE > 0 ? `+${c.gapFTE.toFixed(1)}` : c.gapFTE.toFixed(1)) : '—'}
                          </td>
                          <td className={cn('text-right p-2', c && c.overtime_17_weeks > 0 && 'text-destructive font-semibold')}>
                            {c?.overtime_17_weeks != null ? c.overtime_17_weeks.toFixed(1) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <p><span className="font-medium">Legend:</span> Red = Overtime/Gap (needs more staff), Green = Slack/Surplus (capacity available)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delta Analysis */}
      {enrichedScenarios.baseline && (enrichedScenarios.compare1 || enrichedScenarios.compare2) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Delta vs Baseline</CardTitle>
            <CardDescription>Comparing improvements and regressions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Compare B vs Baseline */}
              {enrichedScenarios.compare1 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">B vs A: {enrichedScenarios.compare1.name}</h4>
                  <div className="space-y-2 text-sm">
                    <DeltaRow 
                      label="Staff Count"
                      delta={calculateDelta(
                        enrichedScenarios.baseline.staff_count,
                        enrichedScenarios.compare1.staff_count
                      )}
                      format={(v) => v.toFixed(0)}
                    />
                    <DeltaRow 
                      label="Shift Length"
                      delta={calculateDelta(
                        Number(enrichedScenarios.baseline.shift_length),
                        Number(enrichedScenarios.compare1.shift_length)
                      )}
                      format={(v) => `${v.toFixed(1)}h`}
                    />
                    <DeltaRow 
                      label="Weekly Hrs/Staff"
                      delta={calculateDelta(
                        enrichedScenarios.baseline.computed?.hoursPerStaffPerWeek ?? null,
                        enrichedScenarios.compare1.computed?.hoursPerStaffPerWeek ?? null
                      )}
                      format={(v) => `${v.toFixed(1)}h`}
                      reverse
                    />
                    <DeltaRow 
                      label="Total Breaches"
                      delta={calculateDelta(
                        enrichedScenarios.baseline.computed?.simulationSummary?.totalBreaches ?? null,
                        enrichedScenarios.compare1.computed?.simulationSummary?.totalBreaches ?? null
                      )}
                      format={(v) => v.toFixed(0)}
                      reverse
                    />
                    <DeltaRow 
                      label="Avg Rolling"
                      delta={calculateDelta(
                        enrichedScenarios.baseline.computed?.simulationSummary?.avgRolling ?? null,
                        enrichedScenarios.compare1.computed?.simulationSummary?.avgRolling ?? null
                      )}
                      format={(v) => `${v.toFixed(1)}h`}
                      reverse
                    />
                  </div>
                </div>
              )}

              {/* Compare C vs Baseline */}
              {enrichedScenarios.compare2 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">C vs A: {enrichedScenarios.compare2.name}</h4>
                  <div className="space-y-2 text-sm">
                    <DeltaRow 
                      label="Staff Count"
                      delta={calculateDelta(
                        enrichedScenarios.baseline.staff_count,
                        enrichedScenarios.compare2.staff_count
                      )}
                      format={(v) => v.toFixed(0)}
                    />
                    <DeltaRow 
                      label="Shift Length"
                      delta={calculateDelta(
                        Number(enrichedScenarios.baseline.shift_length),
                        Number(enrichedScenarios.compare2.shift_length)
                      )}
                      format={(v) => `${v.toFixed(1)}h`}
                    />
                    <DeltaRow 
                      label="Weekly Hrs/Staff"
                      delta={calculateDelta(
                        enrichedScenarios.baseline.computed?.hoursPerStaffPerWeek ?? null,
                        enrichedScenarios.compare2.computed?.hoursPerStaffPerWeek ?? null
                      )}
                      format={(v) => `${v.toFixed(1)}h`}
                      reverse
                    />
                    <DeltaRow 
                      label="Total Breaches"
                      delta={calculateDelta(
                        enrichedScenarios.baseline.computed?.simulationSummary?.totalBreaches ?? null,
                        enrichedScenarios.compare2.computed?.simulationSummary?.totalBreaches ?? null
                      )}
                      format={(v) => v.toFixed(0)}
                      reverse
                    />
                    <DeltaRow 
                      label="Avg Rolling"
                      delta={calculateDelta(
                        enrichedScenarios.baseline.computed?.simulationSummary?.avgRolling ?? null,
                        enrichedScenarios.compare2.computed?.simulationSummary?.avgRolling ?? null
                      )}
                      format={(v) => `${v.toFixed(1)}h`}
                      reverse
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {enrichedScenarios.baseline && (
        <div id="comparison-charts" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Comparison Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compliance Metrics Comparison</CardTitle>
              <CardDescription>Lower values are better</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {baselineId && <Bar dataKey="baseline" name={enrichedScenarios.baseline?.name || 'Baseline'} fill="hsl(var(--primary))" />}
                  {compareId1 && <Bar dataKey="compare1" name={enrichedScenarios.compare1?.name || 'Compare B'} fill="hsl(var(--secondary-foreground))" />}
                  {compareId2 && <Bar dataKey="compare2" name={enrichedScenarios.compare2?.name || 'Compare C'} fill="hsl(var(--accent-foreground))" />}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 17-Week Rolling Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">17-Week Rolling Average Overlay</CardTitle>
              <CardDescription>WTD limit: 48 hours/week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={simulationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" label={{ value: 'Week', position: 'insideBottomRight', offset: -5 }} />
                  <YAxis domain={[30, 60]} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={48} stroke="hsl(var(--destructive))" strokeDasharray="4 2" label="48h limit" />
                  {baselineId && (
                    <Line 
                      type="monotone" 
                      dataKey="baseline" 
                      name={enrichedScenarios.baseline?.name || 'Baseline'}
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      dot={false} 
                    />
                  )}
                  {compareId1 && (
                    <Line 
                      type="monotone" 
                      dataKey="compare1" 
                      name={enrichedScenarios.compare1?.name || 'Compare B'}
                      stroke="hsl(var(--secondary-foreground))" 
                      strokeWidth={2} 
                      dot={false} 
                    />
                  )}
                  {compareId2 && (
                    <Line 
                      type="monotone" 
                      dataKey="compare2" 
                      name={enrichedScenarios.compare2?.name || 'Compare C'}
                      stroke="hsl(var(--accent-foreground))" 
                      strokeWidth={2} 
                      dot={false} 
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Delta Row Component
const DeltaRow: React.FC<{
  label: string;
  delta: { value: number; direction: 'up' | 'down' | 'neutral' } | null;
  format: (value: number) => string;
  reverse?: boolean;
}> = ({ label, delta, format, reverse = false }) => {
  if (!delta) {
    return (
      <div className="flex justify-between items-center py-1 border-b">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground text-xs">N/A</span>
      </div>
    );
  }

  const isImprovement = reverse 
    ? delta.direction === 'down'
    : delta.direction === 'up';
  
  const colorClass = delta.direction === 'neutral' 
    ? 'text-muted-foreground'
    : isImprovement 
    ? 'text-green-600'
    : 'text-destructive';

  const Icon = delta.direction === 'neutral' 
    ? Minus
    : delta.direction === 'up'
    ? TrendingUp
    : TrendingDown;

  return (
    <div className="flex justify-between items-center py-1 border-b">
      <span className="text-muted-foreground">{label}</span>
      <div className={`flex items-center gap-1 font-semibold ${colorClass}`}>
        <Icon className="w-3 h-3" />
        <span>{delta.value > 0 ? '+' : ''}{format(delta.value)}</span>
      </div>
    </div>
  );
};

export default ScenarioComparison;
