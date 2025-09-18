import { vi, describe, it, expect } from "vitest";
import { listPatterns, savePattern, deletePattern } from "@/services/patterns";

// Mock your supabase client
vi.mock("@/integrations/supabase/client", () => {
  const rows = [{
    id: "p1",
    site_id: "SITE-1",
    created_by: "USER-1",
    name: "4D–4R–4N–4R",
    system: "12h",
    sequence: ["D","D","D","D","R","R","R","R","N","N","N","N","R","R","R","R"],
    repeat_weeks: 17,
    created_at: new Date().toISOString()
  }];

  return {
    supabase: {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "USER-1" } }, error: null }) },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => ({ data: rows, error: null }) }) }),
        insert: () => ({ select: () => ({ single: () => ({ data: { id: "new-id" }, error: null }) }) }),
        delete: () => ({ eq: () => ({ error: null }) })
      })
    }
  };
});

describe("patterns service (Supabase)", () => {
  it("lists patterns by site", async () => {
    const res = await listPatterns("SITE-1");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].system).toBe("12h");
  });

  it("saves a pattern", async () => {
    const res = await savePattern({
      siteId: "SITE-1",
      name: "My Pattern",
      system: "12h",
      sequence: ["D","D","R","R"],
      repeatWeeks: 17
    });
    expect(res.ok).toBe(true);
    expect(res.id).toBeDefined();
  });

  it("deletes a pattern", async () => {
    const ok = await deletePattern("p1");
    expect(ok).toBe(true);
  });
});