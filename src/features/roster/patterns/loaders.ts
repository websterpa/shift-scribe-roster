/**
 * Pattern loaders - fetch patterns from Supabase and map to canonical types
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { PatternTemplate, ShiftCode } from "./types";

/**
 * Validate that a string is a valid ShiftCode
 */
function isValidShiftCode(code: string): code is ShiftCode {
  return ['D', 'N', 'E', 'L', 'R'].includes(code);
}

/**
 * Coerce pattern sequence to ShiftCode array, filtering invalid codes
 */
function normalizePatternSequence(sequence: unknown): ShiftCode[] {
  console.log('🔍 Normalizing pattern sequence:', sequence);
  
  if (!sequence) return [];
  
  // Handle array
  if (Array.isArray(sequence)) {
    return sequence.filter((code): code is ShiftCode => {
      if (typeof code === 'string' && isValidShiftCode(code)) {
        return true;
      }
      console.warn(`⚠️ Invalid shift code filtered out: ${code}`);
      return false;
    });
  }
  
  // Handle JSONB object with sequence property
  if (typeof sequence === 'object' && sequence !== null && 'sequence' in sequence) {
    return normalizePatternSequence((sequence as any).sequence);
  }
  
  console.warn('⚠️ Unrecognized pattern sequence format:', sequence);
  return [];
}

/**
 * Load site-wide patterns from public.site_patterns table
 * @param tenantId - Tenant identifier for filtering (future)
 * @returns Array of canonical PatternTemplate objects
 */
export async function loadSitePatterns(tenantId: string): Promise<PatternTemplate[]> {
  console.log('📦 Loading site patterns for tenant:', tenantId);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('⚠️ No authenticated user, cannot load site patterns');
      return [];
    }

    // TODO(tenant): Add tenant_id column to site_patterns table for proper multi-tenancy
    // For now, filter by created_by (user_id)
    const { data, error } = await supabase
      .from('site_patterns')
      .select('*')
      .eq('created_by', user.id);

    if (error) {
      console.error('❌ Error loading site patterns:', error);
      toast({
        title: "Error loading patterns",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    if (!data) {
      console.log('✓ No site patterns found');
      return [];
    }

    console.log(`✓ Found ${data.length} site patterns in DB`);

    // Map DB rows to PatternTemplate
    const templates: PatternTemplate[] = [];
    
    for (const row of data) {
      const sequence = normalizePatternSequence(row.sequence);
      const patternLength = sequence.length;

      // Validate pattern_length matches sequence length
      if (row.cycle_length && patternLength !== row.cycle_length * 7) {
        console.warn(
          `⚠️ Pattern "${row.name}" has mismatched length: sequence=${patternLength}, cycle_length=${row.cycle_length}`
        );
        // Not a hard error - just log warning
      }

      if (patternLength === 0) {
        console.warn(`⚠️ Skipping pattern "${row.name}" - empty sequence`);
        continue;
      }

      templates.push({
        id: row.id,
        tenant_id: tenantId, // TODO: use actual tenant_id from DB when available
        site_id: row.site_id || null,
        pattern_name: row.name,
        pattern_sequence: sequence,
        pattern_length: patternLength,
      });
    }

    console.log(`✓ Loaded ${templates.length} valid site patterns`);
    return templates;

  } catch (err) {
    console.error('❌ Unexpected error loading site patterns:', err);
    toast({
      title: "Failed to load patterns",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    return [];
  }
}

/**
 * Load user-created custom patterns from public.custom_patterns table
 * @param tenantId - Tenant identifier for filtering (future)
 * @returns Array of canonical PatternTemplate objects
 */
export async function loadCustomPatterns(tenantId: string): Promise<PatternTemplate[]> {
  console.log('📦 Loading custom patterns for tenant:', tenantId);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('⚠️ No authenticated user, cannot load custom patterns');
      return [];
    }

    // TODO(tenant): Add tenant_id column to custom_patterns table for proper multi-tenancy
    // For now, filter by user_id
    const { data, error } = await supabase
      .from('custom_patterns')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error loading custom patterns:', error);
      toast({
        title: "Error loading custom patterns",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    if (!data) {
      console.log('✓ No custom patterns found');
      return [];
    }

    console.log(`✓ Found ${data.length} custom patterns in DB`);

    // Map DB rows to PatternTemplate
    const templates: PatternTemplate[] = [];
    
    for (const row of data) {
      const sequence = normalizePatternSequence(row.pattern);
      const patternLength = sequence.length;

      // Validate non-empty
      if (patternLength === 0) {
        console.warn(`⚠️ Skipping custom pattern "${row.name}" - empty sequence`);
        toast({
          title: "Invalid pattern",
          description: `Pattern "${row.name}" has no valid shift codes`,
          variant: "destructive",
        });
        continue;
      }

      templates.push({
        id: row.id,
        tenant_id: tenantId, // TODO: use actual tenant_id from DB when available
        site_id: null, // custom patterns are user-specific, not site-specific
        pattern_name: row.name,
        pattern_sequence: sequence,
        pattern_length: patternLength,
      });
    }

    console.log(`✓ Loaded ${templates.length} valid custom patterns`);
    return templates;

  } catch (err) {
    console.error('❌ Unexpected error loading custom patterns:', err);
    toast({
      title: "Failed to load custom patterns",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    return [];
  }
}

/**
 * Load all patterns (site + custom) for a tenant
 */
export async function loadAllPatterns(tenantId: string): Promise<PatternTemplate[]> {
  console.log('📦 Loading all patterns for tenant:', tenantId);
  
  const [sitePatterns, customPatterns] = await Promise.all([
    loadSitePatterns(tenantId),
    loadCustomPatterns(tenantId),
  ]);

  const all = [...sitePatterns, ...customPatterns];
  console.log(`✓ Total patterns loaded: ${all.length} (${sitePatterns.length} site, ${customPatterns.length} custom)`);
  
  return all;
}
