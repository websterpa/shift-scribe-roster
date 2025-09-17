import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import GenerateRosterPanel from "@/components/GenerateRosterPanel";
import { vi } from "vitest";

const saveSpy = vi.fn().mockResolvedValue(true);
const fetchSpy = vi.fn().mockResolvedValue({
  avgStaffRate: 18, 
  avgSupervisorRate: 24, 
  roleMixByShift: {}, 
  budgetWarnThreshold: 500
});

// Mock the toast function
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: mockToast
}));

// Mock the roster generator hook
vi.mock("@/hooks/useRosterGenerator", () => ({
  useRosterGenerator: () => ({
    optimising: false,
    error: null,
    result: null,
    run: vi.fn()
  })
}));

vi.mock("@/services/siteSettings", () => ({
  fetchSiteRateDefaults: () => fetchSpy(),
  saveSiteRateDefaults: (payload: any) => saveSpy(payload)
}));

beforeEach(() => {
  saveSpy.mockClear();
  fetchSpy.mockClear();
  mockToast.mockClear();
});

test("debounced autosave & blur save for budget threshold", async () => {
  vi.useFakeTimers();
  
  render(<GenerateRosterPanel />);

  const input = await screen.findByDisplayValue("500");
  
  // Change value -> should debounce
  fireEvent.change(input, { target: { value: "700" } });
  
  // No immediate call
  expect(saveSpy).not.toHaveBeenCalled();

  // Advance timers past debounce (600ms + buffer)
  act(() => { 
    vi.advanceTimersByTime(650); 
  });
  
  await waitFor(() => {
    expect(saveSpy).toHaveBeenCalled();
  });
  
  const payload1 = saveSpy.mock.calls[0][0];
  expect(payload1.budgetWarnThreshold).toBe(700);
  expect(payload1).not.toHaveProperty('avgStaffRate'); // Should only save threshold

  // Reset spy for next test
  saveSpy.mockClear();

  // Change again and blur immediately -> should save on blur
  fireEvent.change(input, { target: { value: "900" } });
  fireEvent.blur(input);
  
  // blur triggers immediate call
  await waitFor(() => {
    expect(saveSpy).toHaveBeenCalled();
  });
  
  const payload2 = saveSpy.mock.calls[0][0];
  expect(payload2.budgetWarnThreshold).toBe(900);

  vi.useRealTimers();
});

test("shows success toast on successful save", async () => {
  saveSpy.mockResolvedValue(true);
  vi.useFakeTimers();
  
  render(<GenerateRosterPanel />);

  const input = await screen.findByDisplayValue("500");
  
  fireEvent.change(input, { target: { value: "800" } });
  
  act(() => { 
    vi.advanceTimersByTime(650); 
  });
  
  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith({
      title: "Threshold Saved",
      description: "Saved threshold: £800",
      variant: "default"
    });
  });

  vi.useRealTimers();
});

test("shows error toast on failed save", async () => {
  saveSpy.mockResolvedValue(false);
  vi.useFakeTimers();
  
  render(<GenerateRosterPanel />);

  const input = await screen.findByDisplayValue("500");
  
  fireEvent.change(input, { target: { value: "1000" } });
  
  act(() => { 
    vi.advanceTimersByTime(650); 
  });
  
  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith({
      title: "Save Failed",
      description: "Failed to save threshold",
      variant: "destructive"
    });
  });

  vi.useRealTimers();
});

test("shows error toast on save exception", async () => {
  saveSpy.mockRejectedValue(new Error("Network error"));
  vi.useFakeTimers();
  
  render(<GenerateRosterPanel />);

  const input = await screen.findByDisplayValue("500");
  
  fireEvent.change(input, { target: { value: "1200" } });
  
  act(() => { 
    vi.advanceTimersByTime(650); 
  });
  
  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith({
      title: "Save Error",
      description: "Error saving threshold",
      variant: "destructive"
    });
  });

  vi.useRealTimers();
});

test("handles invalid values gracefully", async () => {
  vi.useFakeTimers();
  
  render(<GenerateRosterPanel />);

  const input = await screen.findByDisplayValue("500");
  
  // Test negative value
  fireEvent.change(input, { target: { value: "-100" } });
  
  act(() => { 
    vi.advanceTimersByTime(650); 
  });
  
  await waitFor(() => {
    expect(saveSpy).toHaveBeenCalled();
  });
  
  // Should save as 0 for negative values
  const payload = saveSpy.mock.calls[0][0];
  expect(payload.budgetWarnThreshold).toBe(0);

  vi.useRealTimers();
});

test("debouncing cancels previous calls", async () => {
  vi.useFakeTimers();
  
  render(<GenerateRosterPanel />);

  const input = await screen.findByDisplayValue("500");
  
  // Make multiple rapid changes
  fireEvent.change(input, { target: { value: "600" } });
  act(() => { vi.advanceTimersByTime(300); }); // Partial wait
  
  fireEvent.change(input, { target: { value: "700" } });
  act(() => { vi.advanceTimersByTime(300); }); // Partial wait
  
  fireEvent.change(input, { target: { value: "800" } });
  act(() => { vi.advanceTimersByTime(650); }); // Full wait
  
  await waitFor(() => {
    expect(saveSpy).toHaveBeenCalledTimes(1); // Only called once
  });
  
  // Should save the final value
  const payload = saveSpy.mock.calls[0][0];
  expect(payload.budgetWarnThreshold).toBe(800);

  vi.useRealTimers();
});