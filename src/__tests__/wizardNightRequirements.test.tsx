import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { WizardStep2 } from '@/components/NewRosterWizard/WizardStep2';
import { WizardStepProps } from '@/components/NewRosterWizard/types';

const mockStaffList = [
  { 
    id: '1', 
    first_name: 'John', 
    last_name: 'Doe', 
    eligible_shifts: ['Early', 'Late', 'Night'],
    employee_id: 'EMP001',
    email: 'john@example.com',
    hire_date: '2025-01-01',
    is_active: true,
    is_shift_worker: true,
    hourly_rate: 15.50,
    role: 'Staff',
    phone: '',
    unavailable_from: null,
    expected_return_date: null,
    unavailability_reason: null,
    unavailability_notes: null,
    availability_status: 'active' as const,
    min_hours_per_week: 20,
    max_hours_per_week: 48,
    opted_out_wtd: false,
    days_off_per_week: 2,
    holiday_multiplier: 2,
    leave_allowance_days: 28
  }
];

describe('Wizard Night Requirements Save', () => {
  test('8h system saves N requirements correctly', () => {
    const mockSetConfig = vi.fn();
    const initialConfig: WizardStepProps['config'] = {
      shiftType: '8h',
      operationalWindow: '24h',
      template: 'continental',
      cycleLength: 14,
      startDate: '2025-01-01',
      rosterName: 'Test Roster',
      staffingRequirements: {
        day_shift_staff: 2,
        night_shift_staff: 1,
        early_shift_staff: 1,
        late_shift_staff: 1
      }
    };

    render(
      <WizardStep2 
        config={initialConfig}
        setConfig={mockSetConfig}
        staffList={mockStaffList}
      />
    );

    // Check that night shift input exists for 8h system
    const nightInput = screen.getByLabelText('Night Shift Staff');
    expect(nightInput).toBeInTheDocument();
    expect(nightInput).toHaveValue(1);

    // Change the night shift requirement
    fireEvent.change(nightInput, { target: { value: '3' } });

    expect(mockSetConfig).toHaveBeenCalledWith(
      expect.any(Function)
    );

    // Test the function passed to setConfig
    const setConfigCall = mockSetConfig.mock.calls[0][0];
    const updatedConfig = setConfigCall(initialConfig);
    expect(updatedConfig.staffingRequirements.night_shift_staff).toBe(3);
  });

  test('12h system saves N requirements correctly', () => {
    const mockSetConfig = vi.fn();
    const initialConfig: WizardStepProps['config'] = {
      shiftType: '12h',
      operationalWindow: '24h',
      template: 'dupont',
      cycleLength: 14,
      startDate: '2025-01-01',
      rosterName: 'Test Roster 12h',
      staffingRequirements: {
        day_shift_staff: 2,
        night_shift_staff: 2
      }
    };

    render(
      <WizardStep2 
        config={initialConfig}
        setConfig={mockSetConfig}
        staffList={mockStaffList}
      />
    );

    // Check that night shift input exists for 12h system
    const nightInput = screen.getByLabelText('Night Shift Staff');
    expect(nightInput).toBeInTheDocument();
    expect(nightInput).toHaveValue(2);
  });

  test('N inputs are bound to token N not night string keys', () => {
    const mockSetConfig = vi.fn();
    const initialConfig: WizardStepProps['config'] = {
      shiftType: '8h',
      operationalWindow: '24h', 
      template: 'continental',
      cycleLength: 14,
      startDate: '2025-01-01',
      rosterName: 'Test Roster',
      staffingRequirements: {
        day_shift_staff: 2,
        night_shift_staff: 0,
        early_shift_staff: 1,
        late_shift_staff: 1
      }
    };

    render(
      <WizardStep2 
        config={initialConfig}
        setConfig={mockSetConfig}
        staffList={mockStaffList}
      />
    );

    const nightInput = screen.getByLabelText('Night Shift Staff');
    fireEvent.change(nightInput, { target: { value: '2' } });

    // Verify the correct field is updated (night_shift_staff, not some "night" string key)
    expect(mockSetConfig).toHaveBeenCalled();
    const setConfigCall = mockSetConfig.mock.calls[0][0];
    const updatedConfig = setConfigCall(initialConfig);
    expect(updatedConfig.staffingRequirements).toHaveProperty('night_shift_staff', 2);
    expect(updatedConfig.staffingRequirements).not.toHaveProperty('night');
  });
});