import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MonthlyScheduleTab from "@/components/MonthlyScheduleTab";

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: () => Promise.resolve({
              data: [
                // DB returns readable names that should normalize to tokens
                { date: "2025-09-20", shift_code: "Night", staff_id: "s1", shift_start: "2025-09-20T19:00:00Z", shift_end: "2025-09-21T07:00:00Z" },
              ],
              error: null
            })
          })
        })
      })
    })
  }
}));

test("displays Night (N) label after normalization", async () => {
  render(<MonthlyScheduleTab versionId="v1" siteTz="Europe/London" />);
  expect(await screen.findByText(/Night \(N\)/)).toBeInTheDocument();
});