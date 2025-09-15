import { score, ScoreWeights } from "./scoring";
import { ShiftCode, isWorkCode } from "../constraints";

/**
 * Perform hill-climbing with random swaps, capped by time.
 * Allowed moves: swap two staff between the same day different shifts,
 * or reassign within coverage need, preserving constraints (rest/leave/system).
 */
export function optimiseRoster(
  rosterMatrix: Map<string /* dateISO */, Map<string /* shiftCode */, string[] /* staffIds */>>,
  // Additional adapters passed in so this module stays pure:
  canAssign: (staffId: string, dateISO: string, shift: ShiftCode) => boolean,
  applyMove: (move: any) => void,
  revertMove: (move: any) => void,
  computeScoreContext: () => any,
  weights: ScoreWeights,
  timeLimitMs = 5000
) {
  const deadline = Date.now() + timeLimitMs;
  let bestCtx = computeScoreContext();
  let bestScore = score(bestCtx, weights);

  while (Date.now() < deadline) {
    const move = proposeRandomFeasibleMove(rosterMatrix, canAssign);
    if (!move) continue;
    applyMove(move);
    const ctx = computeScoreContext();
    const s = score(ctx, weights);
    if (s <= bestScore) {
      bestScore = s;
      bestCtx = ctx;
    } else {
      revertMove(move);
    }
  }
  return { bestScore, bestCtx };
}

function proposeRandomFeasibleMove(
  rosterMatrix: Map<string, Map<string, string[]>>,
  canAssign: (sid: string, dateISO: string, code: ShiftCode) => boolean
) {
  // Implementation detail: sample a date, two shifts, swap two staff if both feasible post-swap.
  // Keep it simple; Lovable can fill in with the project’s data structures.
  return null;
}
