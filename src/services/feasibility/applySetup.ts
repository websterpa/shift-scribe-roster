import { supabase } from "@/integrations/supabase/client";

export interface ApplySetupInput {
  patternId: string;
  shiftLengthHours: number;
  requiredPerDay: Partial<Record<string, number>>;
  bufferPct: number;
  standardContractHours: number;
  autoReduceEnabled: boolean;
}

export interface RosterConfigRow {
  id: string;
  tenant_id: string;
  config_name: string;
  cycle_length_weeks: number;
  shift_type: string;
  staffing_requirements: any;
  standard_contract_hours: number;
  timezone: string;
  site_start_time: string;
  start_date: string;
  operational_hours_per_day: number;
  created_at: string;
}

export async function applySetupFromFeasibility(
  input: ApplySetupInput
): Promise<RosterConfigRow> {
  console.log('📝 Applying feasibility setup to roster_config...', input);

  const tenantId = '00000000-0000-0000-0000-000000000001';
  
  // Get pattern info
  const { data: pattern, error: patternError } = await supabase
    .from('site_patterns')
    .select('*')
    .eq('id', input.patternId)
    .single();
    
  if (patternError || !pattern) {
    throw new Error(`Pattern not found: ${patternError?.message}`);
  }

  // Map per-shift requirements to staffing_requirements format
  const staffingRequirements: any = {};
  const shiftType = input.shiftLengthHours === 8 ? '8h' : '12h';
  
  if (shiftType === '8h') {
    staffingRequirements.early_shift_staff = input.requiredPerDay.E || 0;
    staffingRequirements.late_shift_staff = input.requiredPerDay.L || 0;
    staffingRequirements.night_shift_staff = input.requiredPerDay.N || 0;
  } else {
    staffingRequirements.day_shift_staff = input.requiredPerDay.D || 0;
    staffingRequirements.night_shift_staff = input.requiredPerDay.N || 0;
  }

  // Required shifts array for pattern matching
  const requiredShifts = Object.keys(input.requiredPerDay).filter(
    k => (input.requiredPerDay as any)[k] > 0
  );

  // Calculate start date (next Monday)
  const getNextMonday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 1 : (8 - day) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + diff);
    return nextMonday.toISOString().split('T')[0];
  };

  const configData = {
    tenant_id: tenantId,
    config_name: `Feasibility ${pattern.name} ${new Date().toISOString().slice(0, 10)}`,
    cycle_length_weeks: pattern.cycle_length || 17,
    shift_type: shiftType,
    staffing_requirements: staffingRequirements,
    standard_contract_hours: input.standardContractHours,
    timezone: 'Europe/London',
    site_start_time: '07:00',
    start_date: getNextMonday(),
    operational_hours_per_day: 24,
    pattern: pattern.sequence,
    required_shifts: requiredShifts,
    handshake_minutes: 0,
    default_ot_hours: null,
    default_ot_start_local_time: null,
    pattern_locked: true,
    cycle_index: 0
  };

  console.log('💾 Inserting roster_config:', configData);

  const { data: savedConfig, error: insertError } = await supabase
    .from('roster_config')
    .insert(configData)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error inserting roster_config:', insertError);
    throw new Error(`Failed to save config: ${insertError.message}`);
  }

  console.log('✅ Config saved:', savedConfig);

  // Also save to localStorage for backward compatibility
  localStorage.setItem('feasibilityConfig', JSON.stringify({
    patternId: input.patternId,
    patternName: pattern.name,
    shiftLength: input.shiftLengthHours,
    bufferPct: input.bufferPct,
    standardContractHours: input.standardContractHours,
    timestamp: new Date().toISOString(),
    system: shiftType,
    requiredPerDay: input.requiredPerDay,
    autoReduceEnabled: input.autoReduceEnabled
  }));

  // Store auto-reduce preference
  localStorage.setItem('feasibility.autoReduce', input.autoReduceEnabled ? '1' : '0');

  return savedConfig as RosterConfigRow;
}
