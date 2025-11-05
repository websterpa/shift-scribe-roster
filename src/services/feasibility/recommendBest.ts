/**
 * Scenario recommendation engine for feasibility analysis.
 * Selects the best scenario based on WTD compliance, staff efficiency, and deterministic tie-breakers.
 */

export interface ScenarioEval {
  id: string;
  name: string;
  staffCount: number;
  metrics: {
    totalBreaches: number;   // from 17-week simulation
    avgRolling: number;      // rollingAvg over 17 weeks
  };
}

/**
 * Selects the best scenario from candidates using deterministic lexicographic ordering:
 * 1) totalBreaches ascending (fewest breaches wins)
 * 2) rolling compliance preference: compliant (<=48) first, then distance to 48 ascending
 * 3) staff increase vs baseline ascending (prefer reductions, then equal, then small increases)
 * 4) tie-breaker: name alphabetical to keep deterministic output
 */
export function pickBestScenario(
  baseline: ScenarioEval,
  candidates: ScenarioEval[]
): ScenarioEval | null {
  console.log('🎯 Picking best scenario from', candidates.length, 'candidates vs baseline:', baseline.name);

  if (candidates.length === 0) {
    console.log('⚠️ No candidates to evaluate');
    return null;
  }

  const scoreKey = (s: ScenarioEval) => {
    const breaches = s.metrics.totalBreaches;
    const compliantFlag = s.metrics.avgRolling <= 48 ? 0 : 1;
    const distanceFrom48 = Math.abs(s.metrics.avgRolling - 48);
    const staffDelta = s.staffCount - baseline.staffCount;
    
    // Convert staffDelta to ordering: prefer negative (reductions), then zero, then positive
    const staffOrder = staffDelta < 0 ? -1 : staffDelta === 0 ? 0 : 1;

    return [
      breaches,
      compliantFlag,
      distanceFrom48,
      staffOrder,
      staffDelta, // Actual delta for secondary sort within same category
      s.name
    ] as const;
  };

  const ranked = [...candidates].sort((a, b) => {
    const A = scoreKey(a);
    const B = scoreKey(b);
    
    for (let i = 0; i < A.length - 1; i++) { // Skip name for numeric comparison
      if (typeof A[i] === 'number' && typeof B[i] === 'number') {
        if (A[i] < B[i]) return -1;
        if (A[i] > B[i]) return 1;
      }
    }
    
    // Final tie-breaker: name alphabetical
    const nameA = A[A.length - 1];
    const nameB = B[B.length - 1];
    return String(nameA).localeCompare(String(nameB));
  });

  const best = ranked[0];
  
  console.log('✅ Best scenario:', best.name, {
    breaches: best.metrics.totalBreaches,
    avgRolling: best.metrics.avgRolling,
    staffCount: best.staffCount,
    staffDelta: best.staffCount - baseline.staffCount
  });

  return best;
}
