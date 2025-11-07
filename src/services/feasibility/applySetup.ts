import { supabase } from "@/integrations/supabase/client";
import type { RequirementsV2 } from "@/types/requirementsV2";
import { trace } from "@/lib/devTrace";

export interface ApplySetupInput {
  patternId: string;
  shiftLengthHours: number;
  requirementsV2: RequirementsV2;
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

  // Ensure all day buckets are properly set
  const shiftType = input.requirementsV2.framework;
  
  // Ensure saturday and sunday exist, default to weekdays if missing
  const normalizedReqV2 = {
    framework: input.requirementsV2.framework,
    days: {
      weekdays: input.requirementsV2.days.weekdays,
      saturday: input.requirementsV2.days.saturday || input.requirementsV2.days.weekdays,
      sunday: input.requirementsV2.days.sunday || input.requirementsV2.days.weekdays,
    }
  };
  
  // Keep legacy staffing_requirements for backward compatibility
  const staffingRequirements: any = {};
  const { weekdays } = normalizedReqV2.days;
  
  if (shiftType === '8h') {
    const day8h = weekdays as { E: number; L: number; N: number };
    staffingRequirements.early_shift_staff = day8h.E || 0;
    staffingRequirements.late_shift_staff = day8h.L || 0;
    staffingRequirements.night_shift_staff = day8h.N || 0;
  } else {
    const day12h = weekdays as { D: number; N: number };
    staffingRequirements.day_shift_staff = day12h.D || 0;
    staffingRequirements.night_shift_staff = day12h.N || 0;
  }

  // Required shifts array for pattern matching (from weekdays)
  const requiredShifts = Object.keys(weekdays).filter(
    k => (weekdays as any)[k] > 0
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

  // Trace the requirements being applied
  trace("feasibility.applied.requirements_v2", {
    framework: input.requirementsV2.framework,
    weekdays: input.requirementsV2.days.weekdays,
    saturday: input.requirementsV2.days.saturday,
    sunday: input.requirementsV2.days.sunday,
  });

  const configData = {
    tenant_id: tenantId,
    config_name: `Feasibility ${pattern.name} ${new Date().toISOString().slice(0, 10)}`,
    cycle_length_weeks: pattern.cycle_length || 17,
    shift_type: shiftType,
    staffing_requirements: staffingRequirements, // Legacy field (kept for old code)
    requirements_v2: normalizedReqV2, // New unified schema with all day buckets
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
    pattern_adherence_mode: 'locked', // Default to locked mode for feasibility setups
    cycle_index: 0
  };

  console.log('💾 Inserting roster_config:', configData);

  const { data: savedConfig, error: insertError } = await supabase
    .from('roster_config')
    .insert(configData as any) // Cast to any due to JSONB field type complexity
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
    requirementsV2: input.requirementsV2,
    autoReduceEnabled: input.autoReduceEnabled
  }));

  // Store auto-reduce preference
  localStorage.setItem('feasibility.autoReduce', input.autoReduceEnabled ? '1' : '0');

  return savedConfig as RosterConfigRow;
}
