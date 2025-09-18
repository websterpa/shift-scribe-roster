import { supabase } from "@/integrations/supabase/client";

export type PatternToken = "E" | "L" | "N" | "D" | "R";
export type SavedPattern = {
  id: string;
  site_id: string;
  created_by: string;
  name: string;
  system: "8h" | "12h";
  sequence: PatternToken[];
  repeat_weeks: number;
  created_at: string;
};

export async function listPatterns(siteId: string): Promise<SavedPattern[]> {
  if (!siteId) return [];
  const { data, error } = await supabase
    .from("site_patterns")
    .select("id,site_id,created_by,name,system,sequence,repeat_weeks,created_at")
    .eq("site_id", siteId)
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
  repeatWeeks: number;
}): Promise<{ ok: boolean; id?: string }> {
  if (!args.siteId || !args.sequence?.length) return { ok: false };
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) return { ok: false };
  
  const { data, error } = await supabase
    .from("site_patterns")
    .insert({
      site_id: args.siteId,
      created_by: userData.user.id,
      name: args.name?.trim() || "Untitled pattern",
      system: args.system,
      sequence: args.sequence,
      repeat_weeks: args.repeatWeeks
    })
    .select("id")
    .single();

  if (error) return { ok: false };
  return { ok: true, id: data?.id };
}

export async function deletePattern(id: string): Promise<boolean> {
  if (!id) return false;
  const { error } = await supabase.from("site_patterns").delete().eq("id", id);
  return !error;
}