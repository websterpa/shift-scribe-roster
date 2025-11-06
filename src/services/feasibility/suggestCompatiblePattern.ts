/**
 * Suggestion helper for zero-staff shift requirements
 * Provides smart alternatives when users enter incompatible staffing levels
 */

export type Suggestion =
  | { kind: 'switch-system'; target: '12h' | '8h'; reason: string; recommendedPatternId?: string }
  | { kind: 'fix-input'; shiftCode: 'E' | 'L' | 'N' | 'D'; setTo: number; reason: string }
  | { kind: 'open-picker'; scope: '12h' | '8h'; reason: string };

export function suggestForZeros(
  system: '8h' | '12h',
  req: { E?: number; L?: number; N?: number; D?: number }
): Suggestion[] {
  console.log('🔍 Generating suggestions for zero-staff requirements:', { system, req });
  
  const suggestions: Suggestion[] = [];

  if (system === '8h') {
    const zeros = (['E', 'L', 'N'] as const).filter(k => (req[k] ?? 0) <= 0);
    
    if (zeros.includes('L') && (req.E ?? 0) > 0 && (req.N ?? 0) > 0) {
      suggestions.push({
        kind: 'switch-system',
        target: '12h',
        reason: 'No Late (L) required; D/N system fits better'
      });
      suggestions.push({
        kind: 'open-picker',
        scope: '12h',
        reason: 'Browse D/N patterns'
      });
      suggestions.push({
        kind: 'fix-input',
        shiftCode: 'L',
        setTo: 1,
        reason: 'Minimum staffing for L to keep E/L/N system'
      });
    }
    
    if (zeros.includes('E') && (req.L ?? 0) > 0 && (req.N ?? 0) > 0) {
      suggestions.push({
        kind: 'switch-system',
        target: '12h',
        reason: 'No Early (E) required; D/N may be more appropriate'
      });
      suggestions.push({
        kind: 'open-picker',
        scope: '12h',
        reason: 'Browse D/N patterns'
      });
      suggestions.push({
        kind: 'fix-input',
        shiftCode: 'E',
        setTo: 1,
        reason: 'Minimum staffing for E to keep E/L/N system'
      });
    }
    
    if (zeros.includes('N') && (req.E ?? 0) > 0 && (req.L ?? 0) > 0) {
      suggestions.push({
        kind: 'fix-input',
        shiftCode: 'N',
        setTo: 1,
        reason: 'E/L/N system requires ≥1 Night (N)'
      });
    }
  } else {
    // 12h system
    const zeros = (['D', 'N'] as const).filter(k => (req[k] ?? 0) <= 0);
    
    if (zeros.length) {
      zeros.forEach(z => {
        suggestions.push({
          kind: 'fix-input',
          shiftCode: z,
          setTo: 1,
          reason: 'D/N system requires both Day and Night ≥1'
        });
      });
      
      suggestions.push({
        kind: 'switch-system',
        target: '8h',
        reason: 'If only one shift needed, consider E/L/N (8h) patterns'
      });
      suggestions.push({
        kind: 'open-picker',
        scope: '8h',
        reason: 'Browse E/L/N patterns'
      });
    }
  }

  console.log(`✅ Generated ${suggestions.length} suggestions:`, suggestions);
  return suggestions;
}
