import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Info, X, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { detectConfigDrift, type FeasibilitySnapshot, type LiveConfig } from "@/services/feasibility/snapshotDiff";
import { checkConfig, type ConsistencyIssue } from "@/utils/consistency/checkConfig";
import { reconcileToFeasibility, reconcileToBuilder } from "@/services/config/reconcile";
import { useToast } from "@/hooks/use-toast";
import type { RequirementsV2 } from "@/types/requirementsV2";
import { trace } from "@/lib/devTrace";

interface ConfigData {
  pattern_id: string;
  pattern_name: string;
  shift_type: string;
  staffing_requirements: any;
  requirements_v2: RequirementsV2 | null;
  standard_contract_hours: number;
  buffer_pct?: number;
  auto_reduce?: boolean;
  tenant_id?: string;
}

interface ActiveConfigBannerProps {
  builderState?: {
    requirements_v2: RequirementsV2 | null;
    shift_length_hours?: number;
  };
  pattern?: {
    id: string;
    sequence: string[];
  } | null;
}

export function ActiveConfigBanner({ builderState, pattern }: ActiveConfigBannerProps = {}) {
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [snapshot, setSnapshot] = useState<FeasibilitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [driftExpanded, setDriftExpanded] = useState(false);
  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [openFixFeas, setOpenFixFeas] = useState(false);
  const [openFixBuilder, setOpenFixBuilder] = useState(false);
  const { toast } = useToast();
  const fromFeasibility = searchParams.get('from') === 'feasibility';
  const versionId = searchParams.get('version');

  const loadConfig = async () => {
    setLoading(true);
    try {
      // Load live config
      const { data: configData, error: configError } = await supabase
        .from("roster_config")
        .select(`
          id,
          shift_type,
          staffing_requirements,
          requirements_v2,
          standard_contract_hours,
          site_patterns!inner(id, name)
        `)
        .eq("tenant_id", "00000000-0000-0000-0000-000000000001")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (configError) throw configError;
      
      if (configData) {
        // Get auto-reduce from localStorage (same key as Feasibility page)
        const autoReduce = localStorage.getItem('feasibility.autoReduce') === '1';
        
        // Get buffer from localStorage if available
        const feasibilityConfig = localStorage.getItem('feasibilityConfig');
        let bufferPct = 10; // default
        if (feasibilityConfig) {
          try {
            const parsed = JSON.parse(feasibilityConfig);
            bufferPct = parsed.bufferPct ?? 10;
          } catch (e) {
            console.warn('Failed to parse feasibilityConfig from localStorage');
          }
        }
        
        const reqV2 = configData.requirements_v2 as unknown as RequirementsV2 | null;
        
        // Trace the config loaded from database
        if (reqV2) {
          trace("builder.loaded.requirements_v2.database", {
            framework: reqV2.framework,
            weekdays: reqV2.days.weekdays,
            saturday: reqV2.days.saturday,
            sunday: reqV2.days.sunday,
          });
        }
        
        setConfig({
          pattern_id: (configData.site_patterns as any)?.id || "",
          pattern_name: (configData.site_patterns as any)?.name || "Unknown",
          shift_type: configData.shift_type,
          staffing_requirements: configData.staffing_requirements,
          requirements_v2: reqV2,
          standard_contract_hours: configData.standard_contract_hours,
          buffer_pct: bufferPct,
          auto_reduce: autoReduce,
          tenant_id: "00000000-0000-0000-0000-000000000001"
        });
      } else {
        setConfig(null);
      }

      // Load feasibility snapshot if viewing a version
      if (versionId) {
        const { data: versionData, error: versionError } = await supabase
          .from("roster_versions")
          .select("feasibility_snapshot")
          .eq("id", versionId)
          .maybeSingle();

        if (!versionError && versionData?.feasibility_snapshot) {
          setSnapshot(versionData.feasibility_snapshot as unknown as FeasibilitySnapshot);
        } else {
          setSnapshot(null);
        }
      } else {
        setSnapshot(null);
      }
    } catch (err) {
      console.error("Error loading active config:", err);
      setConfig(null);
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [versionId]);

  if (loading) {
    return null;
  }

  if (!config || dismissed) {
    return null;
  }

  // Detect drift if we have a snapshot
  const liveConfig: LiveConfig = {
    pattern_id: config.pattern_id,
    pattern_name: config.pattern_name,
    framework: config.shift_type as '8h' | '12h',
    requirements_v2: config.requirements_v2,
    buffer_pct: config.buffer_pct ?? 10,
    standard_contract_hours: config.standard_contract_hours,
    auto_reduce_enabled: config.auto_reduce ?? false,
  };

  const diffs = detectConfigDrift(snapshot, liveConfig);
  const hasDrift = diffs && diffs.length > 0;

  // Run consistency checks
  const consistencyIssues = useMemo<ConsistencyIssue[]>(() => {
    if (!config) return [];
    
    const shiftLengthHours = config.shift_type === '8h' ? 8 : 12;
    
    return checkConfig({
      tenantId: config.tenant_id,
      config: {
        tenant_id: config.tenant_id,
        shift_length_hours: shiftLengthHours,
        buffer_pct: config.buffer_pct ?? 10,
        standard_contract_hours: config.standard_contract_hours,
        auto_reduce_enabled: config.auto_reduce ?? false,
        pattern_id: config.pattern_id,
        requirements_v2: config.requirements_v2,
      },
      builder: builderState || {
        requirements_v2: config.requirements_v2,
        shift_length_hours: shiftLengthHours,
      },
      pattern: pattern,
      snapshot: snapshot ? {
        requirements_v2: snapshot.requirements_v2,
        shift_length_hours: snapshot.framework === '8h' ? 8 : 12,
        buffer_pct: snapshot.buffer_pct,
        standard_contract_hours: snapshot.standard_contract_hours,
        auto_reduce_enabled: snapshot.auto_reduce_enabled,
        pattern_id: snapshot.pattern_id,
      } : null,
    });
  }, [config, builderState, pattern, snapshot]);

  const errorCount = consistencyIssues.filter(i => i.severity === 'error').length;
  const warnCount = consistencyIssues.filter(i => i.severity === 'warn').length;
  const infoCount = consistencyIssues.filter(i => i.severity === 'info').length;
  const totalIssues = consistencyIssues.length;

  const is8h = config.shift_type === "8h";
  const staffReq = config.staffing_requirements || {};
  const requiredDisplay = is8h
    ? `E ${staffReq.early_shift_staff || 0} / L ${staffReq.late_shift_staff || 0} / N ${staffReq.night_shift_staff || 0}`
    : `D ${staffReq.day_shift_staff || 0} / N ${staffReq.night_shift_staff || 0}`;

  // Determine banner color
  const bannerClass = hasDrift
    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
    : fromFeasibility
    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200';

  const handleReconcileToFeasibility = async () => {
    try {
      await reconcileToFeasibility({
        config: {
          id: config?.pattern_id,
          tenant_id: config?.tenant_id,
          requirements_v2: config?.requirements_v2 ?? null,
          shift_length_hours: config?.shift_type === '8h' ? 8 : 12,
          buffer_pct: config?.buffer_pct ?? null,
          standard_contract_hours: config?.standard_contract_hours ?? null,
          auto_reduce_enabled: config?.auto_reduce ?? null,
          pattern_id: config?.pattern_id ?? null,
        },
        snapshot: {
          requirements_v2: snapshot?.requirements_v2 ?? null,
          shift_length_hours: snapshot?.framework === '8h' ? 8 : 12,
          buffer_pct: snapshot?.buffer_pct ?? null,
          standard_contract_hours: snapshot?.standard_contract_hours ?? null,
          auto_reduce_enabled: snapshot?.auto_reduce_enabled ?? null,
          pattern_id: snapshot?.pattern_id ?? null,
        },
      });
      await loadConfig();
      toast({ title: 'Reconciled', description: 'Config now matches Feasibility snapshot.' });
      setOpenFixFeas(false);
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleReconcileToBuilder = async () => {
    try {
      await reconcileToBuilder({
        config: {
          id: config?.pattern_id,
          tenant_id: config?.tenant_id,
          requirements_v2: config?.requirements_v2 ?? null,
          shift_length_hours: config?.shift_type === '8h' ? 8 : 12,
          buffer_pct: config?.buffer_pct ?? null,
          standard_contract_hours: config?.standard_contract_hours ?? null,
          auto_reduce_enabled: config?.auto_reduce ?? null,
          pattern_id: config?.pattern_id ?? null,
        },
        builder: {
          requirements_v2: builderState?.requirements_v2 ?? null,
          shift_length_hours: builderState?.shift_length_hours ?? null,
        },
      });
      await loadConfig();
      toast({ title: 'Reconciled', description: 'Config now matches Builder state.' });
      setOpenFixBuilder(false);
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card className={`mb-4 ${bannerClass}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {hasDrift ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Configuration Drift Detected
                  </h3>
                </>
              ) : snapshot ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Loaded from Feasibility
                  </h3>
                </>
              ) : (
                <h3 className="text-sm font-semibold text-foreground">
                  Active Configuration
                </h3>
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      {hasDrift
                        ? "This roster's configuration differs from the feasibility settings used when it was generated."
                        : snapshot
                        ? "This roster matches its feasibility snapshot."
                        : "These defaults apply when you create a new roster. Existing rosters keep their own snapshot."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">Pattern:</span>
                <span>{config.pattern_name}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">Shift length:</span>
                <span>{config.shift_type}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">Required/day:</span>
                <span>{requiredDisplay}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">Contract:</span>
                <span>{config.standard_contract_hours}h</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">Auto-reduce:</span>
                <span className={config.auto_reduce ? "text-green-600" : "text-muted-foreground"}>
                  {config.auto_reduce ? "ON" : "OFF"}
                </span>
              </div>
            </div>

            {/* Consistency Issues */}
            {totalIssues > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-foreground">Issues:</span>
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    data-testid="config-issues-count"
                  >
                    {totalIssues}
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-xs" data-severity="error">
                      {errorCount} error{errorCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {warnCount > 0 && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800" data-severity="warn">
                      {warnCount} warning{warnCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {infoCount > 0 && (
                    <Badge variant="secondary" className="text-xs" data-severity="info">
                      {infoCount} info
                    </Badge>
                  )}
                </div>
                
                <Collapsible open={issuesExpanded} onOpenChange={setIssuesExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs px-0 h-auto">
                      {issuesExpanded ? "Hide" : "Show"} details
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div 
                      className="bg-white/60 rounded-md border border-gray-200 p-3 space-y-2"
                      data-testid="config-issues-list"
                    >
                      {consistencyIssues.map((issue, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-start gap-2 text-xs p-2 rounded ${
                            issue.severity === 'error' 
                              ? 'bg-red-50 border border-red-200' 
                              : issue.severity === 'warn'
                              ? 'bg-amber-50 border border-amber-200'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          {issue.severity === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          ) : issue.severity === 'warn' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <Info className="h-4 w-4 text-gray-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{issue.message}</div>
                            {issue.details && (
                              <div className="text-muted-foreground mt-1">{issue.details}</div>
                            )}
                            {issue.path && (
                              <div className="text-muted-foreground font-mono text-[10px] mt-1">
                                {issue.path}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Drift details */}
            {hasDrift && diffs && (
              <Collapsible open={driftExpanded} onOpenChange={setDriftExpanded} className="mt-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs px-0 h-auto">
                    {driftExpanded ? "Hide" : "Show"} differences ({diffs.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-white/60 rounded-md border border-yellow-200 p-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1 font-medium">Field</th>
                          <th className="text-left py-1 font-medium">Snapshot</th>
                          <th className="text-left py-1 font-medium">Current</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffs.map((diff, idx) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-0">
                            <td className="py-1.5 text-muted-foreground">{diff.label}</td>
                            <td className="py-1.5 font-mono">{diff.snapshot}</td>
                            <td className="py-1.5 font-mono text-orange-600">{diff.current}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenFixFeas(true)}
                      disabled={!snapshot || !hasDrift}
                      className="shrink-0"
                    >
                      Fix to Feasibility
                    </Button>
                  </span>
                </TooltipTrigger>
                {!snapshot && (
                  <TooltipContent>No feasibility snapshot saved</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setOpenFixBuilder(true)}
                      disabled={!builderState || totalIssues === 0}
                      className="shrink-0"
                    >
                      Fix to Builder
                    </Button>
                  </span>
                </TooltipTrigger>
                {!builderState && (
                  <TooltipContent>Builder state not available</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <Button
              size="sm"
              variant="outline"
              onClick={loadConfig}
              disabled={loading}
              className="shrink-0"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Resync
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={openFixFeas} onOpenChange={setOpenFixFeas}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite config from Feasibility snapshot?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="mt-2 text-sm text-muted-foreground">
            This will copy: requirements, shift length, buffer, contract hours, auto-reduce, and pattern.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReconcileToFeasibility}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openFixBuilder} onOpenChange={setOpenFixBuilder}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite config from Builder state?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="mt-2 text-sm text-muted-foreground">
            This will copy: requirements and shift length from the current Builder inputs.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReconcileToBuilder}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
