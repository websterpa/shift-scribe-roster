/**
 * @order
 * Tests for shift ordering comparator by framework
 */
import { describe, it, expect } from 'vitest';
import { makeShiftComparator, collectCodes } from '@/features/roster/monthly/shiftOrder';

describe('Shift Order Comparator (@order)', () => {
  it('8h framework: E → L → N ordering', () => {
    const items = [
      { shift_code: 'N', shift_start: '2025-10-01T22:00:00Z', staff_name: 'Alice' },
      { shift_code: 'E', shift_start: '2025-10-01T06:00:00Z', staff_name: 'Bob' },
      { shift_code: 'L', shift_start: '2025-10-01T14:00:00Z', staff_name: 'Charlie' },
    ];
    const codes = collectCodes(items);
    const cmp = makeShiftComparator(codes);
    
    items.sort(cmp);
    
    expect(items[0].shift_code).toBe('E');
    expect(items[1].shift_code).toBe('L');
    expect(items[2].shift_code).toBe('N');
  });

  it('12h framework: D → N ordering', () => {
    const items = [
      { shift_code: 'N', shift_start: '2025-10-01T22:00:00Z', staff_name: 'Alice' },
      { shift_code: 'D', shift_start: '2025-10-01T06:00:00Z', staff_name: 'Bob' },
    ];
    const codes = collectCodes(items);
    const cmp = makeShiftComparator(codes);
    
    items.sort(cmp);
    
    expect(items[0].shift_code).toBe('D');
    expect(items[1].shift_code).toBe('N');
  });

  it('Mixed framework: E → L → N → D fallback', () => {
    const items = [
      { shift_code: 'D', shift_start: '2025-10-01T06:00:00Z', staff_name: 'Bob' },
      { shift_code: 'E', shift_start: '2025-10-01T06:00:00Z', staff_name: 'Alice' },
      { shift_code: 'N', shift_start: '2025-10-01T22:00:00Z', staff_name: 'Charlie' },
      { shift_code: 'L', shift_start: '2025-10-01T14:00:00Z', staff_name: 'Dave' },
    ];
    const codes = collectCodes(items);
    const cmp = makeShiftComparator(codes);
    
    items.sort(cmp);
    
    expect(items[0].shift_code).toBe('E');
    expect(items[1].shift_code).toBe('L');
    expect(items[2].shift_code).toBe('N');
    expect(items[3].shift_code).toBe('D');
  });

  it('Same code tie-breaker: earlier shift_start first', () => {
    const items = [
      { shift_code: 'E', shift_start: '2025-10-01T08:00:00Z', staff_name: 'Alice' },
      { shift_code: 'E', shift_start: '2025-10-01T06:00:00Z', staff_name: 'Bob' },
    ];
    const codes = collectCodes(items);
    const cmp = makeShiftComparator(codes);
    
    items.sort(cmp);
    
    expect(items[0].shift_start).toBe('2025-10-01T06:00:00Z');
    expect(items[1].shift_start).toBe('2025-10-01T08:00:00Z');
  });

  it('Same code and time tie-breaker: staff_name alphabetically', () => {
    const items = [
      { shift_code: 'E', shift_start: '2025-10-01T06:00:00Z', staff_name: 'Charlie' },
      { shift_code: 'E', shift_start: '2025-10-01T06:00:00Z', staff_name: 'Alice' },
      { shift_code: 'E', shift_start: '2025-10-01T06:00:00Z', staff_name: 'Bob' },
    ];
    const codes = collectCodes(items);
    const cmp = makeShiftComparator(codes);
    
    items.sort(cmp);
    
    expect(items[0].staff_name).toBe('Alice');
    expect(items[1].staff_name).toBe('Bob');
    expect(items[2].staff_name).toBe('Charlie');
  });

  it('Unknown code gets lowest priority', () => {
    const items = [
      { shift_code: 'X', shift_start: '2025-10-01T06:00:00Z', staff_name: 'Unknown' },
      { shift_code: 'E', shift_start: '2025-10-01T06:00:00Z', staff_name: 'Alice' },
      { shift_code: 'N', shift_start: '2025-10-01T22:00:00Z', staff_name: 'Bob' },
    ];
    const codes = collectCodes(items);
    const cmp = makeShiftComparator(codes);
    
    items.sort(cmp);
    
    expect(items[0].shift_code).toBe('E');
    expect(items[1].shift_code).toBe('N');
    expect(items[2].shift_code).toBe('X'); // unknown last
  });
});
