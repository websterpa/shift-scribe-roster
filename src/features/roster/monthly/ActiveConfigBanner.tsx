import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Info, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConfigData {
  pattern_name: string;
  shift_type: string;
  staffing_requirements: any;
  standard_contract_hours: number;
  buffer_pct?: number;
  auto_reduce?: boolean;
}

export function ActiveConfigBanner() {
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const fromFeasibility = searchParams.get('from') === 'feasibility';

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("roster_config")
        .select(`
          shift_type,
          staffing_requirements,
          standard_contract_hours,
          site_patterns!inner(name)
        `)
        .eq("tenant_id", "00000000-0000-0000-0000-000000000001")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Get auto-reduce from localStorage (same key as Feasibility page)
        const autoReduce = localStorage.getItem('feasibility.autoReduce') === '1';
        
        setConfig({
          pattern_name: (data.site_patterns as any)?.name || "Unknown",
          shift_type: data.shift_type,
          staffing_requirements: data.staffing_requirements,
          standard_contract_hours: data.standard_contract_hours,
          auto_reduce: autoReduce
        });
      } else {
        setConfig(null);
      }
    } catch (err) {
      console.error("Error loading active config:", err);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  if (loading) {
    return null;
  }

  if (!config || dismissed) {
    return null;
  }

  const is8h = config.shift_type === "8h";
  const staffReq = config.staffing_requirements || {};
  const requiredDisplay = is8h
    ? `E ${staffReq.early_shift_staff || 0} / L ${staffReq.late_shift_staff || 0} / N ${staffReq.night_shift_staff || 0}`
    : `D ${staffReq.day_shift_staff || 0} / N ${staffReq.night_shift_staff || 0}`;

  return (
    <Card className={`mb-4 ${fromFeasibility ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                {fromFeasibility ? '✓ Loaded from Feasibility' : 'Active Configuration'}
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>These defaults apply when you create a new roster. Existing rosters keep their own snapshot.</p>
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
          </div>
          
          <div className="flex items-center gap-2">
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
    </Card>
  );
}
