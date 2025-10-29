/**
 * Pattern resolution - determine which pattern applies to each staff member
 * Priority: custom pattern binding > site default pattern
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { PatternTemplate, StaffPatternBinding } from "./types";
import { loadSitePatterns, loadCustomPatterns } from "./loaders";

/**
 * Get a staff member's pattern binding (if they have a custom pattern assigned)
 * 
 * TODO(pattern-binding): Create a `staff_pattern_bindings` table with:
 * - staff_id (uuid, FK to staff_profiles)
 * - pattern_id (uuid, FK to custom_patterns or site_patterns)
 * - pattern_start_date (date)
 * - created_at (timestamp)
 * 
 * For now, we check if the staff member has created a custom pattern themselves
 * and use that with a default start date.
 */
export async function getStaffPatternBinding(
  staffId: string
): Promise<StaffPatternBinding | null> {
  console.log('🔍 Getting pattern binding for staff:', staffId);
  
  try {
    // TODO(pattern-binding): Replace this with a proper binding table query
    // For now, check if staff has any custom patterns
    const { data: staffProfile, error: staffError } = await supabase
      .from('staff_profiles')
      .select('user_id')
      .eq('id', staffId)
      .maybeSingle();

    if (staffError) {
      console.error('❌ Error fetching staff profile:', staffError);
      return null;
    }

    if (!staffProfile?.user_id) {
      console.warn('⚠️ No user_id found for staff:', staffId);
      return null;
    }

    // Check if user has any custom patterns
    const { data: customPatterns, error: patternError } = await supabase
      .from('custom_patterns')
      .select('id, created_at')
      .eq('user_id', staffProfile.user_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (patternError) {
      console.error('❌ Error fetching custom patterns:', patternError);
      return null;
    }

    if (!customPatterns || customPatterns.length === 0) {
      console.log('✓ No custom pattern binding found for staff:', staffId);
      return null;
    }

    // Use the most recent custom pattern
    const pattern = customPatterns[0];
    console.log('✓ Found custom pattern binding:', pattern.id);

    // TODO(pattern-binding): Get actual start date from binding table
    // For now, use pattern creation date as start date
    return {
      staff_id: staffId,
      pattern_id: pattern.id,
      pattern_start_date: pattern.created_at.split('T')[0], // Convert to YYYY-MM-DD
    };

  } catch (err) {
    console.error('❌ Unexpected error getting pattern binding:', err);
    return null;
  }
}

/**
 * Resolve which pattern template applies to a staff member
 * Priority: custom pattern binding > shift pattern default
 * 
 * @param staffId - Staff member ID
 * @param tenantId - Tenant ID for filtering
 * @param siteId - Site ID for finding default patterns
 * @returns Pattern template and binding, or throws error
 */
export async function resolvePatternForStaff(
  staffId: string,
  tenantId: string,
  siteId?: string | null
): Promise<{ template: PatternTemplate; binding: StaffPatternBinding }> {
  console.log('🎯 Resolving pattern for staff:', { staffId, tenantId, siteId });

  // Get staff name for better error messages
  const { data: staffProfile } = await supabase
    .from('staff_profiles')
    .select('first_name, last_name, name')
    .eq('id', staffId)
    .maybeSingle();

  const staffName = staffProfile?.name || 
                    `${staffProfile?.first_name || ''} ${staffProfile?.last_name || ''}`.trim() ||
                    staffId;

  // Step 1: Check for custom pattern binding
  const binding = await getStaffPatternBinding(staffId);
  
  if (binding) {
    console.log('✓ Staff has custom pattern binding:', binding.pattern_id);
    
    // Load custom patterns to find the specific one
    const customPatterns = await loadCustomPatterns(tenantId);
    const template = customPatterns.find(p => p.id === binding.pattern_id);
    
    if (template) {
      // Validate template has non-empty sequence
      if (template.pattern_sequence.length === 0) {
        console.error('❌ Custom pattern has empty sequence:', template.id);
        toast({
          title: "Invalid Pattern",
          description: `Pattern "${template.pattern_name}" for ${staffName} has no shift codes`,
          variant: "destructive",
        });
        throw new Error(`Pattern ${template.id} has empty sequence`);
      }
      
      console.log('✅ Resolved to custom pattern:', template.pattern_name);
      return { template, binding };
    }
    
    console.warn('⚠️ Custom pattern not found, falling back to shift pattern');
  }

  // Step 2: Fall back to shift pattern default
  console.log('🔍 Looking for shift pattern default');
  const sitePatterns = await loadSitePatterns(tenantId);
  
  // Filter by site_id if provided
  const candidatePatterns = siteId
    ? sitePatterns.filter(p => p.site_id === siteId)
    : sitePatterns;

  if (candidatePatterns.length === 0) {
    console.error('❌ No shift patterns found');
    toast({
      title: "No Pattern Assigned",
      description: `No pattern found for ${staffName}. Please assign a pattern in Shift Patterns.`,
      variant: "destructive",
    });
    throw new Error(`No pattern found for staff ${staffId}`);
  }

  // Use the first available shift pattern
  const template = candidatePatterns[0];
  
  // Validate template has non-empty sequence
  if (template.pattern_sequence.length === 0) {
    console.error('❌ Shift pattern has empty sequence:', template.id);
    toast({
      title: "Invalid Pattern",
      description: `Shift pattern "${template.pattern_name}" has no shift codes`,
      variant: "destructive",
    });
    throw new Error(`Pattern ${template.id} has empty sequence`);
  }

  // Create a default binding using pattern start date as today
  const defaultBinding: StaffPatternBinding = {
    staff_id: staffId,
    pattern_id: template.id,
    pattern_start_date: new Date().toISOString().split('T')[0], // Today as YYYY-MM-DD
  };

  console.log('✅ Resolved to shift pattern default:', template.pattern_name);
  return { template, binding: defaultBinding };
}

/**
 * Batch resolve patterns for multiple staff members
 * Useful for roster generation across a team
 */
export async function resolvePatternsBatch(
  staffIds: string[],
  tenantId: string,
  siteId?: string | null
): Promise<Map<string, { template: PatternTemplate; binding: StaffPatternBinding }>> {
  console.log(`🎯 Batch resolving patterns for ${staffIds.length} staff members`);
  
  const results = new Map<string, { template: PatternTemplate; binding: StaffPatternBinding }>();
  const errors: string[] = [];

  for (const staffId of staffIds) {
    try {
      const resolved = await resolvePatternForStaff(staffId, tenantId, siteId);
      results.set(staffId, resolved);
    } catch (err) {
      console.error(`❌ Failed to resolve pattern for staff ${staffId}:`, err);
      errors.push(staffId);
    }
  }

  if (errors.length > 0) {
    console.warn(`⚠️ Failed to resolve patterns for ${errors.length} staff members`);
    toast({
      title: "Pattern Resolution Issues",
      description: `Could not resolve patterns for ${errors.length} staff member(s)`,
      variant: "destructive",
    });
  }

  console.log(`✅ Successfully resolved patterns for ${results.size}/${staffIds.length} staff`);
  return results;
}
