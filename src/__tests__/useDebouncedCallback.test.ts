import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { useDebouncedCallback } from "@/utils/useDebouncedCallback";

// Mock setTimeout and clearTimeout
vi.useFakeTimers();

afterEach(() => {
  vi.clearAllTimers();
});

afterAll(() => {
  vi.useRealTimers();
});

describe("useDebouncedCallback", () => {
  test("calls function after delay", () => {
    const mockFn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(mockFn, 500));

    act(() => {
      result.current("test");
    });

    // Should not call immediately
    expect(mockFn).not.toHaveBeenCalled();

    // Should call after delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockFn).toHaveBeenCalledWith("test");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("cancels previous call when called again before delay", () => {
    const mockFn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(mockFn, 500));

    act(() => {
      result.current("first");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Call again before first call completes
    act(() => {
      result.current("second");
    });

    // Advance to when first call would have completed
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();

    // Advance to when second call completes
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should only call with the second argument
    expect(mockFn).toHaveBeenCalledWith("second");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("works with async functions", async () => {
    const mockAsyncFn = vi.fn().mockResolvedValue("result");
    const { result } = renderHook(() => useDebouncedCallback(mockAsyncFn, 300));

    act(() => {
      result.current("async-test");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockAsyncFn).toHaveBeenCalledWith("async-test");
  });

  test("uses default delay when not specified", () => {
    const mockFn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(mockFn));

    act(() => {
      result.current("default-delay");
    });

    // Should not call before default delay (600ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mockFn).not.toHaveBeenCalled();

    // Should call after default delay
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockFn).toHaveBeenCalledWith("default-delay");
  });
});