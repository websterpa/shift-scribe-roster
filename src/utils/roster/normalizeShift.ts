// Map DB "readable names" and variants to single-letter tokens used in UI logic
export type Token = "D"|"E"|"L"|"N"|"R"|"S";

const NAME_TO_TOKEN: Record<string, Token> = {
  // exact readable names from DB
  "Day": "D",
  "Early": "E", 
  "Late": "L",
  "Night": "N",
  "Rest": "R",
  "Sick": "S",
  // common abbreviations / variants
  "D": "D", "E": "E", "L": "L", "N": "N", "R": "R", "S": "S",
  "DAY": "D", "EARLY": "E", "LATE": "L", "NIGHT": "N", "REST": "R",
  "LD": "D", "LN": "N", // if these surface from legacy imports
  "Off": "R", "OFF": "R" // common variants for rest days
};

export function normalizeShiftCode(input: string | null | undefined): Token {
  if (!input) return "R";
  const key = String(input).trim();
  return NAME_TO_TOKEN[key] ?? NAME_TO_TOKEN[key.toUpperCase()] ?? "R";
}