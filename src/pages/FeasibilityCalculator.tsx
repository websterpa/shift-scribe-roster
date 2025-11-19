import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/navigation/routes';
import type { RequirementsV2 } from '@/types/requirementsV2';
import { createDefaultRequirementsV2, requirementsV2ToDayOfWeek } from '@/types/requirementsV2';
import RequirementsMiniComposer from '@/features/roster/builder/RequirementsMiniComposer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Calculator, ArrowRight, AlertTriangle, CheckCircle2, Save, FileText, Download, Loader2, Trash2 } from 'lucide-react';
import { 
  calculateFeasibility, 
  requiredHoursPerWeek,
  availableHoursPerWeek,
  overtimeSlack,
  fteGap,
  requiredHoursOver17Weeks,
  optimiseHeadcount,
  type FeasibilityInput 
} from '@/services/feasibility/calculateFeasibility';
import { UtilisationChart, type UtilisationData } from '@/components/Feasibility/UtilisationChart';
import { DEFAULT_WTD_RULES, validateStaffWTD } from '@/engine2/constraints/wtdRules';
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
import { suggestForZeros, type Suggestion } from '@/services/feasibility/suggestCompatiblePattern';
import { applySetupFromFeasibility } from '@/services/feasibility/applySetup';
import { createDraftFromConfig } from '@/services/roster/createDraftFromConfig';
import type { FeasibilitySnapshot } from '@/services/feasibility/snapshotDiff';

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

  // Form state - keep legacy for calculations, add v2 for persistence
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [shiftLengthHours, setShiftLengthHours] = useState<number>(8);
  const [requiredShiftsPerDay, setRequiredShiftsPerDay] = useState<number>(3);
  const [bufferPct, setBufferPct] = useState<number>(10);
  const [staffCount, setStaffCount] = useState<string>('');
  const [standardContractHours, setStandardContractHours] = useState<number>(37.5);
  const [patternFilterScope, setPatternFilterScope] = useState<'All' | '8h' | '12h'>(() => {
    const saved = localStorage.getItem('patternPicker.scope');
    if (saved === 'All' || saved === '8h' || saved === '12h') return saved;
    return '8h'; // Default to 8h
  });
  const wtdRules = DEFAULT_WTD_RULES;
  
  // V2 requirements (for persistence only)
  const [requirementsV2, setRequirementsV2] = useState<RequirementsV2>(
    createDefaultRequirementsV2('8h')
  );
  const [requiredPerDay, setRequiredPerDay] = useState<Partial<Record<ShiftKey, number>>>({});

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
  // Removed: requiredPerDay now derived from requirementsV2
  
  // Form validation state
  const [formError, setFormError] = useState<{ title: string; details: string } | null>(null);
  const [invalidShiftKeys, setInvalidShiftKeys] = useState<ShiftKey[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  // Auto-reduce headcount toggle with localStorage persistence
  const [autoReduce, setAutoReduce] = useState<boolean>(() => {
    const v = localStorage.getItem('feasibility.autoReduce');
    return v ? v === '1' : true; // default ON
  });
  const [optimisedFrom, setOptimisedFrom] = useState<number | null>(null);
  
  // Generate draft roster toggle
  const [generateNow, setGenerateNow] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  useEffect(() => {
    localStorage.setItem('feasibility.autoReduce', autoReduce ? '1' : '0');
  }, [autoReduce]);

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
  
  // Filter patterns based on scope
  const filteredPatterns = patterns?.filter(p => {
    if (patternFilterScope === 'All') return true;
    return p.system === patternFilterScope;
  }) || [];
  
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

  // Sync requirementsV2 from requiredPerDay to include complete weekend buckets
  useEffect(() => {
    const framework = shiftLengthHours === 12 ? '12h' : '8h';

    // Helper to deep compare objects
    const deepEqual = (a: unknown, b: unknown) => {
      try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
    };

    if (framework === '8h') {
      const weekdayReqs = {
        E: Number(requiredPerDay.E ?? 0),
        L: Number(requiredPerDay.L ?? 0),
        N: Number(requiredPerDay.N ?? 0),
      };

      const next: RequirementsV2 = {
        framework: '8h',
        days: {
          weekdays: weekdayReqs,
          saturday: { ...weekdayReqs }, // default same as weekdays
          sunday: { ...weekdayReqs },   // default same as weekdays
        },
      };

      if (!deepEqual(requirementsV2, next)) {
        setRequirementsV2(next);
        console.log('📝 Updated requirementsV2 (8h) with complete weekend buckets:', next);
      }
    } else {
      const weekdayReqs = {
        D: Number(requiredPerDay.D ?? 0),
        N: Number(requiredPerDay.N ?? 0),
      };

      const next: RequirementsV2 = {
        framework: '12h',
        days: {
          weekdays: weekdayReqs,
          saturday: { ...weekdayReqs }, // default same as weekdays
          sunday: { ...weekdayReqs },   // default same as weekdays
        },
      };

      if (!deepEqual(requirementsV2, next)) {
        setRequirementsV2(next);
        console.log('📝 Updated requirementsV2 (12h) with complete weekend buckets:', next);
      }
    }
  }, [requiredPerDay, shiftLengthHours]);
  
  // Auto-adjust filter when shift length changes
  useEffect(() => {
    const targetSystem = shiftLengthHours === 12 ? '12h' : '8h';
    if (patternFilterScope !== 'All') {
      setPatternFilterScope(targetSystem);
      localStorage.setItem('patternPicker.scope', targetSystem);
    }
  }, [shiftLengthHours]);
  
  // Persist filter scope changes
  useEffect(() => {
    localStorage.setItem('patternPicker.scope', patternFilterScope);
  }, [patternFilterScope]);
  
  // Pattern selection with cross-system validation
  const handlePatternSelection = (patternId: string) => {
    const pattern = patterns?.find(p => p.id === patternId);
    if (!pattern) return;
    
    // Check for system mismatch
    const expectedSystem = shiftLengthHours === 12 ? '12h' : '8h';
    if (pattern.system !== expectedSystem) {
      const targetShiftLength = pattern.system === '12h' ? 12 : 8;
      
      toast.error(
        `This is a ${pattern.system} pattern. Shift Length is currently ${shiftLengthHours}h.`,
        {
          description: `Auto-switching to ${targetShiftLength}-hour shifts to match pattern.`,
          duration: 4000
        }
      );
      
      // Auto-switch shift length to match pattern
      setShiftLengthHours(targetShiftLength);
    }
    
    setSelectedPatternId(patternId);
  };

  // Save current scenario
  const handleSaveScenario = async () => {
    if (!selectedPattern || !result) {
      toast.error('No results to save - please select a pattern first');
      return;
    }
    
    // Validation guard: prevent saving invalid scenarios
    if (formError || invalidShiftKeys.length > 0) {
      toast.error('Cannot save invalid scenario', {
        description: 'All active shift types must have ≥ 1 staff assigned'
      });
      return;
    }

    const name = scenarioName.trim() || 
      `${selectedPattern.name} – ${new Date().toLocaleDateString()}`;

    setIsSaving(true);
    try {
      // Calculate total from per-shift requirements
      const totalRequiredPerDay = Object.values(requiredPerDay).reduce((sum, val) => sum + (val || 0), 0);
      const effectiveRequiredShiftsPerDay = totalRequiredPerDay > 0 ? totalRequiredPerDay : requiredShiftsPerDay;
      
      // Compute overtime/capacity metrics from result
      const contractedHours = standardContractHours;
      const requiredHrsWeek = result.weeklyHoursRequired;
      const availableHrsWeek = result.availableHoursPerWeek;
      const overtimeWeek = result.overtimeGapPerWeek;
      const slackWeek = Math.max(0, availableHrsWeek - requiredHrsWeek);
      const reqFTE = result.fteRequired;
      const haveFTE = result.fteAvailable;
      const gapFTE = reqFTE - haveFTE;
      const overtime17Weeks = overtimeWeek * 17;

      const scenarioData: SaveScenarioInput = {
        name,
        pattern_id: selectedPattern.id,
        pattern_name: selectedPattern.name,
        staff_count: staffCount ? Number(staffCount) : null,
        shift_length: shiftLengthHours,
        buffer_percent: bufferPct,
        required_shifts_per_day: effectiveRequiredShiftsPerDay, // Save computed total, not legacy field
        avg_weekly_hours: result.hoursPerStaffPerWeek,
        required_staff: result.requiredStaff,
        utilization_pct: result.utilizationPct,
        is_wtd_compliant: wtdStatus?.success ?? false,
        total_breaches: wtdStatus?.metrics.breachWeeks.length ?? 0,
        avg_rolling: wtdStatus?.metrics.rollingAvg ?? null,
        max_rolling: wtdStatus?.metrics.maxRolling ?? null,
        recommendations,
        standard_contract_hours: standardContractHours,
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
    
    // Migration: If legacy value exists but per-shift values are empty, migrate
    const hasPerShiftData = scenario.standard_contract_hours !== undefined; // Use this as proxy for new format
    const currentSystem: System = detectSystem(Number(scenario.shift_length));
    
    if (!hasPerShiftData && scenario.required_shifts_per_day) {
      // Legacy scenario - migrate to per-shift format
      const legacyTotal = scenario.required_shifts_per_day;
      const shifts = activeShiftKeys(currentSystem);
      const perShift = Math.floor(legacyTotal / shifts.length);
      const remainder = legacyTotal % shifts.length;
      
      const migrated: Partial<Record<ShiftKey, number>> = {};
      shifts.forEach((key, idx) => {
        migrated[key] = perShift + (idx < remainder ? 1 : 0);
      });
      
      setRequiredPerDay(migrated);
      console.log('🔄 Migrated legacy scenario to per-shift format:', migrated);
      
      if (remainder > 0) {
        toast.info(`Migrated legacy value ${legacyTotal} across ${shifts.join('/')} shifts (some rounding applied)`);
      }
    } else {
      setRequiredShiftsPerDay(scenario.required_shifts_per_day);
    }
    
    if (scenario.staff_count) {
      setStaffCount(String(scenario.staff_count));
    }
    
    if (scenario.standard_contract_hours) {
      setStandardContractHours(scenario.standard_contract_hours);
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

  // Calculate overtime metrics
  const overtimeMetrics = result && selectedPattern ? (() => {
    const reqWeek = requiredHoursPerWeek(requiredPerDay, shiftLengthHours);
    const availWeek = availableHoursPerWeek(
      staffCount ? Number(staffCount) : result.requiredStaff,
      standardContractHours
    );
    const { overtime, slack } = overtimeSlack(reqWeek, availWeek);
    const { reqFTE, haveFTE, gapFTE } = fteGap(
      reqWeek,
      standardContractHours,
      staffCount ? Number(staffCount) : result.requiredStaff
    );
    const req17 = requiredHoursOver17Weeks(
      Array.isArray(selectedPattern.sequence) ? (selectedPattern.sequence as string[]) : [],
      selectedPattern.cycle_length || 1,
      shiftLengthHours,
      requiredPerDay
    );
    const avail17 = availWeek * 17;
    const overtime17 = Math.max(0, req17 - avail17);
    
    return {
      reqWeek,
      availWeek,
      overtime,
      slack,
      reqFTE,
      haveFTE,
      gapFTE,
      req17,
      avail17,
      overtime17
    };
  })() : null;

  // Recalculate on input change
  useEffect(() => {
    if (!selectedPattern) {
      setResult(null);
      setFormError(null);
      setInvalidShiftKeys([]);
      return;
    }

    try {
      // Calculate total required shifts per day from per-shift requirements
      const totalRequiredPerDay = Object.values(requiredPerDay).reduce((sum, val) => sum + (val || 0), 0);
      
      // Use per-shift total if available, otherwise fall back to legacy value
      const effectiveRequiredShiftsPerDay = totalRequiredPerDay > 0 ? totalRequiredPerDay : requiredShiftsPerDay;
      
      // VALIDATION: Block zero-staff requirements for active shift types
      const activeCodes = activeShiftKeys(system);
      const zeros = activeCodes.filter(c => (requiredPerDay?.[c] ?? 0) <= 0);
      
      if (zeros.length > 0) {
        setFormError({
          title: 'Invalid staffing for selected system',
          details: `These shift types must be ≥ 1: ${zeros.join(', ')}`
        });
        setInvalidShiftKeys(zeros);
        
        // Generate suggestions for fixing zero-staff requirements
        const generatedSuggestions = suggestForZeros(system, requiredPerDay);
        setSuggestions(generatedSuggestions);
        
        setResult(null);
        return;
      }
      
      // Clear validation errors and suggestions
      setFormError(null);
      setInvalidShiftKeys([]);
      setSuggestions([]);
      
      // Guard: warn if using legacy field instead of per-shift requirements
      if (totalRequiredPerDay === 0 && requiredShiftsPerDay > 0) {
        console.warn('⚠️ Deprecated: legacy requiredShiftsPerDay value ignored for WTD. Use per-shift requirements instead.');
      }

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
        requiredShiftsPerDay: effectiveRequiredShiftsPerDay,
        bufferPercent: bufferPct,
        currentStaffCount: staffCount ? Number(staffCount) : undefined,
        standardContractHours,
        wtdRules
      };

      let calculatedResult = calculateFeasibility(input);
      const baselineStaff = calculatedResult.requiredStaff;
      
      // Apply headcount optimisation if enabled
      if (autoReduce && baselineStaff > 0) {
        // WTD validation function for candidate headcount
        const passesWtd = (candidateStaff: number): boolean => {
          // Generate extended sequence for validation (17 weeks = 119 days)
          const seq = Array.isArray(selectedPattern.sequence)
            ? (selectedPattern.sequence as string[])
            : [];
          
          if (seq.length === 0) return true;
          
          const extendedSeq: string[] = [];
          for (let i = 0; i < 17 * 7; i++) {
            extendedSeq.push(seq[i % seq.length]);
          }
          
          // Use the same WTD validation as the main calculation
          const validation = validateStaffWTD(extendedSeq, wtdRules);
          return validation.valid;
        };
        
        const optimisedStaff = optimiseHeadcount({
          requiredHrs: calculatedResult.weeklyHoursRequired,
          contractHrs: standardContractHours,
          bufferPct: bufferPct,
          baseRequiredStaff: baselineStaff,
          minMultiple: selectedPattern.teams_required,
          passesWtd
        });
        
        // If optimisation reduced headcount, recalculate metrics
        if (optimisedStaff < baselineStaff) {
          console.log('🎯 Headcount optimised:', baselineStaff, '→', optimisedStaff);
          setOptimisedFrom(baselineStaff);
          
          // Recalculate metrics with optimised headcount
          calculatedResult = {
            ...calculatedResult,
            requiredStaff: optimisedStaff,
            availableHoursPerWeek: optimisedStaff * standardContractHours,
            utilizationPct: (calculatedResult.weeklyHoursRequired / (optimisedStaff * standardContractHours)) * 100,
            fteAvailable: optimisedStaff,
            overtimeGapPerWeek: Math.max(0, calculatedResult.weeklyHoursRequired - (optimisedStaff * standardContractHours))
          };
        } else {
          setOptimisedFrom(null);
        }
      } else {
        setOptimisedFrom(null);
      }
      
      setResult(calculatedResult);
      console.log('📊 Feasibility calculated:', calculatedResult);
    } catch (error) {
      console.error('❌ Error calculating feasibility:', error);
      toast.error('Error calculating feasibility');
    }
  }, [selectedPattern, shiftLengthHours, requiredShiftsPerDay, wtdRules, bufferPct, staffCount, requiredPerDay, standardContractHours]);

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

  const handleSaveSetup = async () => {
    if (!result || !selectedPattern) return;
    
    // Validation guard: prevent saving invalid config
    if (formError || invalidShiftKeys.length > 0) {
      toast.error('Cannot save invalid configuration', {
        description: 'All active shift types must have ≥ 1 staff assigned'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save config to roster_config table
      const cfg = await applySetupFromFeasibility({
        patternId: selectedPatternId,
        shiftLengthHours,
        requirementsV2,
        bufferPct,
        standardContractHours,
        autoReduceEnabled: autoReduce
      });

      console.log('✅ Config applied:', cfg);

      // If requested, create draft and navigate to it
      if (generateNow) {
        const now = new Date();
        const targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Create feasibility snapshot for drift detection
        const snapshot: FeasibilitySnapshot = {
          pattern_id: selectedPatternId,
          pattern_name: selectedPattern?.name ?? 'Unknown',
          framework: requirementsV2.framework,
          requirements_v2: requirementsV2,
          buffer_pct: bufferPct,
          standard_contract_hours: standardContractHours,
          auto_reduce_enabled: autoReduce,
          timestamp: new Date().toISOString(),
        };
        
        const draft = await createDraftFromConfig({
          tenantId: cfg.tenant_id,
          month: targetMonth,
          configSnapshot: cfg,
          feasibilitySnapshot: snapshot,
        });

        // Guard: ensure we have a valid version ID before navigating
        if (!draft.versionId) {
          console.error('❌ Draft created but no version ID returned:', draft);
          toast.error('Draft creation failed - missing version ID');
          return;
        }

        const targetPath = routes.rosterMonthly({ 
          month: targetMonth, 
          versionId: draft.versionId 
        });
        
        console.debug('🚀 Navigating to draft roster:', targetPath);
        toast.success('Draft roster created from Feasibility setup');
        navigate(targetPath);
        return;
      }

      // Otherwise, navigate to roster builder landing
      const targetPath = `${routes.rosterBuilder}?from=feasibility&ts=${Date.now()}`;
      
      console.debug('🚀 Navigating to roster builder:', targetPath);
      toast.success('Setup applied. Opening Roster Builder…');
      navigate(targetPath);
      
    } catch (err: any) {
      console.error('❌ Error applying setup:', err);
      toast.error(err?.message ?? 'Failed to apply setup');
    } finally {
      setIsSubmitting(false);
    }
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

  // Suggestion handlers
  const handleSwitchSystem = (suggestion: Extract<Suggestion, { kind: 'switch-system' }>) => {
    const targetShiftLength = suggestion.target === '12h' ? 12 : 8;
    
    if (window.confirm(`Switch to ${suggestion.target} system? ${suggestion.reason}`)) {
      console.log(`🔄 Switching to ${suggestion.target} system (${targetShiftLength}h shifts)`);
      setShiftLengthHours(targetShiftLength);
      setPatternFilterScope(suggestion.target);
      toast.success(`Switched to ${suggestion.target} system`, {
        description: 'Please select a compatible pattern'
      });
    }
  };

  const applyFixInput = (suggestion: Extract<Suggestion, { kind: 'fix-input' }>) => {
    console.log(`🔧 Applying fix: Set ${suggestion.shiftCode} = ${suggestion.setTo}`);
    setRequiredPerDay(prev => ({
      ...prev,
      [suggestion.shiftCode]: suggestion.setTo
    }));
    toast.success(`Set ${suggestion.shiftCode} to ${suggestion.setTo}`, {
      description: suggestion.reason
    });
  };

  const openPatternPicker = (scope: '8h' | '12h') => {
    console.log(`📋 Opening pattern picker for ${scope} patterns`);
    setPatternFilterScope(scope);
    
    // Scroll to pattern selector
    const patternSelector = document.getElementById('pattern');
    if (patternSelector) {
      patternSelector.scrollIntoView({ behavior: 'smooth', block: 'start' });
      patternSelector.focus();
    }
    
    toast.info(`Showing ${scope} patterns`, {
      description: 'Select a compatible pattern from the list'
    });
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
    
    // Validation guard: prevent exporting invalid data
    if (formError || invalidShiftKeys.length > 0) {
      toast.error('Cannot export invalid data', {
        description: 'All active shift types must have ≥ 1 staff assigned'
      });
      return;
    }

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
      
      // Per-shift requirements
      const totalPerDay = Object.values(requiredPerDay).reduce((sum, val) => sum + (val || 0), 0);
      const perShiftText = Object.entries(requiredPerDay)
        .filter(([_, val]) => val && val > 0)
        .map(([key, val]) => `${key}:${val}`)
        .join(', ');
      pdf.text(`Per-Shift Required: ${perShiftText || 'Not set'}`, 40, 110);
      pdf.text(`Total Required/Day: ${totalPerDay || requiredShiftsPerDay}`, 40, 130);
      pdf.text(`Buffer: ${bufferPct}%`, 40, 150);
      if (staffCount) {
        pdf.text(`Current Staff: ${staffCount}`, 40, 170);
      }
      
      // Calculations
      pdf.setFontSize(14);
      pdf.text('Calculated Results (contract-based):', 40, 200);
      pdf.setFontSize(12);
      pdf.text(`Work Ratio: ${(result.workRatio * 100).toFixed(1)}%`, 40, 220);
      pdf.text(`Planning Basis (Contract): ${result.standardContractHours}h/week`, 40, 240);
      pdf.text(`Pattern Workload (info): ${result.hoursPerStaffPerWeek.toFixed(1)}h/week`, 40, 260);
      pdf.text(`Weekly Demand: ${result.weeklyHoursRequired.toFixed(1)}h`, 40, 280);
      pdf.text(`Required Staff: ${result.requiredStaff.toFixed(1)}`, 40, 300);
      pdf.text(`Utilisation: ${result.utilizationPct.toFixed(1)}%`, 40, 320);
      
      // Operational Capacity Section
      pdf.setFontSize(14);
      pdf.text('Operational Capacity:', 40, 350);
      pdf.setFontSize(12);
      pdf.text(`Standard Contract Hours/Week: ${result.standardContractHours}h`, 40, 370);
      pdf.text(`Required Hours/Week: ${result.weeklyHoursRequired.toFixed(1)}h`, 40, 390);
      pdf.text(`Available Hours/Week: ${result.availableHoursPerWeek.toFixed(1)}h`, 40, 410);
      if (result.overtimeGapPerWeek > 0) {
        pdf.text(`Overtime Gap/Week: ${result.overtimeGapPerWeek.toFixed(1)}h`, 40, 430);
      } else {
        pdf.text(`Slack/Week: ${(result.availableHoursPerWeek - result.weeklyHoursRequired).toFixed(1)}h`, 40, 430);
      }
      pdf.text(`FTE Required: ${result.fteRequired.toFixed(2)}`, 40, 450);
      pdf.text(`FTE Available: ${result.fteAvailable.toFixed(2)}`, 40, 470);
      pdf.text(`FTE Gap: ${(result.fteRequired - result.fteAvailable).toFixed(2)}`, 40, 490);
      
      // Add overtime metrics if available
      let yPos = 510;
      if (overtimeMetrics && Object.keys(requiredPerDay).length > 0) {
        pdf.text(`Required Hours/Week: ${overtimeMetrics.reqWeek.toFixed(1)}h`, 40, yPos);
        yPos += 20;
        if (overtimeMetrics.overtime > 0) {
          pdf.text(`Overtime/Week: ${overtimeMetrics.overtime.toFixed(1)}h`, 40, yPos);
        } else {
          pdf.text(`Slack/Week: ${overtimeMetrics.slack.toFixed(1)}h`, 40, yPos);
        }
        yPos += 20;
        pdf.text(`FTE Gap: ${overtimeMetrics.gapFTE > 0 ? '+' : ''}${overtimeMetrics.gapFTE.toFixed(2)}`, 40, yPos);
        yPos += 20;
        pdf.text(`17-Week Overtime: ${overtimeMetrics.overtime17.toFixed(1)}h`, 40, yPos);
        yPos += 20;
      }
      
      if (result.surplus !== null) {
        pdf.text(`Surplus/Deficit: ${result.surplus > 0 ? '+' : ''}${result.surplus.toFixed(1)}`, 40, yPos);
        yPos += 20;
      }
      
      pdf.text(`WTD Compliant: ${wtdStatus?.success ? 'Yes' : 'No'}`, 40, yPos);
      yPos += 20;
      
      // Capture chart if available
      const chartEl = document.querySelector('.recharts-wrapper') as HTMLElement;
      if (chartEl && staffCount && Number(staffCount) > 0) {
        const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 40, yPos + 30, 500, 250);
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
      const totalPerDay = Object.values(requiredPerDay).reduce((sum, val) => sum + (val || 0), 0);
      const perShiftRows = Object.entries(requiredPerDay)
        .filter(([_, val]) => val && val > 0)
        .map(([key, val]) => [`  ${key} Shift Required/Day`, val.toString()]);
      
      const rows = [
        ['Shift Scribe – Feasibility Report'],
        ['Generated', new Date().toLocaleString()],
        [''],
        ['Configuration'],
        ['Pattern', selectedPattern.name],
        ['System', selectedPattern.system],
        ['Cycle Length (weeks)', selectedPattern.cycle_length.toString()],
        ['Shift Length (hours)', shiftLengthHours.toString()],
        ...perShiftRows,
        ['Total Required Per Day', (totalPerDay || requiredShiftsPerDay).toString()],
        ['Buffer %', bufferPct.toString()],
        ...(staffCount ? [['Current Staff Count', staffCount]] : []),
        [''],
        ['Results'],
        ['Work Ratio', `${(result.workRatio * 100).toFixed(1)}%`],
        ['Planning Basis (Contract)', `${result.standardContractHours}h/week`],
        ['Pattern Workload (info)', `${result.hoursPerStaffPerWeek.toFixed(1)}h/week`],
        ['Weekly Demand', `${result.weeklyHoursRequired.toFixed(1)}h`],
        ['Required Staff', result.requiredStaff.toString()],
        ['Utilization', `${result.utilizationPct.toFixed(1)}%`],
        ['Standard Contract Hours', `${result.standardContractHours}h/week`],
        ['Available Hours/Week', `${result.availableHoursPerWeek.toFixed(1)}h`],
        ['Overtime Gap/Week', `${result.overtimeGapPerWeek.toFixed(1)}h`],
        ['Slack/Week', `${Math.max(0, result.availableHoursPerWeek - result.weeklyHoursRequired).toFixed(1)}h`],
        ['FTE Required', result.fteRequired.toFixed(2)],
        ['FTE Available', result.fteAvailable.toFixed(2)],
        ['FTE Gap', (result.fteRequired - result.fteAvailable).toFixed(2)],
        ...(overtimeMetrics && Object.keys(requiredPerDay).length > 0 ? [
          ['Required Hours/Week', `${overtimeMetrics.reqWeek.toFixed(1)}h`],
          ['Overtime/Week', `${overtimeMetrics.overtime.toFixed(1)}h`],
          ['Slack/Week', `${overtimeMetrics.slack.toFixed(1)}h`],
          ['FTE Gap', overtimeMetrics.gapFTE > 0 ? `+${overtimeMetrics.gapFTE.toFixed(2)}` : overtimeMetrics.gapFTE.toFixed(2)],
          ['17-Week Overtime', `${overtimeMetrics.overtime17.toFixed(1)}h`]
        ] : []),
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
          perShiftRequirements: requiredPerDay,
          totalRequiredPerDay: Object.values(requiredPerDay).reduce((sum, val) => sum + (val || 0), 0),
          bufferPct,
          staffCount: staffCount ? Number(staffCount) : null,
          standardContractHours,
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
          fteRequired: result.fteRequired,
          fteAvailable: result.fteAvailable,
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
    <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calculator className="w-8 h-8 text-primary" />
          Feasibility Calculator
        </h1>
        <p className="text-muted-foreground mt-2">
          Calculate minimum staff requirements based on patterns, shift durations, and WTD constraints
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* Configuration Card */}
          <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Define your roster requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pattern Selection */}
            <div className="space-y-3">
              <Label htmlFor="pattern">Shift Pattern</Label>
              
              {/* Pattern Filter Segmented Control */}
              <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
                <Button
                  type="button"
                  size="sm"
                  variant={patternFilterScope === 'All' ? 'default' : 'ghost'}
                  onClick={() => setPatternFilterScope('All')}
                  className="h-7 px-3 text-xs"
                >
                  All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={patternFilterScope === '8h' ? 'default' : 'ghost'}
                  onClick={() => setPatternFilterScope('8h')}
                  className="h-7 px-3 text-xs"
                >
                  8h Only
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={patternFilterScope === '12h' ? 'default' : 'ghost'}
                  onClick={() => setPatternFilterScope('12h')}
                  className="h-7 px-3 text-xs"
                >
                  12h Only
                </Button>
              </div>
              
              <Select
                value={selectedPatternId}
                onValueChange={handlePatternSelection}
                disabled={patternsLoading}
              >
                <SelectTrigger id="pattern" className="bg-background">
                  <SelectValue placeholder={patternsLoading ? "Loading patterns..." : "Select a pattern"} />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover max-h-[300px]">
                  {filteredPatterns.length ? (
                    filteredPatterns.map(pattern => {
                      const sequencePreview = Array.isArray(pattern.sequence) 
                        ? pattern.sequence.slice(0, 8).join('') + (pattern.sequence.length > 8 ? '…' : '')
                        : '';
                      return (
                        <SelectItem key={pattern.id} value={pattern.id} className="bg-popover">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-xs font-semibold",
                              pattern.system === '12h' 
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                            )}>
                              {pattern.system}
                            </span>
                            <span className="font-medium">{pattern.name}</span>
                            <span className="text-muted-foreground text-xs">— {sequencePreview}</span>
                          </div>
                        </SelectItem>
                      );
                    })
                  ) : (
                    <div className="p-2 text-muted-foreground text-sm bg-popover">
                      No {patternFilterScope !== 'All' ? patternFilterScope : ''} patterns found
                    </div>
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
              <Label htmlFor="standardContractHours">Contracted hours per staff per week</Label>
              <Input
                id="standardContractHours"
                type="number"
                min="20"
                max="48"
                step="0.5"
                value={standardContractHours}
                onChange={(e) => setStandardContractHours(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Site-level setting used for availability and FTE. Typical values 37–40.
              </p>
            </div>

            {/* Per-Shift Staffing Requirements */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Per-Shift Staffing</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {system === '12h' ? '12-hour system uses D/N shifts' : '8-hour system uses E/L/N shifts'}
                </p>
              </div>
              
              {activeShiftKeys(system).map(shiftKey => {
                const isInvalid = invalidShiftKeys.includes(shiftKey);
                return (
                  <div key={shiftKey} className="space-y-2">
                    <Label htmlFor={`shift-${shiftKey}`} className={cn(isInvalid && "text-destructive")}>
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
                      className={cn(isInvalid && "border-destructive focus-visible:ring-destructive")}
                    />
                  </div>
                );
              })}
              
              {/* Smart Suggestion Banner */}
              {suggestions.length > 0 && (
                <div 
                  className="mt-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="mb-3 font-medium text-amber-900 dark:text-amber-100">
                    💡 This setup looks incompatible with the selected system
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.some(s => s.kind === 'switch-system') && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => {
                          const suggestion = suggestions.find(s => s.kind === 'switch-system') as Extract<Suggestion, { kind: 'switch-system' }>;
                          if (suggestion) handleSwitchSystem(suggestion);
                        }}
                        className="bg-secondary hover:bg-secondary/80"
                      >
                        Switch to {(suggestions.find(s => s.kind === 'switch-system') as any)?.target}
                      </Button>
                    )}
                    {suggestions.filter(s => s.kind === 'fix-input').slice(0, 1).map((s, i) => {
                      const fixSuggestion = s as Extract<Suggestion, { kind: 'fix-input' }>;
                      return (
                        <Button 
                          key={i} 
                          size="sm" 
                          onClick={() => applyFixInput(fixSuggestion)}
                          variant="default"
                        >
                          Set {fixSuggestion.shiftCode} = {fixSuggestion.setTo}
                        </Button>
                      );
                    })}
                    {suggestions.some(s => s.kind === 'open-picker') && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          const pickerSuggestion = suggestions.find(s => s.kind === 'open-picker') as Extract<Suggestion, { kind: 'open-picker' }>;
                          if (pickerSuggestion) openPatternPicker(pickerSuggestion.scope);
                        }}
                      >
                        Choose compatible pattern…
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {formError && (
                <Alert variant="destructive" className="py-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <p className="font-semibold mb-1">{formError.title}</p>
                    <p className="text-xs">{formError.details}</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* @deprecated: Legacy Required Shifts Per Day - superseded by per-shift requirements */}
            {process.env.NODE_ENV === 'development' && false && (
              <div className="space-y-2 opacity-50">
                <Label htmlFor="reqShifts">Required Shifts Per Day (legacy - deprecated)</Label>
                <Input
                  id="reqShifts"
                  type="number"
                  min="1"
                  max="10"
                  value={requiredShiftsPerDay}
                  onChange={(e) => setRequiredShiftsPerDay(Number(e.target.value))}
                  disabled
                />
                <p className="text-xs text-muted-foreground">This field is deprecated. Use per-shift requirements above.</p>
              </div>
            )}

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

          {/* Save or Load Scenario Card */}
          {result && (
            <Card>
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
                      disabled={isSaving || !result || formError !== null}
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

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* Results Panel */}
          <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>Calculated staffing requirements</CardDescription>
            {result && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="wtd-simulation" 
                    checked={showWTDSimulation}
                    onCheckedChange={setShowWTDSimulation}
                  />
                  <Label htmlFor="wtd-simulation" className="text-sm cursor-pointer">
                    Show 17-Week WTD Simulation
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="auto-reduce" 
                    checked={autoReduce}
                    onCheckedChange={setAutoReduce}
                    disabled={!result}
                  />
                  <Label htmlFor="auto-reduce" className="text-sm cursor-pointer">
                    Auto-reduce headcount when slack ≥ 1 FTE
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1">
                          <span className="text-xs text-muted-foreground">?</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          When enabled, automatically reduces required staff by 1+ if there's at least 1 FTE of slack,
                          while ensuring coverage, WTD compliance, and crew-multiple constraints are maintained.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-primary">{result.requiredStaff}</p>
                      {optimisedFrom && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">
                          ↓ from {optimisedFrom}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {optimisedFrom 
                        ? 'Auto-reduced (buffer retained)' 
                        : `Rounded up for buffer${selectedPattern?.teams_required ? ' & crew multiple' : ''}`
                      }
                    </p>
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
                    <span className="text-muted-foreground">Planning basis (contract):</span>
                    <span className="font-medium">{result.standardContractHours}h/week</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Weekly Demand:</span>
                    <span className="font-medium">{result.weeklyHoursRequired.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground text-xs italic">Pattern workload (info):</span>
                    <span className="font-medium text-xs text-muted-foreground">{result.hoursPerStaffPerWeek.toFixed(1)}h/week</span>
                  </div>
                </div>

                {/* Operational Capacity (contract-based) */}
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-semibold">Operational Capacity (contract-based)</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Standard Contract Hours/Week:</span>
                    <span className="font-medium">{result.standardContractHours}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Required Hours/Week:</span>
                    <span className="font-medium">{result.weeklyHoursRequired.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available Hours/Week:</span>
                    <span className="font-medium">{result.availableHoursPerWeek.toFixed(1)}h</span>
                  </div>
                  {result.overtimeGapPerWeek > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Overtime Gap/Week:</span>
                      <span className="font-medium text-amber-600">
                        {result.overtimeGapPerWeek.toFixed(1)}h
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Slack h/week:</span>
                      <span className="font-medium text-emerald-600">
                        {(result.availableHoursPerWeek - result.weeklyHoursRequired).toFixed(1)}h
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">FTE Required:</span>
                    <span className="font-medium">{result.fteRequired.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">FTE Available:</span>
                    <span className="font-medium">{result.fteAvailable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">FTE Gap:</span>
                    <span className={cn(
                      "font-medium",
                      (result.fteRequired - result.fteAvailable) > 0 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {(result.fteRequired - result.fteAvailable).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Weekly Availability Card */}
                {overtimeMetrics && Object.keys(requiredPerDay).length > 0 && (
                  <Card className="mt-4 border-muted bg-secondary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Weekly Availability</CardTitle>
                      <CardDescription className="text-sm">
                        Hours balance per week
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Required h/week:</span>
                        <span className="font-medium">{overtimeMetrics.reqWeek.toFixed(1)} h</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available h/week:</span>
                        <span className="font-medium">{overtimeMetrics.availWeek.toFixed(1)} h</span>
                      </div>
                      {overtimeMetrics.overtime > 0 ? (
                        <div className="flex justify-between text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded">
                          <span className="text-red-700 dark:text-red-400 font-medium">Overtime h/week:</span>
                          <span className="font-bold text-red-700 dark:text-red-400">
                            {overtimeMetrics.overtime.toFixed(1)} h
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                          <span className="text-green-700 dark:text-green-400 font-medium">Slack h/week:</span>
                          <span className="font-bold text-green-700 dark:text-green-400">
                            {overtimeMetrics.slack.toFixed(1)} h
                          </span>
                        </div>
                      )}
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">FTE required:</span>
                          <span className="font-medium">{overtimeMetrics.reqFTE.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">FTE available:</span>
                          <span className="font-medium">{overtimeMetrics.haveFTE.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">FTE gap:</span>
                          <span className={cn(
                            "font-bold",
                            overtimeMetrics.gapFTE > 0 
                              ? "text-red-600 dark:text-red-400" 
                              : "text-green-600 dark:text-green-400"
                          )}>
                            {overtimeMetrics.gapFTE > 0 ? '+' : ''}{overtimeMetrics.gapFTE.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                      
                      {/* 17-Week Overtime Totals */}
                      {overtimeMetrics && Object.keys(requiredPerDay).length > 0 && (
                        <div className="pt-3 border-t space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">17-week required total:</span>
                            <span className="font-medium">{overtimeMetrics.req17.toFixed(1)} h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">17-week available total:</span>
                            <span className="font-medium">{overtimeMetrics.avail17.toFixed(1)} h</span>
                          </div>
                          <div className="flex justify-between p-2 bg-amber-50 dark:bg-amber-950/20 rounded">
                            <span className="text-amber-700 dark:text-amber-400 font-medium">17-week overtime:</span>
                            <span className="font-bold text-amber-700 dark:text-amber-400">
                              {overtimeMetrics.overtime17.toFixed(1)} h
                            </span>
                          </div>
                        </div>
                      )}
                      
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


                {/* Warnings - Filter out WTD warnings (now handled by unified banner) */}
                {result.warnings.filter(w => !w.toLowerCase().includes('wtd')).length > 0 && (
                  <div className="space-y-2">
                    {result.warnings
                      .filter(w => !w.toLowerCase().includes('wtd'))
                      .map((warning, idx) => (
                        <Alert key={idx} className="bg-yellow-50 border-yellow-200">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800 text-sm">
                            {warning}
                          </AlertDescription>
                        </Alert>
                      ))
                    }
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
                      disabled={isExporting || !(wtdStatus?.success ?? false) || formError !== null}
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
                      disabled={isExporting || formError !== null}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      CSV
                    </Button>
                    <Button 
                      onClick={exportJSON} 
                      variant="outline"
                      size="sm"
                      disabled={isExporting || formError !== null}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      JSON
                    </Button>
                  </div>
                </div>

                {/* Generate draft option */}
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={generateNow} 
                    onChange={e => setGenerateNow(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Generate draft roster now (and open it)
                </label>

                {/* Action Button */}
                <Button 
                  onClick={handleSaveSetup} 
                  className="w-full mt-2"
                  disabled={!(wtdStatus?.success ?? false) || result.requiredStaff === 0 || formError !== null || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {generateNow ? 'Creating Draft...' : 'Applying...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Use This Setup
                    </>
                  )}
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
        </div>
      </div>
    </div>
  );
};

export default FeasibilityCalculator;
