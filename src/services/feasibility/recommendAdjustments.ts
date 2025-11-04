/**
 * WTD Compliance Recommendation Engine
 * Analyzes breach patterns and suggests corrective actions
 */

export interface AdjustmentRecommendation {
  action: string;
  description: string;
  type: 'shift_reduction' | 'staff_increase' | 'pattern_change';
  priority: 'high' | 'medium' | 'low';
}

export interface PatternInfo {
  id: string;
  name: string;
  sequence?: any;
  avg_weekly_hours?: number;
}

export function recommendAdjustments(
  pattern: PatternInfo,
  breaches: number,
  avgRolling: number,
  maxRolling: number
): AdjustmentRecommendation[] {
  console.log('🔍 Generating WTD recommendations:', { pattern: pattern.name, breaches, avgRolling, maxRolling });
  
  const recommendations: AdjustmentRecommendation[] = [];

  // Critical: Shift length reduction needed
  if (avgRolling > 52) {
    recommendations.push({
      action: 'Reduce shift length by 1 hour',
      description: `Average rolling hours (${avgRolling.toFixed(1)}h) significantly exceeds 48h limit`,
      type: 'shift_reduction',
      priority: 'high'
    });
  } else if (avgRolling > 48) {
    recommendations.push({
      action: 'Reduce shift length by 0.5 hours',
      description: `Average rolling hours (${avgRolling.toFixed(1)}h) slightly exceeds 48h limit`,
      type: 'shift_reduction',
      priority: 'high'
    });
  }

  // Moderate: Staffing increase needed
  if (breaches > 8) {
    recommendations.push({
      action: 'Increase staff count by 2',
      description: `${breaches} weeks exceed limit - significant staffing deficit`,
      type: 'staff_increase',
      priority: 'high'
    });
  } else if (breaches > 4) {
    recommendations.push({
      action: 'Increase staff count by 1',
      description: `${breaches} weeks exceed limit - moderate staffing deficit`,
      type: 'staff_increase',
      priority: 'medium'
    });
  }

  // Pattern-specific recommendations
  const patternName = pattern.name.toLowerCase();
  
  if (patternName.includes('6-2') || patternName.includes('7-2')) {
    recommendations.push({
      action: 'Switch to a 4-On 4-Off pattern',
      description: 'Current pattern has limited recovery days - 4-On 4-Off provides better rest compliance',
      type: 'pattern_change',
      priority: 'medium'
    });
  } else if (patternName.includes('12-hour') && avgRolling > 48) {
    recommendations.push({
      action: 'Switch to an 8-hour shift pattern',
      description: '12-hour shifts with current staffing exceed WTD limits',
      type: 'pattern_change',
      priority: 'high'
    });
  }

  // If max rolling is very high but average is OK
  if (maxRolling > 52 && avgRolling <= 48) {
    recommendations.push({
      action: 'Review pattern for week-to-week variability',
      description: `Peak hours (${maxRolling.toFixed(1)}h) suggest uneven distribution`,
      type: 'pattern_change',
      priority: 'low'
    });
  }

  console.log(`✅ Generated ${recommendations.length} recommendations`);
  return recommendations;
}
