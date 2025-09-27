import { buildDemand } from "@/utils/roster/buildDemand";

describe("buildDemand", () => {
  test("8h includes Night", () => {
    const out = buildDemand("8h", { 0: { E: 1, L: 1, N: 1 } });
    expect(out.map(x => x.token)).toEqual(expect.arrayContaining(["N"]));
    expect(out.map(x => x.token)).toEqual(expect.arrayContaining(["E", "L"]));
  });

test("12h includes Day and Night", () => {
    const out = buildDemand("12h", { 0: { D: 2, N: 1 } });
    expect(out.map(x => x.token)).toEqual(expect.arrayContaining(["D", "N"]));
    expect(out.some(x => x.token === "N")).toBe(true);
    expect(out.some(x => x.token === "D")).toBe(true);
  });

  test("12h with zero D still includes N", () => {
    const out = buildDemand("12h", { 0: { D: 0, N: 2 } });
    expect(out.map(x => x.token)).toEqual(["N"]);
    expect(out.filter(x => x.token === "N")).toHaveLength(1);
    expect(out[0].need).toBe(2);
  });

  test("filters out zero demand", () => {
    const out = buildDemand("8h", { 0: { E: 0, L: 2, N: 1 } });
    expect(out.map(x => x.token)).not.toContain("E");
    expect(out.map(x => x.token)).toEqual(expect.arrayContaining(["L", "N"]));
  });

  test("handles multiple days", () => {
    const out = buildDemand("8h", { 
      0: { E: 1, L: 1, N: 1 },
      1: { E: 2, L: 2, N: 1 }
    });
    expect(out.length).toBe(6); // 3 shifts * 2 days
    expect(out.filter(x => x.dayIdx === 0)).toHaveLength(3);
    expect(out.filter(x => x.dayIdx === 1)).toHaveLength(3);
  });
});