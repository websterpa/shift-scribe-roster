import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  RosterBuilderInput, 
  DEFAULT_STAFFING_8H, 
  DEFAULT_STAFFING_12H,
  PATTERN_PRESETS_8H,
  PATTERN_PRESETS_12H
} from '@/domain/rosterSchema';
import { 
  validateShiftSetConsistency, 
  validateRestRulesPreview,
  validateNightEligibility,
  type ValidationIssue
} from '@/domain/invariants';
import { assertShiftToken, LABEL_FROM_TOKEN, allowedTokens, LABEL } from '@/domain/shifts';
import type { StaffMember } from '@/types/roster';
import type { RequirementsV2 } from '@/types/requirementsV2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Loader2, Clock, Calculator, ArrowLeft, CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RequirementsMiniComposer from '@/features/roster/builder/RequirementsMiniComposer';
import { EligibilityInspector } from '@/features/roster/debug/EligibilityInspector';
import { ActiveConfigBanner } from '@/features/roster/monthly/ActiveConfigBanner';
import { ConfigDiffPanel } from '@/components/roster/ConfigDiffPanel';
import { trace } from '@/lib/devTrace';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TeamIndexManager } from '@/components/roster/TeamIndexManager';
import { checkConfig } from '@/utils/consistency/checkConfig';
import { ConfigValidationGuard } from '@/components/roster/ConfigValidationGuard';
import type { ConsistencyIssue } from '@/utils/consistency/checkConfig';
import { getTenantId } from '@/features/tenant/useTenant';

interface PreviewData {
  requirements?: Record<string, number>;
  estimatedHours?: number;
  estimatedCost?: number;
  nightCount?: number;
}

