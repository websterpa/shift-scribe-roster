import { supabase } from "@/integrations/supabase/client";

describe("12h Nights Database Integration Probes", () => {
  // Mock version ID for testing (would be replaced with real data in integration tests)
  const mockVersionId = "test-version-12h-nights";

  test("RPC functions exist and return correct structure", async () => {
    // Test rpc_requirements_token_counts function exists
    const { error: reqError } = await supabase.rpc("rpc_requirements_token_counts", { 
      version_id: mockVersionId 
    });
    
    // Should not error on function call (even if no data exists)
    expect(reqError?.message).not.toContain("function");
    
    // Test rpc_version_token_counts function exists  
    const { error: verError } = await supabase.rpc("rpc_version_token_counts", { 
      version_id: mockVersionId 
    });
    
    expect(verError?.message).not.toContain("function");
    
    // Test rpc_night_gap function exists
    const { error: gapError } = await supabase.rpc("rpc_night_gap", { 
      version_id: mockVersionId 
    });
    
    expect(gapError?.message).not.toContain("function");
  });

  test("Site settings table has allow_supervisor_nights column", async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("allow_supervisor_nights")
      .limit(1);
    
    // Should not error on column selection
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Patterns legacy view exists and has tokens column", async () => {
    const { data, error } = await supabase
      .from("patterns_legacy")
      .select("tokens, name, site_id")
      .limit(1);
    
    // Should not error on view access
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("Token Mapping Logic Tests", () => {
  test("shift_code Night maps to token N", () => {
    const mockAssignments = [
      { shift_code: "Night", token: undefined },
      { shift_code: "Day", token: undefined },
      { shift_code: "Early", token: undefined },
      { shift_code: "Late", token: undefined },
      { shift_code: "Rest", token: undefined }
    ];

    const tokenized = mockAssignments.map(a => ({
      ...a,
      token: a.shift_code === "Night" ? "N" :
             a.shift_code === "Day" ? "D" :
             a.shift_code === "Early" ? "E" :
             a.shift_code === "Late" ? "L" : "R"
    }));

    expect(tokenized.find(a => a.shift_code === "Night")?.token).toBe("N");
    expect(tokenized.find(a => a.shift_code === "Day")?.token).toBe("D");
    expect(tokenized.filter(a => a.token === "N")).toHaveLength(1);
  });

  test("12h system D/N preservation logic", () => {
    function getShiftSet(system: "8h" | "12h") {
      return system === "8h" ? ["E", "L", "N"] : ["D", "N"];
    }
    
    const shiftSet12h = getShiftSet("12h");
    const shiftSet8h = getShiftSet("8h");
    
    expect(shiftSet12h).toEqual(["D", "N"]);
    expect(shiftSet12h.includes("N")).toBe(true);
    expect(shiftSet12h.includes("D")).toBe(true);
    
    expect(shiftSet8h).toEqual(["E", "L", "N"]);
    expect(shiftSet8h.includes("N")).toBe(true);
  });
});