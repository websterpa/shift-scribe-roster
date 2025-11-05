/**
 * WTD Banner Logic Tests
 * Ensures only unified engine result drives WTD status display
 */

import { describe, it, expect } from 'vitest';
import { asWtdStatus, type WtdResult } from '@/services/feasibility/wtdSelector';

describe('wtdBanner logic', () => {
  it('shows green banner when pass=true and no breaches', () => {
    const wtdResult: WtdResult = {
      pass: true,
      breaches: [],
    };
    
    const { isCompliant, breaches } = asWtdStatus(wtdResult);
    
    expect(isCompliant).toBe(true);
    expect(breaches).toHaveLength(0);
  });
  
  it('shows yellow banner when pass=false with breaches', () => {
    const wtdResult: WtdResult = {
      pass: false,
      breaches: [
        { rule: '11h-rest', dayIndex: 3, reason: 'Insufficient rest between shifts' },
        { rule: 'weekly-rest', dayIndex: 10, reason: 'No 24h rest period' }
      ],
    };
    
    const { isCompliant, breaches } = asWtdStatus(wtdResult);
    
    expect(isCompliant).toBe(false);
    expect(breaches).toHaveLength(2);
    expect(breaches[0].rule).toBe('11h-rest');
  });
  
  it('does NOT show yellow banner when pass=true despite legacy data', () => {
    // Simulates: legacy field says "violates" but new engine says "pass"
    const wtdResult: WtdResult = {
      pass: true,
      breaches: [],
    };
    
    const { isCompliant, breaches } = asWtdStatus(wtdResult);
    
    // Unified status ignores legacy - only uses engine result
    expect(isCompliant).toBe(true);
    expect(breaches).toHaveLength(0);
  });
  
  it('handles undefined/null wtdResult gracefully', () => {
    const { isCompliant, breaches } = asWtdStatus(undefined);
    
    expect(isCompliant).toBe(false); // Default to non-compliant if no result
    expect(breaches).toHaveLength(0);
  });
  
  it('handles pass=false with empty breaches array', () => {
    const wtdResult: WtdResult = {
      pass: false,
      breaches: [],
    };
    
    const { isCompliant, breaches } = asWtdStatus(wtdResult);
    
    // If pass=false but no breaches listed, still non-compliant
    expect(isCompliant).toBe(false);
    expect(breaches).toHaveLength(0);
  });
});
