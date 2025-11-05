/**
 * Feasibility Scenarios Service
 * Manages saving, loading, and comparing feasibility calculator scenarios
 */

import { supabase } from '@/integrations/supabase/client';
import type { AdjustmentRecommendation } from './recommendAdjustments';

export interface FeasibilityScenario {
  id?: string;
  user_id?: string;
  name: string;
  pattern_id: string | null;
  pattern_name: string;
  staff_count: number | null;
  shift_length: number;
  buffer_percent: number;
  required_shifts_per_day: number;
  avg_weekly_hours: number | null;
  required_staff: number | null;
  utilization_pct: number | null;
  is_wtd_compliant: boolean;
  total_breaches: number;
  avg_rolling: number | null;
  max_rolling: number | null;
  standard_contract_hours?: number;
  recommendations: AdjustmentRecommendation[];
  created_at?: string;
  updated_at?: string;
}

export interface SaveScenarioInput {
  name: string;
  pattern_id: string | null;
  pattern_name: string;
  staff_count: number | null;
  shift_length: number;
  buffer_percent: number;
  required_shifts_per_day: number;
  avg_weekly_hours: number | null;
  required_staff: number | null;
  utilization_pct: number | null;
  is_wtd_compliant: boolean;
  total_breaches: number;
  avg_rolling: number | null;
  max_rolling: number | null;
  standard_contract_hours?: number;
  recommendations: AdjustmentRecommendation[];
}

/**
 * Save a new feasibility scenario
 */
export async function saveScenario(input: SaveScenarioInput) {
  console.log('💾 Saving feasibility scenario:', input.name);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to save scenarios');
  }

  const { data, error } = await supabase
    .from('feasibility_scenarios')
    .insert([{
      user_id: user.id,
      ...input,
      recommendations: input.recommendations as any // Cast to any for JSONB compatibility
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Error saving scenario:', error);
    throw error;
  }

  console.log('✅ Scenario saved successfully:', data.id);
  return {
    ...data,
    recommendations: (data.recommendations as any) || []
  } as FeasibilityScenario;
}

/**
 * Load all scenarios for the current user
 */
export async function loadScenarios(): Promise<FeasibilityScenario[]> {
  console.log('📂 Loading feasibility scenarios...');
  
  const { data, error } = await supabase
    .from('feasibility_scenarios')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error loading scenarios:', error);
    throw error;
  }

  console.log(`✅ Loaded ${data.length} scenarios`);
  return data.map(scenario => ({
    ...scenario,
    recommendations: (scenario.recommendations as any) || []
  })) as FeasibilityScenario[];
}

/**
 * Delete a scenario by ID
 */
export async function deleteScenario(id: string) {
  console.log('🗑️ Deleting scenario:', id);
  
  const { error } = await supabase
    .from('feasibility_scenarios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Error deleting scenario:', error);
    throw error;
  }

  console.log('✅ Scenario deleted successfully');
}

/**
 * Update an existing scenario
 */
export async function updateScenario(id: string, updates: Partial<SaveScenarioInput>) {
  console.log('📝 Updating scenario:', id);
  
  const updateData: any = updates.recommendations 
    ? { ...updates, recommendations: updates.recommendations as any }
    : updates;

  const { data, error } = await supabase
    .from('feasibility_scenarios')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating scenario:', error);
    throw error;
  }

  console.log('✅ Scenario updated successfully');
  return {
    ...data,
    recommendations: (data.recommendations as any) || []
  } as FeasibilityScenario;
}

/**
 * Compare two scenarios and return the differences
 */
export interface ScenarioComparison {
  name: string;
  scenario1: FeasibilityScenario;
  scenario2: FeasibilityScenario;
  deltas: {
    staff_count: number | null;
    shift_length: number;
    buffer_percent: number;
    avg_weekly_hours: number | null;
    required_staff: number | null;
    total_breaches: number;
    avg_rolling: number | null;
    compliance_rate: number;
  };
}

export function compareScenarios(
  scenario1: FeasibilityScenario,
  scenario2: FeasibilityScenario
): ScenarioComparison {
  console.log('🔍 Comparing scenarios:', scenario1.name, 'vs', scenario2.name);
  
  const compliance1 = scenario1.total_breaches === 0 ? 100 : ((17 - scenario1.total_breaches) / 17 * 100);
  const compliance2 = scenario2.total_breaches === 0 ? 100 : ((17 - scenario2.total_breaches) / 17 * 100);
  
  return {
    name: `${scenario1.name} vs ${scenario2.name}`,
    scenario1,
    scenario2,
    deltas: {
      staff_count: scenario1.staff_count && scenario2.staff_count 
        ? scenario2.staff_count - scenario1.staff_count 
        : null,
      shift_length: scenario2.shift_length - scenario1.shift_length,
      buffer_percent: scenario2.buffer_percent - scenario1.buffer_percent,
      avg_weekly_hours: scenario1.avg_weekly_hours && scenario2.avg_weekly_hours
        ? scenario2.avg_weekly_hours - scenario1.avg_weekly_hours
        : null,
      required_staff: scenario1.required_staff && scenario2.required_staff
        ? scenario2.required_staff - scenario1.required_staff
        : null,
      total_breaches: scenario2.total_breaches - scenario1.total_breaches,
      avg_rolling: scenario1.avg_rolling && scenario2.avg_rolling
        ? scenario2.avg_rolling - scenario1.avg_rolling
        : null,
      compliance_rate: compliance2 - compliance1
    }
  };
}
