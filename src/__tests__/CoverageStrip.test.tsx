import { render, screen } from "@testing-library/react";
import CoverageStrip from "@/components/roster/CoverageStrip";

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(() => Promise.resolve({
      data: [
        {
          day: 'Mon',
          shifts: {
            'D': { need: 3, planned: 3 },
            'N': { need: 2, planned: 1 }
          }
        },
        {
          day: 'Tue', 
          shifts: {
            'D': { need: 3, planned: 4 },
            'N': { need: 2, planned: 2 }
          }
        }
      ],
      error: null
    }))
  }
}));

test("renders coverage table headers", () => {
  render(<CoverageStrip versionId="test" />);
  expect(screen.getByText(/Day/)).toBeInTheDocument();
  expect(screen.getByText(/Shifts/)).toBeInTheDocument();
});

test("shows loading state initially", () => {
  render(<CoverageStrip versionId="test" />);
  expect(screen.getByText(/Loading coverage/)).toBeInTheDocument();
});

test("displays error state when RPC fails", async () => {
  // Override mock for this test
  const mockRpc = jest.fn(() => Promise.resolve({
    data: null,
    error: { message: 'RPC function not found' }
  }));
  
  jest.doMock('@/integrations/supabase/client', () => ({
    supabase: { rpc: mockRpc }
  }));

  render(<CoverageStrip versionId="test" />);
  expect(await screen.findByText(/Error:/)).toBeInTheDocument();
});