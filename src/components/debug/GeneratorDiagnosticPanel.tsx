import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_CORRECTIVE_POLICY } from "@/engine2/generators/correctiveRosterGenerator";
import { ChevronDown, ChevronUp, Users, UserCheck, Shield, Clock, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

  const utilizationPercentage = data ? Math.round((data.staffUsedCount / data.staffCount) * 100) : 0;
  const isUnderUtilized = utilizationPercentage < 80;

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50/50">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-900">Generator Diagnostics</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 px-2 text-amber-900 hover:bg-amber-100"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-xs text-amber-700">Loading diagnostics...</div>
        ) : data ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-amber-100">
                <Users className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <div className="text-xs text-amber-700 mb-0.5">Staff Pool</div>
                  <div className="text-lg font-bold text-amber-900">{data.staffCount}</div>
                  <div className="text-[10px] text-amber-600">active members</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-amber-100">
                <UserCheck className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <div className="text-xs text-amber-700 mb-0.5">Staff Used</div>
                  <div className="text-lg font-bold text-amber-900">
                    {data.staffUsedCount} <span className="text-sm font-normal text-amber-600">/ {data.staffCount}</span>
                  </div>
                  <div className="text-[10px] text-amber-600">
                    {utilizationPercentage}% utilization
                    {isUnderUtilized && " ⚠️"}
                  </div>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-3 pt-2 border-t border-amber-200">
                {/* Scheduling Rules */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-900">Scheduling Rules</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 rounded border border-amber-100">
                      <div className="text-[10px] text-amber-600 mb-1">Max Consecutive Days</div>
                      <div className="text-sm font-bold text-amber-900">{data.policy.maxConsecDays} days</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-amber-100">
                      <div className="text-[10px] text-amber-600 mb-1">Min Rest Between Shifts</div>
                      <div className="text-sm font-bold text-amber-900">{data.policy.minGapHoursBetweenShifts}h</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-amber-100">
                      <div className="text-[10px] text-amber-600 mb-1">Max Consecutive Nights</div>
                      <div className="text-sm font-bold text-amber-900">{data.policy.maxConsecNights} nights</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-amber-100">
                      <div className="text-[10px] text-amber-600 mb-1">Weekly Hours Cap</div>
                      <div className="text-sm font-bold text-amber-900">{data.policy.weeklyHoursCap}h</div>
                    </div>
                  </div>
                </div>

                {/* Coverage Requirements */}
                {Object.keys(data.requirements).length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-900">Daily Coverage Requirements</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-amber-100">
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(data.requirements['0'] || data.requirements).map(([shift, count]) => (
                          <Badge key={shift} variant="outline" className="bg-amber-50 text-amber-900 border-amber-200">
                            <span className="font-bold">{shift}:</span> {count as number} staff
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Staff Names */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-900">Team Members ({data.staffNames.length})</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-amber-100 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {data.staffNames.map((name, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] bg-amber-100 text-amber-900">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-amber-700">No diagnostic data available</div>
        )}
      </CardContent>
    </Card>
  );
}