export default function GuidedRosterBuilderV2() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [previewData, setPreviewData] = useState<PreviewData>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [ackWarnings, setAckWarnings] = useState(false);
  const [hasFeasibilityConfig, setHasFeasibilityConfig] = useState(false);
  const [savedConfigRequirements, setSavedConfigRequirements] = useState<RequirementsV2 | null>(null);
  const [consistencyIssues, setConsistencyIssues] = useState<ConsistencyIssue[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [configData, setConfigData] = useState<any>(null);
  const [openSections, setOpenSections] = useState({
    basics: true,
    pattern: true,
    staffing: true,
    rates: false
  });

  const form = useForm<RosterBuilderInput>({
    resolver: zodResolver(RosterBuilderInput),
    defaultValues: {
      system: "8h",
      tz: "Europe/London",
      siteStartHour: 6,
      horizonWeeks: 17,
      pattern: "EELLNNRRRR",
      patternMode: "locked", // Always locked for MVP
      cycleAnchorDate: undefined,
      staffing: DEFAULT_STAFFING_8H,
      rates: {
        staff: 18,
        supervisor: 24,
        roleMixByShift: { D: 15, E: 10, L: 10, N: 20, R: 0, S: 0 },
        budgetWarn: null
      },
      allowSupervisorNights: false
    }
  });

  const watchedValues = form.watch();

  // Load initial data
  useEffect(() => {
    loadStaffAndSettings();
    loadFeasibilityConfig();
    loadSavedConfig();
    // Load tenant ID synchronously
    const tid = getTenantId();
    setTenantId(tid);
  }, []);

  // Update staffing defaults when system changes
  useEffect(() => {
    const system = form.getValues('system');
    if (system === "8h") {
      form.setValue('staffing', DEFAULT_STAFFING_8H);
      form.setValue('pattern', "EELLNNRRRR");
    } else {
      form.setValue('staffing', DEFAULT_STAFFING_12H);
      form.setValue('pattern', "DDNNRRRR");
    }
  }, [form.watch('system')]);

  // Debounced preview updates
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreview();
      validateInputs();
    }, 500);
    return () => clearTimeout(timer);
  }, [JSON.stringify(watchedValues)]);

  const loadFeasibilityConfig = () => {
    try {
      console.log('📊 GuidedRosterBuilderV2: Checking for feasibility config');
      const stored = localStorage.getItem('feasibilityConfig');
      
      if (stored) {
        const config = JSON.parse(stored);
        console.log('✅ Feasibility config loaded:', config);
        
        // Use requirementsV2 as the single source of truth
        if (config.requirementsV2) {
          const reqV2 = config.requirementsV2;
          
          trace("builder.loaded.requirements_v2.localStorage", {
            framework: reqV2.framework,
            weekdays: reqV2.days.weekdays,
            saturday: reqV2.days.saturday,
            sunday: reqV2.days.sunday,
          });
          
          // Set system from framework
          const system = reqV2.framework;
          form.setValue('system', system);
          
          // Map all day buckets to staffing format
          const staffing = form.getValues('staffing');
          
          staffing.forEach((day: any) => {
            let dayBucket;
            if (day.dow === 0) {
              // Sunday
              dayBucket = reqV2.days.sunday;
            } else if (day.dow === 6) {
              // Saturday
              dayBucket = reqV2.days.saturday;
            } else {
              // Weekdays (Mon-Fri)
              dayBucket = reqV2.days.weekdays;
            }
            
            // Set needs based on framework
            if (system === '8h') {
              day.need = {
                E: (dayBucket as any).E || 0,
                L: (dayBucket as any).L || 0,
                N: (dayBucket as any).N || 0,
                D: 0
              };
            } else {
              day.need = {
                E: 0,
                L: 0,
                N: (dayBucket as any).N || 0,
                D: (dayBucket as any).D || 0
              };
            }
          });
          
          form.setValue('staffing', staffing);
        }
        
        setHasFeasibilityConfig(true);
        
        toast({
          title: "Feasibility configuration loaded",
          description: `Using calculated setup: ${config.requiredStaff} staff recommended`,
        });
        
        // Clear the stored config after loading
        localStorage.removeItem('feasibilityConfig');
      }
    } catch (error) {
      console.error('❌ Error loading feasibility config:', error);
    }
  };

  const loadStaffAndSettings = async () => {
    try {
      const [staffResponse, settingsResponse] = await Promise.all([
        supabase.from('staff_profiles').select('*').eq('is_active', true),
        supabase.from('site_settings').select('*').limit(1).single()
      ]);

      if (staffResponse.data) {
        setStaffList(staffResponse.data as StaffMember[]);
      }

      if (settingsResponse.data) {
        setSiteSettings(settingsResponse.data);
        form.setValue('rates.staff', settingsResponse.data.avg_staff_rate || 18);
        form.setValue('rates.supervisor', settingsResponse.data.avg_supervisor_rate || 24);
        form.setValue('allowSupervisorNights', settingsResponse.data.allow_supervisor_nights || false);
        form.setValue('rates.budgetWarn', settingsResponse.data.budget_warn_threshold);
      }
    } catch (error) {
      toast({
        title: "Loading Error",
        description: "Failed to load staff and settings data",
        variant: "destructive"
      });
    }
  };

  const loadSavedConfig = async () => {
    try {
      const tid = getTenantId();
      if (!tid) {
        console.warn('GuidedRosterBuilderV2: No tenant ID; skipping loadSavedConfig');
        return;
      }
      const { data, error } = await supabase
        .from('roster_config')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        // Store full config for consistency checking
        setConfigData(data);
        
        if (data.requirements_v2) {
          const rawReqV2 = data.requirements_v2 as unknown as RequirementsV2;
          
          // Normalize: ensure saturday and sunday exist, default to weekdays if missing
          let reqV2: RequirementsV2;
          
          if (rawReqV2.framework === '8h') {
            reqV2 = {
              framework: '8h',
              days: {
                weekdays: rawReqV2.days.weekdays as { E: number; L: number; N: number },
                saturday: (rawReqV2.days.saturday as { E: number; L: number; N: number }) || (rawReqV2.days.weekdays as { E: number; L: number; N: number }),
                sunday: (rawReqV2.days.sunday as { E: number; L: number; N: number }) || (rawReqV2.days.weekdays as { E: number; L: number; N: number }),
              }
            };
          } else {
            reqV2 = {
              framework: '12h',
              days: {
                weekdays: rawReqV2.days.weekdays as { D: number; N: number },
                saturday: (rawReqV2.days.saturday as { D: number; N: number }) || (rawReqV2.days.weekdays as { D: number; N: number }),
                sunday: (rawReqV2.days.sunday as { D: number; N: number }) || (rawReqV2.days.weekdays as { D: number; N: number }),
              }
            };
          }
          
          setSavedConfigRequirements(reqV2);
          
          // Trace the saved config
          trace("builder.savedConfig.loaded", {
            framework: reqV2.framework,
            weekdays: reqV2.days.weekdays,
            saturday: reqV2.days.saturday,
            sunday: reqV2.days.sunday,
          });
        }
      }
    } catch (error) {
      console.error('❌ Error loading saved config:', error);
    }
  };

  const updatePreview = useCallback(async () => {
    try {
      setIsLoadingPreview(true);
      const values = form.getValues();
      
      // Calculate basic requirements preview
      const requirements: Record<string, number> = {};
      values.staffing.forEach(day => {
        Object.entries(day.need).forEach(([token, count]) => {
          if (count > 0) {
            requirements[token] = (requirements[token] || 0) + count;
          }
        });
      });

      // Calculate estimated hours and cost
      const shiftHours = values.system === "12h" ? 12 : 8;
      const totalShifts = Object.values(requirements).reduce((sum, count) => sum + count, 0);
      const estimatedHours = totalShifts * shiftHours * values.horizonWeeks;
      
      const avgRate = (values.rates.staff + values.rates.supervisor) / 2;
      const estimatedCost = estimatedHours * avgRate;

      setPreviewData({
        requirements,
        estimatedHours,
        estimatedCost,
        nightCount: requirements.N || 0
      });
    } catch (error) {
      console.error("Preview update failed:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [form]);

  const validateInputs = () => {
    const values = form.getValues();
    const allIssues: ValidationIssue[] = [];

    // Collect all validation issues
    allIssues.push(...validateShiftSetConsistency(values));
    allIssues.push(...validateRestRulesPreview(values));
    allIssues.push(...validateNightEligibility(values, staffList));

    setValidationIssues(allIssues);
  };

  // Split issues into warnings and fatal errors
  const warnings = validationIssues.filter(issue => issue.level === "warning");
  const fatalErrors = validationIssues.filter(issue => issue.level === "fatal");

  // Reset acknowledgment when warnings change
  useEffect(() => {
    setAckWarnings(false);
  }, [JSON.stringify(warnings)]);

  const handleGenerate = async () => {
    const values = form.getValues();
    
    try {
      setIsGenerating(true);
      
      // Final validation - check for fatal errors only
      const shiftSetIssues = validateShiftSetConsistency(values);
      const nightIssues = validateNightEligibility(values, staffList);
      const allFatalErrors = [...shiftSetIssues, ...nightIssues].filter(issue => issue.level === "fatal");
      
      if (allFatalErrors.length > 0) {
        throw new Error(allFatalErrors[0].message);
      }

      // Create roster configuration
      // Always start on the 1st of the current month
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startDateISO = firstOfMonth.toISOString().split('T')[0];
      
      const configData = {
        config_name: `Generated ${values.system} Roster`,
        shift_type: values.system,
        site_start_time: `${values.siteStartHour.toString().padStart(2, '0')}:00`,
        timezone: values.tz,
        cycle_length_weeks: values.horizonWeeks,
        operational_hours_per_day: 24,
        start_date: startDateISO,
        staffing_requirements: Object.fromEntries(
          values.staffing.map(day => [
            day.dow,
            Object.fromEntries(
              Object.entries(day.need).filter(([_, count]) => count > 0)
            )
          ])
        ),
        pattern: values.pattern.split(''),
        pattern_adherence_mode: values.patternMode,
        cycle_anchor_date: values.cycleAnchorDate 
          ? values.cycleAnchorDate.toISOString().split('T')[0]
          : startDateISO
      };

      const { data: config, error: configError } = await supabase
        .from('roster_config')
        .insert(configData)
        .select()
        .single();

      if (configError) throw configError;

      // Generate and save roster (this creates the version and saves assignments)
      const { generateAndSaveRoster } = await import('@/services/roster/generation');
      
      const result = await generateAndSaveRoster(
        staffList, 
        { 
          ...config, 
          start_date: configData.start_date,
          pattern_adherence_mode: configData.pattern_adherence_mode,
          patternLocked: configData.pattern_adherence_mode === 'locked'
        }, 
        'Initial Generation'
      );

      // Count night shifts from the generator result
      const nightCount = result.generatorResult?.assignments.filter(a => a.shiftType === 'N').length || 0;

      // DEV diagnostic: Log generation summary
      if (import.meta.env.DEV) {
        console.log('📊 Roster Generation Complete');
        console.table({
          'Version ID': result.versionId,
          'Total Assignments': result.totalAssignments,
          'Night Shifts': nightCount,
          'Optimization Score': result.optimizationResult?.score,
          'Violations': result.wtrResult?.violations.length
        });
      }

      toast({
        title: "Roster Generated Successfully",
        description: `Created ${result.totalAssignments} assignments with ${nightCount} night shifts`,
      });

      // Navigate to summary with fresh start date
      const startDate = new Date(configData.start_date);
      const monthParam = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      window.location.href = `/roster/summary?version=${result.versionId}&month=${monthParam}`;

    } catch (error) {
      console.error("❌ Generation failed:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate roster",
        variant: "destructive",
        duration: 10000 // Longer duration for errors
      });
      // CRITICAL: Do NOT navigate on failure
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = useMemo(() => {
    if (fatalErrors.length > 0) return false;
    if (warnings.length > 0 && !ackWarnings) return false;
    if (isLoadingPreview || isGenerating) return false;
    // Block if there are consistency errors
    if (consistencyIssues.filter(i => i.severity === 'error').length > 0) return false;
    return true;
  }, [fatalErrors.length, warnings.length, ackWarnings, isLoadingPreview, isGenerating, consistencyIssues]);

  // Convert staffing array to RequirementsV2 for consistency checking
  const builderRequirementsV2 = useMemo<RequirementsV2 | null>(() => {
    const values = form.getValues();
    const framework = values.system;
    
    if (!values.staffing || values.staffing.length === 0) return null;

    // Group by day type
    const weekdayData: Record<string, number> = {};
    const saturdayData: Record<string, number> = {};
    const sundayData: Record<string, number> = {};

    values.staffing.forEach(day => {
      const target = 
        day.dow === 0 ? sundayData :
        day.dow === 6 ? saturdayData :
        weekdayData;
      
      Object.entries(day.need).forEach(([shift, count]) => {
        if (count > 0) {
          target[shift] = count;
        }
      });
    });

    // Ensure all keys are present with defaults
    if (framework === '8h') {
      return {
        framework: '8h',
        days: {
          weekdays: { E: weekdayData.E || 0, L: weekdayData.L || 0, N: weekdayData.N || 0 },
          saturday: { E: saturdayData.E || 0, L: saturdayData.L || 0, N: saturdayData.N || 0 },
          sunday: { E: sundayData.E || 0, L: sundayData.L || 0, N: sundayData.N || 0 },
        },
      };
    } else {
      return {
        framework: '12h',
        days: {
          weekdays: { D: weekdayData.D || 0, N: weekdayData.N || 0 },
          saturday: { D: saturdayData.D || 0, N: saturdayData.N || 0 },
          sunday: { D: sundayData.D || 0, N: sundayData.N || 0 },
        },
      };
    }
  }, [watchedValues.staffing, watchedValues.system]);

  // Trace builder state changes (dev only)
  useEffect(() => {
    if (builderRequirementsV2) {
      trace("builder.current.requirements_v2", {
        framework: builderRequirementsV2.framework,
        weekdays: builderRequirementsV2.days.weekdays,
        saturday: builderRequirementsV2.days.saturday,
        sunday: builderRequirementsV2.days.sunday,
      });
    }
  }, [builderRequirementsV2]);

  // Run consistency checks whenever builder state changes
  useEffect(() => {
    if (!configData || !builderRequirementsV2) return;

    const issues = checkConfig({
      tenantId,
      config: {
        tenant_id: configData.tenant_id,
        shift_length_hours: configData.shift_length_hours,
        buffer_pct: configData.buffer_pct,
        standard_contract_hours: configData.standard_contract_hours,
        auto_reduce_enabled: configData.auto_reduce_enabled,
        pattern_id: configData.pattern_id,
        requirements_v2: savedConfigRequirements,
      },
      builder: {
        requirements_v2: builderRequirementsV2,
        shift_length_hours: form.watch('system') === '8h' ? 8 : 12,
      },
      pattern: form.watch('pattern') ? {
        id: 'current',
        sequence: form.watch('pattern').split(''),
      } : null,
      snapshot: null, // Could add feasibility snapshot here if available
    });

    setConsistencyIssues(issues);
    
    // Log issues for dev
    if (issues.length > 0) {
      console.group('⚠️ Configuration Consistency Issues');
      issues.forEach(issue => {
        console.log(`[${issue.severity.toUpperCase()}] ${issue.message}`, issue.details);
      });
      console.groupEnd();
    }
  }, [configData, builderRequirementsV2, savedConfigRequirements, tenantId, form.watch('system'), form.watch('pattern')]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Guided Roster Builder v2</h1>
              <p className="text-slate-600 mt-2">Schema-driven, validated roster generation</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/feasibility')}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              Back to Calculator
            </Button>
          </div>
          
          {hasFeasibilityConfig && (
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <Calculator className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Configuration loaded from Feasibility Calculator. Review and adjust as needed.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Configuration Validation Guard - Blocks generation on drift */}
          {consistencyIssues.length > 0 && (
            <div className="mt-4">
              <ConfigValidationGuard issues={consistencyIssues} />
            </div>
          )}
          
          {/* Consistency Banner */}
          <ActiveConfigBanner
            builderState={{
              requirements_v2: builderRequirementsV2,
              shift_length_hours: form.watch('system') === '8h' ? 8 : 12,
            }}
            pattern={form.watch('pattern') ? {
              id: 'current',
              sequence: form.watch('pattern').split(''),
            } : null}
          />
          
          {/* Dev-only Config Diff Panel */}
          <div className="mt-4">
            <ConfigDiffPanel
              savedConfig={savedConfigRequirements}
              builderState={builderRequirementsV2}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basics Section */}
            <Card>
              <Collapsible 
                open={openSections.basics} 
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, basics: open }))}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50">
                    <CardTitle className="flex items-center justify-between">
                      <span>1. Basic Configuration</span>
                      {openSections.basics ? <ChevronUp /> : <ChevronDown />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="system" className="text-base font-semibold">Shift System</Label>
                        <Select 
                          value={form.watch('system')}
                          onValueChange={(value) => form.setValue('system', value as any)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select system" />
                          </SelectTrigger>
                           <SelectContent className="z-50 bg-background">
                             <SelectItem value="8h">
                               <div className="flex items-center gap-2">
                                 <Clock className="h-4 w-4" />
                                 <span>8-Hour (E/L/N)</span>
                               </div>
                             </SelectItem>
                             <SelectItem value="12h">
                               <div className="flex items-center gap-2">
                                 <Clock className="h-4 w-4" />
                                 <span>12-Hour (D/N)</span>
                               </div>
                             </SelectItem>
                           </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="siteStartHour">Site Start Hour</Label>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          {...form.register('siteStartHour', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="horizonWeeks">Horizon (Weeks)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="17"
                          {...form.register('horizonWeeks', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="tz">Timezone</Label>
                        <Input {...form.register('tz')} placeholder="Europe/London" />
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Pattern Section */}
            <Card>
              <Collapsible 
                open={openSections.pattern} 
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, pattern: open }))}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50">
                    <CardTitle className="flex items-center justify-between">
                      <span>2. Shift Pattern</span>
                      {openSections.pattern ? <ChevronUp /> : <ChevronDown />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Pattern Mode Notice - Always Locked for MVP */}
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-sm text-blue-900">
                        <strong>Pattern Mode:</strong> Locked — Roster will strictly follow the selected pattern. Each staff member will be assigned shifts based on their position in the pattern cycle.
                      </AlertDescription>
                    </Alert>
                    
                    <div>
                      <Label htmlFor="pattern">Pattern Sequence</Label>
                      <Input {...form.register('pattern')} placeholder="e.g., DDNNRRRR" />
                    </div>
                    
                    {/* Cycle Anchor Date - Always shown since we're always in locked mode */}
                    <div className="space-y-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <Label className="text-base font-semibold">Cycle Anchor Date</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Reference date for pattern cycle calculations. Defaults to roster start date if not set.
                      </p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !form.watch('cycleAnchorDate') && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.watch('cycleAnchorDate') 
                              ? format(form.watch('cycleAnchorDate')!, "PPP")
                              : "Use roster start date (default)"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.watch('cycleAnchorDate')}
                            onSelect={(date) => form.setValue('cycleAnchorDate', date)}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      {form.watch('cycleAnchorDate') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => form.setValue('cycleAnchorDate', undefined)}
                          className="w-full"
                        >
                          Clear (use default)
                        </Button>
                      )}
                    </div>

                    {/* Team Index Management - Always shown since we're always in locked mode */}
                    {staffList.length > 0 && (
                      <div className="space-y-3 p-3 bg-purple-50 rounded-md border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-semibold">Team Index Assignment</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Assign team indices to staff for deterministic pattern positioning.
                            </p>
                          </div>
                          <TeamIndexManager 
                            staffList={staffList} 
                            onUpdate={() => loadStaffAndSettings()}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Pattern Adherence Mode */}
                    <div className="space-y-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                      <Label htmlFor="patternMode" className="text-base font-semibold">Pattern Adherence</Label>
                      <Select 
                        value={form.watch('patternMode') || 'locked'}
                        onValueChange={(value) => form.setValue('patternMode', value as 'locked' | 'guided')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          <SelectItem value="locked">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">🔒 Locked (Strict)</span>
                              <span className="text-xs text-muted-foreground">Each person stays on pattern (2E→2L→2N→2R)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="guided">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">⚖️ Guided (Flexible)</span>
                              <span className="text-xs text-muted-foreground">Allow fairness fills to meet demand</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {form.watch('patternMode') === 'locked' || !form.watch('patternMode')
                          ? '🔒 Locked keeps each person on their pattern. Any deficits appear as unmet demand.'
                          : '⚖️ Guided may deviate from patterns to cover gaps and balance workload.'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <Label>Presets</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(form.watch('system') === "8h" ? PATTERN_PRESETS_8H : PATTERN_PRESETS_12H).map((preset) => (
                          <Button
                            key={preset.name}
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue('pattern', preset.pattern)}
                          >
                            {preset.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {form.watch('pattern') && (
                      <div className="bg-slate-50 p-3 rounded">
                        <Label className="text-sm font-medium">Pattern Preview</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {form.watch('pattern').split('').map((token, idx) => (
                            <Badge key={idx} variant="outline">
                              {LABEL_FROM_TOKEN[token as keyof typeof LABEL_FROM_TOKEN] || token}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Staffing Section */}
            <Card>
              <Collapsible 
                open={openSections.staffing} 
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, staffing: open }))}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50">
                    <CardTitle className="flex items-center justify-between">
                      <span>3. Staffing Requirements</span>
                      {openSections.staffing ? <ChevronUp /> : <ChevronDown />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {/* Warning for supervisor nights */}
                    {!form.watch('allowSupervisorNights') && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                        <strong>Note:</strong> Supervisor nights are disabled at site level. You can still enter Night requirements; the generator will warn if no eligible staff are available.
                      </div>
                    )}
                    
                     <RequirementsMiniComposer
                      framework={form.watch('system')}
                      onFrameworkChange={(fw) => {
                        form.setValue('system', fw);
                        // Update pattern default
                        if (fw === "8h") {
                          form.setValue('pattern', "EELLNNRRRR");
                        } else {
                          form.setValue('pattern', "DDNNRRRR");
                        }
                      }}
                      onChange={(requirementsByDay) => {
                        // Convert to array format expected by form
                        const staffingArray = Object.entries(requirementsByDay).map(([dow, need]) => ({
                          dow: Number(dow),
                          need
                        }));
                        form.setValue('staffing', staffingArray);
                      }}
                    />
                    
                    {/* Save button for builder state */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      data-testid="builder-save"
                      onClick={() => {
                        // Trigger validation
                        updatePreview();
                        validateInputs();
                      }}
                    >
                      Save & Validate
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Rates Section */}
            <Card>
              <Collapsible 
                open={openSections.rates} 
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, rates: open }))}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50">
                    <CardTitle className="flex items-center justify-between">
                      <span>4. Rates & Settings</span>
                      {openSections.rates ? <ChevronUp /> : <ChevronDown />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="rates.staff">Staff Rate (£/hour)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('rates.staff', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="rates.supervisor">Supervisor Rate (£/hour)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('rates.supervisor', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allowSupervisorNights"
                        checked={form.watch('allowSupervisorNights')}
                        onCheckedChange={(checked) => form.setValue('allowSupervisorNights', !!checked)}
                      />
                      <Label htmlFor="allowSupervisorNights">Allow supervisors on night shifts</Label>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>

          {/* Right Column - Preview & Generate */}
          <div className="space-y-6">
            {/* Framework Summary Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Selected Framework</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Shift System:</span>
                    <Badge variant="default" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {form.watch('system') === '8h' ? '8-Hour' : '12-Hour'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Available Shifts:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.watch('system') === '8h' ? (
                        <>
                          <Badge variant="secondary">E - Early</Badge>
                          <Badge variant="secondary">L - Late</Badge>
                          <Badge variant="secondary">N - Night</Badge>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">D - Day</Badge>
                          <Badge variant="secondary">N - Night</Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Live Preview
                  {isLoadingPreview && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {previewData.requirements && (
                  <div>
                    <Label className="text-sm font-medium">Weekly Requirements</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(previewData.requirements).map(([token, count]) => (
                        <div key={token} className="flex justify-between text-sm">
                          <span>{LABEL_FROM_TOKEN[token as keyof typeof LABEL_FROM_TOKEN] || token}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewData.estimatedHours && (
                  <div>
                    <Label className="text-sm font-medium">Estimated Hours</Label>
                    <div className="text-lg font-bold text-blue-600">
                      {previewData.estimatedHours.toLocaleString()}h
                    </div>
                  </div>
                )}

                {previewData.estimatedCost && (
                  <div>
                    <Label className="text-sm font-medium">Estimated Cost</Label>
                    <div className="text-lg font-bold text-green-600">
                      £{previewData.estimatedCost.toLocaleString()}
                    </div>
                  </div>
                )}

                {previewData.nightCount !== undefined && (
                  <div>
                    <Label className="text-sm font-medium">Night Shifts</Label>
                    <div className="text-lg font-bold text-purple-600">
                      {previewData.nightCount}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Eligibility Inspector */}
            <EligibilityInspector 
              monthISO={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
              shiftSystem={form.watch('system')}
            />

            {/* Validation Issues */}
            {warnings.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {warnings.map((warning, idx) => (
                      <div key={idx} className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                        {warning.message}
                      </div>
                    ))}
                    <label className="flex items-start gap-2 text-sm mt-1">
                      <Checkbox
                        checked={ackWarnings}
                        onCheckedChange={(checked) => setAckWarnings(checked === true)}
                        data-testid="ack-warnings"
                      />
                      <span>
                        I acknowledge this warning and wish to continue.
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fatal Errors */}
            {fatalErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    {fatalErrors.map((error, idx) => (
                      <div key={idx} className="text-sm text-red-800 bg-red-100 border border-red-300 rounded px-2 py-1">
                        {error.message}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Generate Button */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Generate Roster
                    </>
                  )}
                </Button>
                {!canGenerate && warnings.length > 0 && !ackWarnings && fatalErrors.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1 text-center">
                    Tick the checkbox above to proceed despite warnings.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}