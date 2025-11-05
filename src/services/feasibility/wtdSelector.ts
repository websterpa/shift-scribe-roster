/**
 * Unified WTD Status Selector
 * Single source of truth for WTD compliance status in Feasibility Calculator
 */

export interface WtdBreach {
  rule: string;
  dayIndex?: number;
  reason?: string;
}

export interface WtdResult {
  pass: boolean;
  breaches: WtdBreach[];
  summary?: any;
}

export interface WtdStatusOutput {
  isCompliant: boolean;
  breaches: WtdBreach[];
}

/**
 * Convert WTD result from engine to a unified status
 * This is the ONLY function that should be used to determine WTD compliance in UI
 */
export function asWtdStatus(r?: WtdResult): WtdStatusOutput {
  console.log('🔍 asWtdStatus input:', r);
  
  const isCompliant = !!r?.pass && (r?.breaches?.length ?? 0) === 0;
  const breaches = r?.breaches ?? [];
  
  console.log('✅ asWtdStatus output:', { isCompliant, breachCount: breaches.length });
  
  return {
    isCompliant,
    breaches
  };
}
