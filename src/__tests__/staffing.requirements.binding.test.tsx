import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';
import { allowedTokens, LABEL } from '@/domain/shifts';

// Mock component that mimics the staffing requirements section
function MockStaffingRequirements({ 
  system, 
  allowSupervisorNights = true 
}: { 
  system: '8h' | '12h';
  allowSupervisorNights?: boolean;
}) {
  const form = useForm({
    defaultValues: {
      staffing: Array.from({ length: 7 }, (_, i) => ({ 
        dow: i, 
        need: { D: 0, E: 0, L: 0, N: 0, R: 0, S: 0 } 
      }))
    }
  });

  const tokens = allowedTokens(system);
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      {!allowSupervisorNights && (
        <div data-testid="supervisor-nights-warning">
          Supervisor nights disabled
        </div>
      )}
      
      <div className={`grid gap-2 ${tokens.length === 2 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        <div>Day</div>
        {tokens.map(token => (
          <div key={token}>{LABEL[token]}</div>
        ))}
        
        {DAYS.map((day, idx) => (
          <React.Fragment key={day}>
            <div>{day}</div>
            {tokens.map(token => (
              <input
                key={`${idx}-${token}`}
                type="number"
                min="0"
                data-testid={`need-${idx}-${token}`}
                {...form.register(`staffing.${idx}.need.${token}` as any, { valueAsNumber: true })}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

describe('Staffing Requirements Grid', () => {
  it('renders correct shift tokens for 12h system (Day + Night only)', () => {
    render(<MockStaffingRequirements system="12h" />);

    // Should show Day and Night headers
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Night')).toBeInTheDocument();
    
    // Should NOT show Early or Late for 12h
    expect(screen.queryByText('Early')).not.toBeInTheDocument();
    expect(screen.queryByText('Late')).not.toBeInTheDocument();
  });

  it('renders correct shift tokens for 8h system (Early + Late + Night)', () => {
    render(<MockStaffingRequirements system="8h" />);

    // Should show Early, Late, and Night headers
    expect(screen.getByText('Early')).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
    expect(screen.getByText('Night')).toBeInTheDocument();
    
    // Should NOT show Day for 8h
    expect(screen.queryByText('Day')).not.toBeInTheDocument();
  });

  it('binds Night inputs correctly for 12h system', () => {
    render(<MockStaffingRequirements system="12h" />);

    // Night input for Tuesday (idx=2) should exist and be writable
    const nightTue = screen.getByTestId('need-2-N') as HTMLInputElement;
    expect(nightTue).toBeInTheDocument();
    
    fireEvent.change(nightTue, { target: { value: '3' } });
    expect(nightTue.value).toBe('3');
  });

  it('binds Night inputs correctly for 8h system', () => {
    render(<MockStaffingRequirements system="8h" />);

    // Night input for Friday (idx=5) should exist and be writable
    const nightFri = screen.getByTestId('need-5-N') as HTMLInputElement;
    expect(nightFri).toBeInTheDocument();
    
    fireEvent.change(nightFri, { target: { value: '2' } });
    expect(nightFri.value).toBe('2');
  });

  it('shows warning when supervisor nights disabled but does not disable inputs', () => {
    render(<MockStaffingRequirements system="12h" allowSupervisorNights={false} />);

    // Warning should be visible
    expect(screen.getByTestId('supervisor-nights-warning')).toBeInTheDocument();
    
    // Night inputs should still be enabled
    const nightSun = screen.getByTestId('need-0-N') as HTMLInputElement;
    expect(nightSun).toBeInTheDocument();
    expect(nightSun).not.toBeDisabled();
  });

  it('creates correct test IDs for all days and tokens', () => {
    render(<MockStaffingRequirements system="12h" />);

    // Check that all day/token combinations have correct test IDs
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      expect(screen.getByTestId(`need-${dayIdx}-D`)).toBeInTheDocument();
      expect(screen.getByTestId(`need-${dayIdx}-N`)).toBeInTheDocument();
    }
  });
});