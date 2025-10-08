/**
 * @order
 * Integration test for MonthlyGrid shift ordering
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MonthlyGrid } from '@/features/roster/monthly/MonthlyGrid';
import type { EnrichedAssignment } from '@/features/roster/monthly/types';

describe('MonthlyGrid Shift Order (@order)', () => {
  it('8h framework: displays E → L → N in correct order', () => {
    const assignments: EnrichedAssignment[] = [
      { 
        id: '1', 
        version_id: 'v1', 
        date: '2025-10-15', 
        shift_code: 'N', 
        shift_start: '2025-10-15T22:00:00Z', 
        shift_end: '2025-10-16T06:00:00Z',
        staff_id: 's1',
        staff_name: 'Night Worker',
        hours: 8
      },
      { 
        id: '2', 
        version_id: 'v1', 
        date: '2025-10-15', 
        shift_code: 'E', 
        shift_start: '2025-10-15T06:00:00Z', 
        shift_end: '2025-10-15T14:00:00Z',
        staff_id: 's2',
        staff_name: 'Early Worker',
        hours: 8
      },
      { 
        id: '3', 
        version_id: 'v1', 
        date: '2025-10-15', 
        shift_code: 'L', 
        shift_start: '2025-10-15T14:00:00Z', 
        shift_end: '2025-10-15T22:00:00Z',
        staff_id: 's3',
        staff_name: 'Late Worker',
        hours: 8
      },
    ];

    render(<MonthlyGrid monthISO="2025-10" rows={assignments} />);

    // Find all shift badges for day 15
    const dayButton = screen.getByRole('button', { name: /15/ });
    expect(dayButton).toBeInTheDocument();
    
    // Get all shift codes within this day
    const shiftElements = dayButton.querySelectorAll('[class*="bg-"]');
    const shiftTexts = Array.from(shiftElements).map(el => el.textContent?.trim().split(' ')[0]);
    
    expect(shiftTexts).toEqual(['E', 'L', 'N']);
  });

  it('12h framework: displays D → N in correct order', () => {
    const assignments: EnrichedAssignment[] = [
      { 
        id: '1', 
        version_id: 'v1', 
        date: '2025-10-15', 
        shift_code: 'N', 
        shift_start: '2025-10-15T22:00:00Z', 
        shift_end: '2025-10-16T10:00:00Z',
        staff_id: 's1',
        staff_name: 'Night Worker',
        hours: 12
      },
      { 
        id: '2', 
        version_id: 'v1', 
        date: '2025-10-15', 
        shift_code: 'D', 
        shift_start: '2025-10-15T06:00:00Z', 
        shift_end: '2025-10-15T18:00:00Z',
        staff_id: 's2',
        staff_name: 'Day Worker',
        hours: 12
      },
    ];

    render(<MonthlyGrid monthISO="2025-10" rows={assignments} />);

    const dayButton = screen.getByRole('button', { name: /15/ });
    expect(dayButton).toBeInTheDocument();
    
    const shiftElements = dayButton.querySelectorAll('[class*="bg-"]');
    const shiftTexts = Array.from(shiftElements).map(el => el.textContent?.trim().split(' ')[0]);
    
    expect(shiftTexts).toEqual(['D', 'N']);
  });

  it('Displays assignments sorted by shift_start when same code', () => {
    const assignments: EnrichedAssignment[] = [
      { 
        id: '1', 
        version_id: 'v1', 
        date: '2025-10-15', 
        shift_code: 'E', 
        shift_start: '2025-10-15T08:00:00Z', 
        shift_end: '2025-10-15T16:00:00Z',
        staff_id: 's1',
        staff_name: 'Worker B',
        hours: 8
      },
      { 
        id: '2', 
        version_id: 'v1', 
        date: '2025-10-15', 
        shift_code: 'E', 
        shift_start: '2025-10-15T06:00:00Z', 
        shift_end: '2025-10-15T14:00:00Z',
        staff_id: 's2',
        staff_name: 'Worker A',
        hours: 8
      },
    ];

    render(<MonthlyGrid monthISO="2025-10" rows={assignments} />);

    const dayButton = screen.getByRole('button', { name: /15/ });
    const shiftElements = dayButton.querySelectorAll('[class*="bg-"]');
    const shiftNames = Array.from(shiftElements).map(el => el.textContent?.trim());
    
    // Earlier shift_start (06:00) should come first
    expect(shiftNames[0]).toContain('Worker A');
    expect(shiftNames[1]).toContain('Worker B');
  });
});
