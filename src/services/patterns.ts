import { supabase } from "@/integrations/supabase/client";
import { getTenantId } from "@/features/tenant/useTenant";

export type PatternToken = "E" | "L" | "N" | "D" | "R";
export type SavedPattern = {
  id: string;
  site_id: string;
  created_by: string;
  name: string;
  system: "8h" | "12h";
  sequence: PatternToken[];
  cycle_length: number;
  avg_weekly_hours?: number;
  teams_required?: number;
  is_wtd_compliant?: boolean;
  description?: string;
  created_at: string;
};

export async function listPatterns(siteId: string): Promise<SavedPattern[]> {
  if (!siteId) return [];
  // TODO(tenant): Add tenant_id filter when site_patterns table has tenant_id column
  const { data, error } = await supabase
    .from("site_patterns")
    .select("id,site_id,created_by,name,system,sequence,cycle_length,created_at")
    .eq("site_id", siteId)
    // .eq("tenant_id", getTenantId()) // Uncomment when column exists
    .order("created_at", { ascending: false });
  
  if (error || !data) return [];
  
  // Coerce sequence into tokens array
  return data.map((row: any) => ({
    ...row,
    sequence: Array.isArray(row.sequence) ? row.sequence : []
  }));
}

export async function savePattern(args: {
  siteId: string;
  name: string;
  system: "8h" | "12h";
  sequence: PatternToken[];
  cycleLength: number;
  avgWeeklyHours?: number;
  teamsRequired?: number;
  isWtdCompliant?: boolean;
  description?: string;
}): Promise<{ ok: boolean; id?: string }> {
  if (!args.siteId || !args.sequence?.length) return { ok: false };
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) return { ok: false };
  
  // TODO(tenant): Include tenant_id in insert when site_patterns table has tenant_id column
  const { data, error } = await supabase
    .from("site_patterns")
    .insert({
      site_id: args.siteId,
      created_by: userData.user.id,
      name: args.name?.trim() || "Untitled pattern",
      system: args.system,
      sequence: args.sequence,
      cycle_length: args.cycleLength,
      avg_weekly_hours: args.avgWeeklyHours,
      teams_required: args.teamsRequired,
      is_wtd_compliant: args.isWtdCompliant,
      description: args.description,
      // tenant_id: getTenantId(), // Uncomment when column exists
    })
    .select("id")
    .single();

  if (error) return { ok: false };
  return { ok: true, id: data?.id };
}

export async function deletePattern(id: string): Promise<boolean> {
  if (!id) return false;
  // TODO(tenant): Add tenant_id filter when site_patterns table has tenant_id column
  const { error } = await supabase
    .from("site_patterns")
    .delete()
    .eq("id", id);
    // .eq("tenant_id", getTenantId()); // Uncomment when column exists
  return !error;
}