import { supabase } from '@/integrations/supabase/client';
import { getTenantId } from '@/utils/tenant';
import type { RequirementsV2 } from '@/types/requirementsV2';

export type PartialConfig = {
  id?: string;
  tenant_id?: string;
  requirements_v2?: RequirementsV2 | null;
  shift_length_hours?: number | null;
  buffer_pct?: number | null;
  standard_contract_hours?: number | null;
  auto_reduce_enabled?: boolean | null;
  pattern_id?: string | null;
};

async function updateRosterConfig(patch: PartialConfig) {
  const tenantId = patch.tenant_id ?? getTenantId();
  const fields: any = {
    requirements_v2: patch.requirements_v2 ? JSON.parse(JSON.stringify(patch.requirements_v2)) : null,
    shift_type: patch.shift_length_hours === 8 ? '8h' : '12h',
    buffer_pct: patch.buffer_pct ?? null,
    standard_contract_hours: patch.standard_contract_hours ?? null,
    pattern_id: patch.pattern_id ?? null,
  };
  
  const q = supabase.from('roster_config').update(fields);
  if (patch.id) {
    q.eq('id', patch.id);
  } else {
    q.eq('tenant_id', tenantId);
  }
  
  const { error } = await q;
  if (error) throw error;
  
  // Update localStorage for auto_reduce if provided
  if (patch.auto_reduce_enabled !== undefined && patch.auto_reduce_enabled !== null) {
    localStorage.setItem('feasibility.autoReduce', patch.auto_reduce_enabled ? '1' : '0');
  }
  
  // Update localStorage for buffer if provided
  if (patch.buffer_pct !== undefined && patch.buffer_pct !== null) {
    const feasibilityConfig = localStorage.getItem('feasibilityConfig');
    let config = feasibilityConfig ? JSON.parse(feasibilityConfig) : {};
    config.bufferPct = patch.buffer_pct;
    localStorage.setItem('feasibilityConfig', JSON.stringify(config));
  }
}

export async function reconcileToFeasibility(params: {
  config: PartialConfig;
  snapshot: PartialConfig;
  alsoUpdateSnapshot?: boolean;
}) {
  const { config, snapshot } = params;
  
  const patch: PartialConfig = {
    id: config.id,
    tenant_id: config.tenant_id,
    requirements_v2: snapshot.requirements_v2 ?? null,
    shift_length_hours: snapshot.shift_length_hours ?? null,
    buffer_pct: snapshot.buffer_pct ?? null,
    standard_contract_hours: snapshot.standard_contract_hours ?? null,
    auto_reduce_enabled: snapshot.auto_reduce_enabled ?? null,
    pattern_id: snapshot.pattern_id ?? null,
  };
  
  await updateRosterConfig(patch);
}

export async function reconcileToBuilder(params: {
  config: PartialConfig;
  builder: PartialConfig;
  alsoUpdateSnapshot?: boolean;
}) {
  const { config, builder } = params;
  
  const patch: PartialConfig = {
    id: config.id,
    tenant_id: config.tenant_id,
    requirements_v2: builder.requirements_v2 ?? null,
    shift_length_hours: builder.shift_length_hours ?? null,
    buffer_pct: builder.buffer_pct ?? null,
    standard_contract_hours: builder.standard_contract_hours ?? null,
    auto_reduce_enabled: builder.auto_reduce_enabled ?? null,
    pattern_id: builder.pattern_id ?? null,
  };
  
  await updateRosterConfig(patch);
}
