import React from 'react';
import { render, screen } from '@testing-library/react';
import { CoverageStrip } from '@/components/roster/CoverageStrip';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(() => Promise.resolve({
      data: [
        {
          day: 'Mon',
          shifts: {
            'D': { need: 3, planned: 3, variance: 0 },
            'N': { need: 2, planned: 1, variance: -1 }
          }
        },
        {
          day: 'Tue', 
          shifts: {
            'D': { need: 3, planned: 4, variance: 1 },
            'N': { need: 2, planned: 2, variance: 0 }
          }
        }
      ],
      error: null
    }))
  }
}));

describe('CoverageStrip', () => {
  it('renders coverage strip with variance pills', async () => {
    render(<CoverageStrip versionId="test-version" />);
    
    // Wait for component to load
    await screen.findByText('Coverage Overview');
    
    // Check for day labels
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    
    // Check for shift codes
    expect(screen.getAllByText('D')).toHaveLength(2);
    expect(screen.getAllByText('N')).toHaveLength(2);
    
    // Check for planned/need ratios
    expect(screen.getByText('3/3')).toBeInTheDocument(); // Mon D - exact match
    expect(screen.getByText('1/2')).toBeInTheDocument(); // Mon N - deficit
    expect(screen.getByText('4/3')).toBeInTheDocument(); // Tue D - overstaffed
    expect(screen.getByText('2/2')).toBeInTheDocument(); // Tue N - exact match
  });

  it('shows loading state initially', () => {
    render(<CoverageStrip versionId="test-version" />);
    
    // Check for loading animation
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays error state when RPC fails', async () => {
    // Mock RPC error
    jest.mocked(require('@/integrations/supabase/client').supabase.rpc)
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC function not found' }
      });

    render(<CoverageStrip versionId="test-version" />);
    
    // Wait for error to appear
    await screen.findByText(/Coverage error:/);
    expect(screen.getByText(/RPC function not found/)).toBeInTheDocument();
  });
});