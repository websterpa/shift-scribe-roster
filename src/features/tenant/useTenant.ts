import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Multi-tenant scaffolding hook.
 * Returns the current tenant_id for scoping all data queries.
 * 
 * TODO(tenant): Replace demo UUID with actual org selection from auth/profile once schema is ready.
 */
export function useTenant() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For now, use a stable demo tenant ID
    // In production, this would come from user's organization/profile
    const demoTenantId = "00000000-0000-0000-0000-000000000001";
    
    // Future: fetch from user profile/org membership
    // const { data: { user } } = await supabase.auth.getUser();
    // if (user) {
    //   const { data } = await supabase
    //     .from('user_organizations')
    //     .select('organization_id')
    //     .eq('user_id', user.id)
    //     .single();
    //   setTenantId(data?.organization_id || demoTenantId);
    // }
    
    setTenantId(demoTenantId);
    setLoading(false);
  }, []);

  return { tenantId, loading };
}

/**
 * Synchronous tenant ID getter for use outside React components.
 * Returns demo tenant ID for now.
 */
export function getTenantId(): string {
  // TODO(tenant): Implement proper tenant resolution from auth context
  return "00000000-0000-0000-0000-000000000001";
}
