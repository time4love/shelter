"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { RoomRow, PlayerRow, EretzIrAnswerRow } from "@/types/database";
import type { EretzIrAnswersMap } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi, eretzIrAnswers as eretzIrAnswersApi, players as playersApi } from "@/lib/supabase/typed-mutations";
import { CATEGORIES, CATEGORY_COLORS } from "./constants";
import { computeTotalScoresForRound } from "./scoring";

export interface EretzIrWritingPhaseProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  letter: string;
  roundId?: string;
  supabase: SupabaseClient<Database>;
}

const INITIAL_ANSWERS: EretzIrAnswersMap = Object.fromEntries(
  CATEGORIES.map((c) => [c, ""])
);

function getPlayerName(players: PlayerRow[], playerId: string): string {
  return players.find((p) => p.id === playerId)?.name ?? "שחקן";
}

export function EretzIrWritingPhase({
  room,
  players,
  myPlayerInRoom,
  isHost,
  letter,
  roundId,
  supabase,
}: EretzIrWritingPhaseProps) {
  const [answers, setAnswers] = useState<EretzIrAnswersMap>(() => ({ ...INITIAL_ANSWERS }));
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedPlayerIds, setSubmittedPlayerIds] = useState<string[]>([]);
  const hasAutoAdvanced = useRef(false);

  const category = CATEGORIES[currentCardIndex];
  const bgColor = CATEGORY_COLORS[currentCardIndex];
  const isLastCard = currentCardIndex === CATEGORIES.length - 1;

  const setAnswer = useCallback((cat: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [cat]: value }));
  }, []);

  // Fetch and subscribe to who has submitted for this round
  useEffect(() => {
    if (!roundId) return;
    const syncSubmitted = async () => {
      const { data } = await eretzIrAnswersApi.fetchByRoomId(supabase, room.id, roundId);
      const rows = (data ?? []) as EretzIrAnswerRow[];
      const ids = rows.map((row) => row.player_id);
      setSubmittedPlayerIds(ids);
    };
    void syncSubmitted();
    const channel = supabase
      .channel(`eretz_ir_answers:${room.id}:${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "eretz_ir_answers",
          filter: `room_id=eq.${room.id}`,
        },
        () => {
          void syncSubmitted();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, roundId, supabase]);

  // Host only: when all submitted → score round, bulk update players, then async_results
  useEffect(() => {
    if (
      !roundId ||
      !isHost ||
      players.length === 0 ||
      submittedPlayerIds.length !== players.length ||
      hasAutoAdvanced.current
    )
      return;
    const allSubmitted = players.every((p) => submittedPlayerIds.includes(p.id));
    if (!allSubmitted) return;
    hasAutoAdvanced.current = true;
    (async () => {
      try {
        const { data } = await eretzIrAnswersApi.fetchByRoomId(supabase, room.id, roundId);
        const rows = (data ?? []) as EretzIrAnswerRow[];
        const roundScores = computeTotalScoresForRound(rows);
        for (const p of players) {
          const add = roundScores.get(p.id) ?? 0;
          const newScore = (p.score ?? 0) + add;
          await playersApi.update(supabase, p.id, { score: newScore });
        }
        await roomsApi.updateGameState(supabase, room.id, {
          phase: "async_results",
          readyPlayers: [],
          roundId,
        });
      } catch {
        hasAutoAdvanced.current = false;
      }
    })();
  }, [room.id, roundId, isHost, players, submittedPlayerIds, supabase]);

  const handleSubmit = async () => {
    if (!roundId) return;
    setSubmitError(null);
    try {
      const { error } = await eretzIrAnswersApi.upsert(supabase, {
        room_id: room.id,
        player_id: myPlayerInRoom.id,
        round_id: roundId,
        answers,
      });
      if (error) throw error;
      setIsWaiting(true);
      setSubmittedPlayerIds((prev) =>
        prev.includes(myPlayerInRoom.id) ? prev : [...prev, myPlayerInRoom.id]
      );
    } catch {
      setSubmitError("אופס, משהו השתבש. נסה שוב!");
    }
  };

  if (isWaiting) {
    const allDone = players.length > 0 && submittedPlayerIds.length >= players.length;
    return (
      <div
        className="w-full flex flex-col items-center justify-center gap-4 px-6 py-8"
        dir="rtl"
        lang="he"
      >
        <p className="text-xl font-medium text-foreground">
          {allDone ? "כולם סיימו! מעבר לתוצאות..." : "ממתין לשאר..."}
        </p>
        <div className="w-full max-w-xs rounded-2xl bg-white/80 shadow-soft px-4 py-3">
          <p className="mb-2 text-sm font-bold text-foreground/80">סיימו את התשובות:</p>
          <ul className="flex flex-col gap-1" aria-label="שחקנים שסיימו">
            {submittedPlayerIds.length === 0 ? (
              <li className="text-foreground/70">עדיין אף אחד</li>
            ) : (
              submittedPlayerIds.map((playerId) => (
                <li key={playerId} className="flex items-center gap-2 text-foreground">
                  <span className="h-2 w-2 rounded-full bg-mint-green" aria-hidden />
                  {getPlayerName(players, playerId)}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col gap-4"
      dir="rtl"
      lang="he"
    >
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-3 rounded-2xl">
        <h2 className="text-xl font-bold text-foreground">
          האות: {letter}
        </h2>
      </div>

      {/* Card container */}
      <div className="flex items-center justify-center p-4">
        <div
          className={`w-full max-w-sm aspect-square flex flex-col items-center justify-center p-6 rounded-2xl shadow-card ${bgColor}`}
        >
          <h3 className="mb-3 text-center text-2xl font-bold text-foreground shrink-0">
            {category}
          </h3>
          <input
            type="text"
            value={answers[category] ?? ""}
            onChange={(e) => setAnswer(category, e.target.value)}
            className="w-full min-h-0 max-h-[40vh] rounded-xl border-2 border-foreground/20 bg-white/90 px-4 py-3 text-lg text-foreground placeholder:text-foreground/50"
            placeholder={`כתוב ${category} שמתחיל/ה ב־${letter}...`}
            dir="rtl"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="bg-white border-t rounded-2xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCurrentCardIndex((i) => Math.max(0, i - 1))}
            disabled={currentCardIndex === 0}
            className="flex-1 rounded-xl bg-white/90 py-3 font-bold text-foreground shadow-soft disabled:opacity-50 active:scale-[0.98]"
          >
            הקודם ←
          </button>
          {isLastCard ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-mint-green py-3 font-bold text-white shadow-card active:scale-[0.98]"
            >
              סיימתי! שלח תשובות
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentCardIndex((i) => i + 1)}
              className="flex-1 rounded-xl bg-playful-yellow py-3 font-bold text-foreground shadow-card active:scale-[0.98]"
            >
              הבא →
            </button>
          )}
        </div>
        {submitError && (
          <p className="mt-2 text-center text-soft-pink font-medium text-sm" role="alert">
            {submitError}
          </p>
        )}
        <div className="mt-3 flex gap-1">
          {CATEGORIES.map((cat, index) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCurrentCardIndex(index)}
              className={`h-2 flex-1 rounded-full mx-0.5 ${
                (answers[cat] ?? "").trim() ? "bg-green-400" : "bg-red-400"
              }`}
              title={cat}
              aria-label={`קטגוריה ${cat}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
