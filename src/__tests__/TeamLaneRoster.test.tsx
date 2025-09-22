import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamLaneRoster from "@/components/roster/TeamLaneRoster";

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'roster_assignments') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  date: "2025-09-20",
                  shift_code: "D",
                  staff_id: "s1",
                  shift_start: "2025-09-20T07:00:00Z",
                  shift_end: "2025-09-20T19:00:00Z"
                },
                {
                  date: "2025-09-21", 
                  shift_code: "D",
                  staff_id: "s1",
                  shift_start: "2025-09-21T07:00:00Z",
                  shift_end: "2025-09-21T19:00:00Z"
                }
              ],
              error: null
            })
          })
        };
      } else if (table === 'staff_profiles') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 's1',
                  name: null,
                  first_name: 'Alex',
                  last_name: 'Doe', 
                  role: 'Staff'
                }
              ],
              error: null
            })
          })
        };
      }
      // Default fallback
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      };
    })
  }
}));

test("renders rest-risk legend", async () => {
  render(<TeamLaneRoster versionId="v1" />);
  expect(await screen.findByText(/Rest-risk legend/i)).toBeInTheDocument();
  expect(screen.getByText(/≥13h/)).toBeInTheDocument();
  expect(screen.getByText(/11–13h/)).toBeInTheDocument();
  expect(screen.getByText(/11h/)).toBeInTheDocument();
});

test("renders fairness column header", async () => {
  render(<TeamLaneRoster versionId="v1" />);
  expect(await screen.findByText(/Fairness/i)).toBeInTheDocument();
});

test("displays error state when fetch fails", async () => {
  // Create a new mock that returns an error
  jest.doMock('@/integrations/supabase/client', () => ({
    supabase: {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      })
    }
  }));

  render(<TeamLaneRoster versionId="test" />);
  expect(await screen.findByText(/Error:/)).toBeInTheDocument();
});