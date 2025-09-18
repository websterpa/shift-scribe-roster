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

/** Validate a pattern and return normalized sequence with issues */
export function validatePattern(raw: any): {
  sequence: PatternToken[];
  issues: string[];
} {
  const valid = new Set<PatternToken>(["E", "L", "N", "D", "R"]);
  let sequence: PatternToken[] = [];
  const issues: string[] = [];

  // Coerce via normalize
  if (Array.isArray(raw)) {
    sequence = raw.filter((t): t is PatternToken => valid.has(t as PatternToken));
    if (raw.some((t: any) => !valid.has(t))) {
      issues.push("Some tokens are invalid and will be ignored.");
    }
  } else if (raw && typeof raw === "object" && "sequence" in raw) {
    return validatePattern((raw as any).sequence);
  } else if (typeof raw === "string") {
    const arr = Array.from(raw);
    sequence = arr.filter((t): t is PatternToken => valid.has(t as PatternToken));
    if (arr.some((t) => !valid.has(t as PatternToken))) {
      issues.push("Some tokens are invalid and will be ignored.");
    }
  }

  if (sequence.length === 0) {
    issues.push("No pattern defined. Add tokens or choose a preset.");
  }

  return { sequence, issues };
}