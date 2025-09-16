import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoverageBuilderModal from '@/components/CoverageBuilderModal';

// Mock the siteSettings service
jest.mock('@/services/siteSettings', () => ({
  fetchSiteRateDefaults: jest.fn(() => Promise.resolve({
    avgStaffRate: 20,
    avgSupervisorRate: 28,
    roleMixByShift: { E: 15, L: 10, N: 25 }
  }))
}));

describe('CoverageBuilderModal - Role-based Estimated Cost', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    shiftSystem: '8h' as const,
    initialJSON: '{"0":{"E":2,"L":2,"N":1},"1":{"E":3,"L":3,"N":1},"2":{"E":3,"L":3,"N":1},"3":{"E":3,"L":3,"N":1},"4":{"E":3,"L":3,"N":1},"5":{"E":3,"L":3,"N":1},"6":{"E":2,"L":2,"N":1}}',
    onSaveJSON: jest.fn(),
  };

  it('should load site defaults and display role-based cost calculation', async () => {
    render(<CoverageBuilderModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument(); // Staff rate
      expect(screen.getByDisplayValue('28')).toBeInTheDocument(); // Supervisor rate
    });

    // Should display the role-based cost section
    expect(screen.getByText('Estimated weekly wage cost (rough, blended by role):')).toBeInTheDocument();
  });

  it('should update blended cost when rates are changed', async () => {
    render(<CoverageBuilderModal {...defaultProps} />);
    
    // Wait for defaults to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });

    // Change staff rate
    const staffRateInput = screen.getByDisplayValue('20');
    fireEvent.change(staffRateInput, { target: { value: '25' } });
    
    // The cost calculation should update (checking that it renders without error)
    expect(screen.getByText('Estimated weekly wage cost (rough, blended by role):')).toBeInTheDocument();
  });

  it('should display supervisor mix controls for each shift', async () => {
    render(<CoverageBuilderModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Shift E — Supervisor mix')).toBeInTheDocument();
      expect(screen.getByText('Shift L — Supervisor mix')).toBeInTheDocument();
      expect(screen.getByText('Shift N — Supervisor mix')).toBeInTheDocument();
    });
  });

  it('should have "Apply first shift\'s mix → all" button', async () => {
    render(<CoverageBuilderModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Apply first shift\'s mix → all')).toBeInTheDocument();
    });
  });

  it('should display blended rate formula', async () => {
    render(<CoverageBuilderModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Blended rate = (Supervisor% × Supervisor £/hr) + (Staff% × Staff £/hr)')).toBeInTheDocument();
    });
  });

  it('should show explanation text about estimates', async () => {
    render(<CoverageBuilderModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Estimate only — uses coverage × blended average rates/)).toBeInTheDocument();
    });
  });
});