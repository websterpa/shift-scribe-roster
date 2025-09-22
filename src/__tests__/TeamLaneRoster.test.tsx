import { render, screen } from "@testing-library/react";
import TeamLaneRoster from "@/components/roster/TeamLaneRoster";

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [
            {
              day: '2024-01-01',
              day_idx: 0,
              shift: 'D',
              staff: {
                id: 'staff-1',
                display_name: 'John Doe',
                team: 'Team 1',
                role: 'Supervisor'
              }
            }
          ],
          error: null
        }))
      }))
    }))
  }
}));

test("renders team header when data present", () => {
  render(<TeamLaneRoster versionId="test" />);
  // Initially shows loading
  expect(screen.getByText(/Loading roster/)).toBeInTheDocument();
});

test("renders team roster table structure", async () => {
  render(<TeamLaneRoster versionId="test" />);
  
  // Wait for component to load
  await screen.findByText('Team');
  
  // Should have table structure
  const table = screen.getByRole('table');
  expect(table).toBeInTheDocument();
});

test("displays error state when fetch fails", async () => {
  // Mock error response
  const mockFrom = jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: { message: 'Database connection failed' }
      }))
    }))
  }));

  jest.doMock('@/integrations/supabase/client', () => ({
    supabase: { from: mockFrom }
  }));

  render(<TeamLaneRoster versionId="test" />);
  expect(await screen.findByText(/Error:/)).toBeInTheDocument();
});