/**
 * Canonical shift ordering by framework detection
 * 8h: E → L → N
 * 12h: D → N
 * Mixed: E → L → N → D → R → S
 */

export type Framework = '8h' | '12h' | 'mixed';

const ORDER_8H = ['E', 'L', 'N', 'D', 'R', 'S'] as const;
const ORDER_12H = ['D', 'N', 'E', 'L', 'R', 'S'] as const; // D→N first; others last if present
const ORDER_FALLBACK = ['E', 'L', 'N', 'D', 'R', 'S'] as const;

function detectFrameworkFromCodes(codes: Set<string>): Framework {
  const hasE = codes.has('E'), hasL = codes.has('L'), hasD = codes.has('D'), hasN = codes.has('N');
  if (hasD && !hasE && !hasL) return '12h';
  if (hasE || hasL) return '8h';
  return hasN ? 'mixed' : '8h';
}

export function makeShiftComparator(allCodesInMonth: Set<string>) {
  const fw = detectFrameworkFromCodes(allCodesInMonth);
  const base = fw === '12h' ? ORDER_12H : fw === '8h' ? ORDER_8H : ORDER_FALLBACK;
  const index = new Map<string, number>();
  base.forEach((c, i) => index.set(c, i));
  const getRank = (code: string) => index.has(code) ? index.get(code)! : base.length + 99;

  if (import.meta.env.DEV) {
    console.log('📊 Shift order comparator:', { 
      frameworkDetected: fw, 
      order: Array.from(base),
      codesInMonth: Array.from(allCodesInMonth)
    });
  }

  // comparator: by framework rank, then start time, then staff name
  return (a: { shift_code: string; shift_start: string; staff_name?: string },
          b: { shift_code: string; shift_start: string; staff_name?: string }) => {
    const rA = getRank(a.shift_code), rB = getRank(b.shift_code);
    if (rA !== rB) return rA - rB;
    const tA = a.shift_start ?? ''; 
    const tB = b.shift_start ?? '';
    if (tA !== tB) return tA.localeCompare(tB);
    const nA = (a.staff_name ?? '').toLowerCase();
    const nB = (b.staff_name ?? '').toLowerCase();
    return nA.localeCompare(nB);
  };
}

export function collectCodes(items: Array<{ shift_code: string }>): Set<string> {
  return new Set(items.map(i => i.shift_code));
}
