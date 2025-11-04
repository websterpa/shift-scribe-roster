/**
 * WTD 17-Week Rolling Compliance Simulator
 * Calculates week-by-week hours and rolling averages to verify
 * compliance with 48-hour weekly limit over 17-week reference period
 */

export interface WTDSimulationWeek {
  week: number;
  week_hours: number;
  rolling_avg: number;
  compliant: boolean;
}

export interface WTDSimulationSummary {
  totalBreaches: number;
  avgRolling: number;
  maxRolling: number;
  breachWeeks: number[];
}

export interface WTDSimulationInput {
  pattern: { sequence: string[] };
  shift_length: number;
  weeks?: number;
}

export function simulateWTD({ 
  pattern, 
  shift_length, 
  weeks = 17 
}: WTDSimulationInput): WTDSimulationWeek[] {
  console.log('🔬 WTD Simulation started:', { pattern: pattern.sequence, shift_length, weeks });
  
  const sequence = pattern.sequence;
  const cycle_days = sequence.length;
  
  // Calculate daily hours for each shift type
  const daily_hours = sequence.map(shift => 
    (shift === 'R' || shift === 'X') ? 0 : shift_length
  );
  
  const daily_avg = daily_hours.reduce((sum, hours) => sum + hours, 0) / cycle_days;
  
  const results: WTDSimulationWeek[] = [];
  let rolling_sum = 0;
  
  for (let week = 1; week <= weeks; week++) {
    const week_hours = daily_avg * 7;
    rolling_sum += week_hours;
    const rolling_avg = rolling_sum / week;
    
    results.push({
      week,
      week_hours: parseFloat(week_hours.toFixed(1)),
      rolling_avg: parseFloat(rolling_avg.toFixed(1)),
      compliant: rolling_avg <= 48
    });
  }
  
  const totalBreaches = results.filter(w => !w.compliant).length;
  const avgRolling = results.reduce((sum, w) => sum + w.rolling_avg, 0) / results.length;
  const maxRolling = Math.max(...results.map(w => w.rolling_avg));
  const breachWeeks = results.filter(w => !w.compliant).map(w => w.week);
  
  console.log('✅ WTD Simulation complete:', { 
    total_weeks: weeks,
    compliant_weeks: results.filter(w => w.compliant).length,
    totalBreaches,
    avgRolling: avgRolling.toFixed(1)
  });
  
  return results;
}

export function getWTDSimulationSummary(results: WTDSimulationWeek[]): WTDSimulationSummary {
  const totalBreaches = results.filter(w => !w.compliant).length;
  const avgRolling = results.reduce((sum, w) => sum + w.rolling_avg, 0) / results.length;
  const maxRolling = Math.max(...results.map(w => w.rolling_avg));
  const breachWeeks = results.filter(w => !w.compliant).map(w => w.week);
  
  return {
    totalBreaches,
    avgRolling: parseFloat(avgRolling.toFixed(1)),
    maxRolling: parseFloat(maxRolling.toFixed(1)),
    breachWeeks
  };
}
