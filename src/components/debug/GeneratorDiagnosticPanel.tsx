import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_CORRECTIVE_POLICY } from "@/engine2/generators/correctiveRosterGenerator";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GeneratorDiagnosticPanel({ versionId }: { versionId?: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (import.meta.env.PROD) return null;
  if (!versionId) return null;

  const { data, isLoading } = useQuery({
    queryKey: ['generator-diagnostics', versionId],
    queryFn: async () => {
      // Get version and config
      const { data: version } = await supabase
        .from('roster_versions')
        .select('config_id')
        .eq('id', versionId)
        .single();

      if (!version) return null;

      // Get config
      const { data: config } = await supabase
        .from('roster_config')
        .select('*')
        .eq('id', version.config_id)
        .single();

      // Get staff
      const { data: staff } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('is_active', true);

      // Get assignments to see who was actually used
      const { data: assignments } = await supabase
        .from('roster_assignments')
        .select('staff_id')
        .eq('version_id', versionId);

      const uniqueStaffUsed = new Set(assignments?.map(a => a.staff_id) || []).size;

      return {
        staffCount: staff?.length || 0,
        staffNames: staff?.map(s => `${s.first_name} ${s.last_name}`) || [],
        staffUsedCount: uniqueStaffUsed,
        requirements: config?.staffing_requirements || {},
        policy: DEFAULT_CORRECTIVE_POLICY,
      };
    },
    enabled: !!versionId,
  });

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-amber-900">🔍 Generator Diagnostics</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2 text-amber-900 hover:bg-amber-100"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {isExpanded && (
        <>
          {isLoading ? (
            <div className="text-xs text-amber-700">Loading...</div>
          ) : data ? (
            <div className="space-y-2 text-xs text-amber-900">
              <div>
                <span className="font-semibold">Staff Pool:</span> {data.staffCount} active staff
              </div>
              <div>
                <span className="font-semibold">Staff Used:</span> {data.staffUsedCount} / {data.staffCount}
              </div>
              <div>
                <span className="font-semibold">Names:</span> {data.staffNames.join(', ')}
              </div>
              <div>
                <span className="font-semibold">Policy:</span>
                <pre className="text-[10px] bg-amber-100 p-1 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(data.policy, null, 2)}
                </pre>
              </div>
              <div>
                <span className="font-semibold">Sample Requirements (day 0):</span>
                <pre className="text-[10px] bg-amber-100 p-1 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(data.requirements['0'] || data.requirements, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700">No data available</div>
          )}
        </>
      )}
    </div>
  );
}
