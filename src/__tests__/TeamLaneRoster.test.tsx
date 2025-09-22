import React from 'react';
import { render, screen } from '@testing-library/react';
import { TeamLaneRoster } from '@/components/roster/TeamLaneRoster';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [
              {
                date: '2024-01-01',
                shift_code: 'D',
                staff_id: 'staff-1',
                shift_start: '07:00',
                shift_end: '19:00'
              },
              {
                date: '2024-01-02',
                shift_code: 'N',
                staff_id: 'staff-1',
                shift_start: '19:00',
                shift_end: '07:00'
              }
            ],
            error: null
          }))
        }))
      })),
      in: jest.fn(() => ({
        data: [
          {
            id: 'staff-1',
            name: 'John Doe',
            role: 'Supervisor'
          }
        ],
        error: null
      }))
    }))
  }
}));

describe('TeamLaneRoster', () => {
  it('renders team lane roster with shift tokens', async () => {
    render(<TeamLaneRoster versionId="test-version" />);
    
    // Check for loading state initially
    expect(screen.getByText(/Loading.../)).toBeInTheDocument();
    
    // Wait for component to load and display roster
    await screen.findByText('Team Lane Roster');
    
    // Check for diagnostics banner
    expect(screen.getByText(/Roster Diagnostics:/)).toBeInTheDocument();
    
    // Check for legend
    expect(screen.getByText(/Legend:/)).toBeInTheDocument();
    expect(screen.getByText(/D=Day/)).toBeInTheDocument();
    expect(screen.getByText(/N=Night/)).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    // Mock error response
    const mockError = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: null,
            error: { message: 'Database connection failed' }
          }))
        }))
      }))
    }));

    jest.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        from: mockError
      }
    }));

    render(<TeamLaneRoster versionId="test-version" />);
    
    // Should show error message
    expect(screen.getByText(/Team roster error:/)).toBeInTheDocument();
  });
});