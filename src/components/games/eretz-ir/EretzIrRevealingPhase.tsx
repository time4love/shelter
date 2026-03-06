"use client";

import { useState, useEffect } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { EretzIrAnswerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi, eretzIrAnswers as eretzIrAnswersApi, players as playersApi } from "@/lib/supabase/typed-mutations";
import { CATEGORIES } from "./constants";

export interface EretzIrRevealingPhaseProps {
  room: RoomRow;
  players: PlayerRow[];
  isHost: boolean;
  currentCategoryIndex: number;
  roundId?: string;
  supabase: SupabaseClient<Database>;
}

function computeScoreForCategory(
  category: string,
  allAnswers: EretzIrAnswerRow[]
): Map<string, number> {
  const words = allAnswers.map((row) => (row.answers[category] ?? "").trim().toLowerCase());
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

export function EretzIrRevealingPhase({
  room,
  players,
  isHost,
  currentCategoryIndex,
  roundId,
  supabase,
}: EretzIrRevealingPhaseProps) {
  const [answers, setAnswers] = useState<EretzIrAnswerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roundId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await eretzIrAnswersApi.fetchByRoomId(supabase, room.id, roundId);
      if (cancelled) return;
      if (err) {
        setError("אופס, משהו השתבש.");
        setLoading(false);
        return;
      }
      setAnswers(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase, room.id, roundId]);

  const category = CATEGORIES[currentCategoryIndex];
  const isLastCategory = currentCategoryIndex === CATEGORIES.length - 1;
  const categoryScores = answers.length
    ? computeScoreForCategory(category, answers)
    : new Map<string, number>();

  const handleNextCategory = async () => {
    if (!isHost) return;
    if (isLastCategory) {
      await handleEndGame();
      return;
    }
    await roomsApi.updateGameState(supabase, room.id, {
      phase: "revealing",
      currentCategoryIndex: currentCategoryIndex + 1,
      roundId,
    });
  };

  const handleEndGame = async () => {
    if (!isHost) return;
    setError(null);
    setEnding(true);
    try {
      const totals = new Map<string, number>();
      players.forEach((p) => totals.set(p.id, p.score));
      CATEGORIES.forEach((cat) => {
        const scores = computeScoreForCategory(cat, answers);
        scores.forEach((pts, playerId) => {
          totals.set(playerId, (totals.get(playerId) ?? 0) + pts);
        });
      });
      for (const p of players) {
        const newScore = totals.get(p.id) ?? p.score;
        const { error: err } = await playersApi.update(supabase, p.id, { score: newScore });
        if (err) throw err;
      }
      await roomsApi.updateGameState(supabase, room.id, { phase: "round_results", roundId });
    } catch {
      setError("אופס, משהו השתבש. נסה שוב!");
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6" dir="rtl" lang="he">
        <p className="text-foreground/80">טוען תוצאות...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full" dir="rtl" lang="he">
      <div className="p-4">
        <h2 className="text-center text-xl font-bold text-foreground">
          תוצאות הקטגוריה: {category}
        </h2>

        {error && (
          <p className="text-center text-soft-pink font-medium mt-2" role="alert">
            {error}
          </p>
        )}

        <ul className="flex flex-col gap-3 mt-4">
          {players.map((player) => {
            const row = answers.find((a) => a.player_id === player.id);
            const word = (row?.answers[category] ?? "").trim() || "לא כתב/ה";
            const pts = categoryScores.get(player.id) ?? 0;
            const ptsLabel = pts === 0 ? "+0" : pts === 10 ? "+10" : "+5";
            return (
              <li
                key={player.id}
                className="flex items-center gap-4 rounded-2xl bg-white/90 px-4 py-3 shadow-soft"
              >
                <span className="text-2xl" aria-hidden>
                  {player.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">{player.name}</p>
                  <p className="text-foreground/80 truncate">{word}</p>
                </div>
                <span
                  className={`text-lg font-bold ${
                    pts === 10 ? "text-green-600" : pts === 5 ? "text-amber-600" : "text-foreground/60"
                  }`}
                >
                  {ptsLabel}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {isHost && (
        <div className="bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t shadow-md rounded-t-2xl">
          <button
            type="button"
            onClick={handleNextCategory}
            disabled={ending}
            className="w-full rounded-2xl bg-mint-green py-4 font-bold text-xl text-white shadow-card active:scale-[0.98] disabled:opacity-60"
          >
            {ending
              ? "מעדכן..."
              : isLastCategory
                ? "סיום משחק ועדכון ניקוד"
                : "הקטגוריה הבאה"}
          </button>
        </div>
      )}
    </div>
  );
}
