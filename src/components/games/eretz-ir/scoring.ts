import type { EretzIrAnswerRow } from "@/types/database";
import { CATEGORIES } from "./constants";

/**
 * For one category: empty word = 0 pts, unique word = 10 pts, duplicate = 5 pts.
 */
export function computeScoreForCategory(
  category: string,
  allAnswers: EretzIrAnswerRow[]
): Map<string, number> {
  const words = allAnswers.map((row) =>
    (row.answers[category] ?? "").trim().toLowerCase()
  );
  const countByWord = new Map<string, number>();
  for (const w of words) {
    if (!w) continue;
    countByWord.set(w, (countByWord.get(w) ?? 0) + 1);
  }
  const scores = new Map<string, number>();
  allAnswers.forEach((row, i) => {
    const w = words[i];
    if (!w) {
      scores.set(row.player_id, 0);
      return;
    }
    const count = countByWord.get(w) ?? 0;
    scores.set(row.player_id, count === 1 ? 10 : 5);
  });
  return scores;
}

/**
 * Total points per player for the whole round (all categories).
 */
export function computeTotalScoresForRound(
  allAnswers: EretzIrAnswerRow[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const cat of CATEGORIES) {
    const catScores = computeScoreForCategory(cat, allAnswers);
    catScores.forEach((pts, playerId) => {
      totals.set(playerId, (totals.get(playerId) ?? 0) + pts);
    });
  }
  return totals;
}
