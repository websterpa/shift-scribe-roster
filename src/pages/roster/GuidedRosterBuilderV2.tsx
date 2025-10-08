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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface PreviewData {
  requirements?: Record<string, number>;
  estimatedHours?: number;
  estimatedCost?: number;
  nightCount?: number;
}

export default function GuidedRosterBuilderV2() {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [previewData, setPreviewData] = useState<PreviewData>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [ackWarnings, setAckWarnings] = useState(false);
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
      const configData = {
        config_name: `Generated ${values.system} Roster`,
        shift_type: values.system,
        site_start_time: `${values.siteStartHour.toString().padStart(2, '0')}:00`,
        timezone: values.tz,
        cycle_length_weeks: values.horizonWeeks,
        operational_hours_per_day: 24,
        start_date: new Date().toISOString().split('T')[0],
        staffing_requirements: Object.fromEntries(
          values.staffing.map(day => [
            day.dow,
            Object.fromEntries(
              Object.entries(day.need).filter(([_, count]) => count > 0)
            )
          ])
        ),
        pattern: values.pattern.split('')
      };

      const { data: config, error: configError } = await supabase
        .from('roster_config')
        .insert(configData)
        .select()
        .single();

      if (configError) throw configError;

      // Create roster version
      const { data: version, error: versionError } = await supabase
        .from('roster_versions')
        .insert({
          config_id: config.id,
          version_number: 1,
          version_name: 'Initial Generation'
        })
        .select()
        .single();

      if (versionError) throw versionError;

      // Generate assignments using enhanced generator
      const { generateRosterEnhanced } = await import('@/utils/roster/enhancedRosterGenerator');
      
      // Normalize requirements to ensure N tokens are preserved
      const { normalizeRequirements, printRequirementsSummary } = await import('@/utils/roster/normalizeRequirements');
      const requirementsByDay = normalizeRequirements(values.staffing);
      
      // DEV diagnostic: Print total requirements
      if (import.meta.env.DEV) {
        printRequirementsSummary(requirementsByDay);
      }
      
      // Validate all tokens are valid
      for (const [dow, reqs] of Object.entries(requirementsByDay)) {
        for (const token of Object.keys(reqs)) {
          assertShiftToken(token);
        }
      }

      const result = await generateRosterEnhanced({
        system: values.system,
        versionId: version.id,
        staff: staffList,
        requirementsByDay,
        startDate: configData.start_date,
        allowSupervisorNights: values.allowSupervisorNights,
        includeNights: values.system === "12h" || values.pattern.includes("N"),
        patternTokens: values.pattern.split('')
      });

      // DEV diagnostic: Print result summary
      if (import.meta.env.DEV) {
        console.log('🎯 Generation Result:', {
          totalAssignments: result.assignments.length,
          nightsGenerated: result.nightsGenerated,
          tokenBreakdown: result.assignments.reduce((acc, a) => {
            acc[a.shift_code] = (acc[a.shift_code] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        });
      }

      // 💾 CRITICAL: Save assignments to database with idempotency
      const assignmentsWithVersion = result.assignments.map(assignment => ({
        ...assignment,
        version_id: version.id
      }));

      // Upsert to prevent duplicates on retry (idempotency)
      const { data: savedAssignments, error: assignmentsError } = await supabase
        .from('roster_assignments')
        .upsert(assignmentsWithVersion, {
          onConflict: 'version_id,date,staff_id',
          ignoreDuplicates: false
        })
        .select('id, shift_code');

      if (assignmentsError) {
        console.error("❌ Failed to save assignments:", assignmentsError);
        throw new Error(`Failed to save assignments: ${assignmentsError.message}`);
      }

      // Verify row count matches expected
      const savedCount = savedAssignments?.length ?? 0;
      const expectedCount = result.assignments.length;

      // DEV diagnostic: Show saved token counts from DB
      if (import.meta.env.DEV && savedAssignments) {
        const savedTokenCounts = savedAssignments.reduce((acc, a) => {
          acc[a.shift_code] = (acc[a.shift_code] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('💾 Saved to DB:', {
          totalSaved: savedCount,
          nightsSaved: savedTokenCounts['N'] || 0,
          tokenCounts: savedTokenCounts
        });
      }
      
      if (savedCount !== expectedCount) {
        const msg = `⚠️ Persistence mismatch: expected ${expectedCount} assignments, saved ${savedCount}`;
        console.error(msg);
        throw new Error(msg);
      }

      // DEV diagnostic: Print saved token counts from DB
      if (import.meta.env.DEV && savedAssignments) {
        const savedTokenCounts = savedAssignments.reduce((acc, a) => {
          acc[a.shift_code] = (acc[a.shift_code] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('💾 Saved to DB:', {
          totalSaved: savedCount,
          nightsSaved: savedTokenCounts.N || 0,
          tokenCounts: savedTokenCounts
        });
      }

      toast({
        title: "Roster Generated Successfully",
        description: `Saved ${savedCount} assignments with ${result.nightsGenerated} night shifts`,
      });

      // Navigate to summary with fresh start date
      const startDate = new Date(configData.start_date);
      const monthParam = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      window.location.href = `/roster/summary?version=${version.id}&month=${monthParam}`;

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
    return true;
  }, [fatalErrors.length, warnings.length, ackWarnings, isLoadingPreview, isGenerating]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Guided Roster Builder v2</h1>
          <p className="text-slate-600 mt-2">Schema-driven, validated roster generation</p>
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
                        <Label htmlFor="system">Shift System</Label>
                        <Select onValueChange={(value) => form.setValue('system', value as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select system" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8h">8 Hour (E/L/N)</SelectItem>
                            <SelectItem value="12h">12 Hour (D/N)</SelectItem>
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
                    <div>
                      <Label htmlFor="pattern">Pattern Sequence</Label>
                      <Input {...form.register('pattern')} placeholder="e.g., DDNNRRRR" />
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
                    
                    {(() => {
                      const system = form.watch('system');
                      const tokens = allowedTokens(system);
                      const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      
                      // Calculate debug totals
                      const debugTotals = React.useMemo(() => {
                        const totals: Record<string, number> = { D: 0, E: 0, L: 0, N: 0, R: 0, S: 0 };
                        const staffingData = form.getValues('staffing');
                        staffingData.forEach((d: any) => {
                          tokens.forEach(t => {
                            totals[t] += Number(d?.need?.[t] || 0);
                          });
                        });
                        return totals;
                      }, [form.watch('staffing'), tokens]);

                      return (
                        <div className="space-y-4">
                          {/* Grid layout */}
                          <div className={`grid gap-2 text-sm ${tokens.length === 2 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                            {/* Headers */}
                            <div className="font-medium">Day</div>
                            {tokens.map(token => (
                              <div key={token} className="font-medium text-center">{LABEL[token]}</div>
                            ))}
                            
                            {/* Rows for each day */}
                            {DAYS.map((day, idx) => (
                              <React.Fragment key={day}>
                                <div className="font-medium">{day}</div>
                                {tokens.map(token => (
                                  <Input
                                    key={`${idx}-${token}`}
                                    type="number"
                                    min="0"
                                    className="w-16"
                                    data-testid={`need-${idx}-${token}`}
                                    {...form.register(`staffing.${idx}.need.${token}` as any, { valueAsNumber: true })}
                                  />
                                ))}
                              </React.Fragment>
                            ))}
                          </div>
                          
                          {/* Debug totals in development */}
                          {import.meta.env.DEV && (
                            <div className="text-xs text-slate-600 font-mono">
                              Debug totals: {tokens.map(t => `${t}:${debugTotals[t]}`).join(' • ')}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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