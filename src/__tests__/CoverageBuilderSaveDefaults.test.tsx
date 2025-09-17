import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CoverageBuilderModal from "@/components/CoverageBuilderModal";

const saveSpy = jest.fn().mockResolvedValue(true);
const fetchSpy = jest.fn().mockResolvedValue({
  avgStaffRate: 18, avgSupervisorRate: 24, roleMixByShift: { E: 10, L: 10, N: 20, D: 15 }
});

jest.mock("@/services/siteSettings", () => ({
  fetchSiteRateDefaults: () => fetchSpy(),
  saveSiteRateDefaults: (args: any) => saveSpy(args)
}));

test("does not write defaults when toggle is off", async () => {
  render(
    <CoverageBuilderModal
      open={true}
      onClose={()=>{}}
      shiftSystem="8h"
      initialJSON={`{}`}
      onSaveJSON={()=>{}}
      siteId="SITE-1"
    />
  );

  // wait for defaults to load
  await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

  // Click Save without checking the toggle
  fireEvent.click(screen.getByRole("button", { name: /Save to JSON/i }));
  await waitFor(() => expect(saveSpy).not.toHaveBeenCalled());
});

test("writes defaults when toggle is on", async () => {
  render(
    <CoverageBuilderModal
      open={true}
      onClose={()=>{}}
      shiftSystem="8h"
      initialJSON={`{}`}
      onSaveJSON={()=>{}}
      siteId="SITE-1"
    />
  );

  await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

  // Enable the toggle
  const cb = screen.getByLabelText(/Save these rates & mixes as site defaults/i) as HTMLInputElement;
  fireEvent.click(cb);

  // Adjust a rate and a mix to ensure payload differs
  const staffRateInput = screen.getByDisplayValue("18") as HTMLInputElement;
  fireEvent.change(staffRateInput, { target: { value: "19.5" } });

  // Save
  fireEvent.click(screen.getByRole("button", { name: /Save to JSON/i }));

  await waitFor(() => expect(saveSpy).toHaveBeenCalled());
  const payload = saveSpy.mock.calls[0][0];

  expect(payload.siteId).toBe("SITE-1");
  expect(payload.avgStaffRate).toBe(19.5);
  // Should include roleMixByShift with system keys
  expect(Object.keys(payload.roleMixByShift)).toEqual(expect.arrayContaining(["E","L","N"]));
});