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
                  shift_end: "2025-09-20T19:00:00Z",
                  hours: 12
                },
                {
                  date: "2025-09-20", 
                  shift_code: "N",
                  staff_id: "s1",
                  shift_start: "2025-09-20T19:00:00Z",
                  shift_end: "2025-09-21T07:00:00Z",
                  hours: 12
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

test("prefers Night token when both Day and Night exist for the same day", async () => {
  render(<TeamLaneRoster versionId="v1" />);
  expect(await screen.findAllByText("N")).toBeTruthy();
});

test("normalizes readable shift names to tokens", async () => {
  // Mock with readable DB names
  jest.clearAllMocks();
  jest.doMock('@/integrations/supabase/client', () => ({
    supabase: {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'roster_assignments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    date: "2025-09-20",
                    shift_code: "Day",   // readable name from DB
                    staff_id: "s1",
                    shift_start: "2025-09-20T07:00:00Z",
                    shift_end: "2025-09-20T19:00:00Z",
                    hours: 12
                  },
                  {
                    date: "2025-09-21", 
                    shift_code: "Night", // readable name from DB
                    staff_id: "s1",
                    shift_start: "2025-09-21T19:00:00Z",
                    shift_end: "2025-09-22T07:00:00Z",
                    hours: 12
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
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        };
      })
    }
  }));

  render(<TeamLaneRoster versionId="v1" />);
  expect(await screen.findByText("D")).toBeInTheDocument();
  expect(await screen.findByText("N")).toBeInTheDocument();
});

test("renders rest-risk legend", async () => {
  render(<TeamLaneRoster versionId="v1" />);
  expect(await screen.findByText(/Rest-risk legend/i)).toBeInTheDocument();
  expect(screen.getByText(/≥13h/)).toBeInTheDocument();
  expect(screen.getByText(/11–13h/)).toBeInTheDocument();
  expect(screen.getByText(/<11h/)).toBeInTheDocument();
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