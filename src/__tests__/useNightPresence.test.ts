import { renderHook, waitFor } from "@testing-library/react";
import { useNightPresence } from "@/hooks/useNightPresence";

// Mock supabase client
jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: jest.fn()
  }
}));

const mockSupabase = require("@/integrations/supabase/client").supabase;

describe("useNightPresence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("detects night presence when N tokens exist", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [
        { token: "D", cnt: 120 },
        { token: "N", cnt: 60 },
        { token: "R", cnt: 40 }
      ],
      error: null
    });

    const { result } = renderHook(() => 
      useNightPresence("test-version-id", { expectNights: true })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasNight).toBe(true);
    expect(result.current.tokenCounts).toEqual({ D: 120, N: 60, R: 40 });
    expect(result.current.nightsRequiredByConfig).toBe(true);
  });

  test("detects missing nights when N count is 0", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [
        { token: "D", cnt: 180 },
        { token: "R", cnt: 60 }
      ],
      error: null
    });

    const { result } = renderHook(() => 
      useNightPresence("test-version-id", { expectNights: true })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasNight).toBe(false);
    expect(result.current.tokenCounts).toEqual({ D: 180, R: 60 });
    expect(result.current.nightsRequiredByConfig).toBe(true);
  });

  test("handles RPC error gracefully", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "RPC failed" }
    });

    const { result } = renderHook(() => 
      useNightPresence("test-version-id")
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("RPC failed");
    expect(result.current.hasNight).toBe(false);
  });
});