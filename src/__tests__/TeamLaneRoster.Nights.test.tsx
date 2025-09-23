import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamLaneRoster from "@/components/roster/TeamLaneRoster";

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => Promise.resolve({
          data: [
            // DB returns readable names
            { date: "2025-09-20", shift_code: "Day", staff_id: "s1", shift_start: "2025-09-20T07:00:00Z", shift_end: "2025-09-20T19:00:00Z", hours: 12 },
            { date: "2025-09-20", shift_code: "Night", staff_id: "s1", shift_start: "2025-09-20T19:00:00Z", shift_end: "2025-09-21T07:00:00Z", hours: 12 },
          ],
          error: null
        })
      })
    })
  }
}));

test("prefers N when Day and Night exist same day (normalized)", async () => {
  render(<TeamLaneRoster versionId="v1" />);
  const nightChips = await screen.findAllByText("N");
  expect(nightChips.length).toBeGreaterThan(0);
});