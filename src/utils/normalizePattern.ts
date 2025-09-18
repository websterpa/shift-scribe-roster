export type PatternToken = "E" | "L" | "N" | "D" | "R";

type PatternLike =
  | PatternToken[]
  | string
  | { sequence?: PatternToken[] | string }
  | { [key: string]: any }
  | null
  | undefined;

/** Coerce any pattern-like into a token array. Unknown tokens are dropped. */
export function normalizePatternSequence(input: PatternLike): PatternToken[] {
  const valid = new Set<PatternToken>(["E", "L", "N", "D", "R"]);

  // array?
  if (Array.isArray(input)) {
    return input.filter((t): t is PatternToken => valid.has(t as PatternToken));
  }

  // object with sequence?
  if (input && typeof input === "object" && "sequence" in input) {
    const seq = (input as any).sequence;
    if (Array.isArray(seq)) {
      return seq.filter((t: any): t is PatternToken => valid.has(t));
    }
    if (typeof seq === "string") {
      return Array.from(seq).filter((t): t is PatternToken => valid.has(t as PatternToken));
    }
  }

  // string like "DDNNRRRR"
  if (typeof input === "string") {
    return Array.from(input).filter((t): t is PatternToken => valid.has(t as PatternToken));
  }

  // fallback
  return [];
}