import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CoverageBuilderModal from "@/components/CoverageBuilderModal";

// Mock the toast function
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  toast: mockToast
}));

// Mock the site settings service
const mockSaveSiteRateDefaults = jest.fn();
const mockFetchSiteRateDefaults = jest.fn().mockResolvedValue({
  avgStaffRate: 18, 
  avgSupervisorRate: 24, 
  roleMixByShift: { E: 10, L: 10, N: 20 }
});

jest.mock("@/services/siteSettings", () => ({
  fetchSiteRateDefaults: mockFetchSiteRateDefaults,
  saveSiteRateDefaults: mockSaveSiteRateDefaults
}));

beforeEach(() => {
  mockToast.mockClear();
  mockSaveSiteRateDefaults.mockClear();
  mockFetchSiteRateDefaults.mockClear();
});

test("shows success toast when save defaults succeeds", async () => {
  mockSaveSiteRateDefaults.mockResolvedValue(true);
  
  render(
    <CoverageBuilderModal
      open={true}
      onClose={() => {}}
      shiftSystem="8h"
      initialJSON="{}"
      onSaveJSON={() => {}}
      siteId="test-site"
    />
  );

  // Wait for component to load defaults
  await waitFor(() => expect(mockFetchSiteRateDefaults).toHaveBeenCalled());

  // Enable the save defaults toggle
  const checkbox = screen.getByLabelText(/Save these rates & mixes as site defaults/i);
  fireEvent.click(checkbox);

  // Click save
  const saveButton = screen.getByRole("button", { name: /Save to JSON/i });
  fireEvent.click(saveButton);

  // Verify success toast was called
  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith({
      title: "Defaults Saved",
      description: "Staff rates and role mixes have been saved as site defaults.",
      variant: "default"
    });
  });
});

test("shows error toast when save defaults fails", async () => {
  mockSaveSiteRateDefaults.mockResolvedValue(false);
  
  render(
    <CoverageBuilderModal
      open={true}
      onClose={() => {}}
      shiftSystem="8h"
      initialJSON="{}"
      onSaveJSON={() => {}}
      siteId="test-site"
    />
  );

  await waitFor(() => expect(mockFetchSiteRateDefaults).toHaveBeenCalled());

  // Enable the save defaults toggle
  const checkbox = screen.getByLabelText(/Save these rates & mixes as site defaults/i);
  fireEvent.click(checkbox);

  // Click save
  const saveButton = screen.getByRole("button", { name: /Save to JSON/i });
  fireEvent.click(saveButton);

  // Verify error toast was called
  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith({
      title: "Save Failed",
      description: "Unable to save defaults. Please try again.",
      variant: "destructive"
    });
  });
});

test("shows error toast when save defaults throws exception", async () => {
  mockSaveSiteRateDefaults.mockRejectedValue(new Error("Network error"));
  
  render(
    <CoverageBuilderModal
      open={true}
      onClose={() => {}}
      shiftSystem="8h"
      initialJSON="{}"
      onSaveJSON={() => {}}
      siteId="test-site"
    />
  );

  await waitFor(() => expect(mockFetchSiteRateDefaults).toHaveBeenCalled());

  // Enable the save defaults toggle
  const checkbox = screen.getByLabelText(/Save these rates & mixes as site defaults/i);
  fireEvent.click(checkbox);

  // Click save
  const saveButton = screen.getByRole("button", { name: /Save to JSON/i });
  fireEvent.click(saveButton);

  // Verify error toast was called
  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith({
      title: "Save Error",
      description: "An error occurred while saving defaults.",
      variant: "destructive"
    });
  });
});

test("no toast when save defaults toggle is off", async () => {
  render(
    <CoverageBuilderModal
      open={true}
      onClose={() => {}}
      shiftSystem="8h"
      initialJSON="{}"
      onSaveJSON={() => {}}
      siteId="test-site"
    />
  );

  await waitFor(() => expect(mockFetchSiteRateDefaults).toHaveBeenCalled());

  // Don't enable the toggle - leave it off

  // Click save
  const saveButton = screen.getByRole("button", { name: /Save to JSON/i });
  fireEvent.click(saveButton);

  // Verify no toast was called
  await waitFor(() => {
    expect(mockToast).not.toHaveBeenCalled();
  });
});