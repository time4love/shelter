"use client";

import { useState, useEffect, useRef } from "react";
import type { RoomRow, PlayerRow, EretzIrAnswerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi, eretzIrAnswers as eretzIrAnswersApi, gameVotes as gameVotesApi } from "@/lib/supabase/typed-mutations";
import { CATEGORIES, CATEGORY_COLORS } from "./constants";
import { computeScoreForCategory } from "./scoring";

export interface EretzIrAsyncResultsProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  roundId?: string;
  readyPlayers: string[];
  supabase: SupabaseClient<Database>;
}

export function EretzIrAsyncResults({
  room,
  players,
  myPlayerInRoom,
  isHost,
  roundId,
  readyPlayers,
  supabase,
}: EretzIrAsyncResultsProps) {
  const [isViewing, setIsViewing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [answers, setAnswers] = useState<EretzIrAnswerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const hasReturnedToSelection = useRef(false);

  useEffect(() => {
    if (!roundId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await eretzIrAnswersApi.fetchByRoomId(supabase, room.id, roundId);
      if (cancelled) return;
      setAnswers((data ?? []) as EretzIrAnswerRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [room.id, roundId, supabase]);

  // Host only: when everyone has marked ready, return to game selection (once)
  useEffect(() => {
    if (
      !isHost ||
      players.length === 0 ||
      readyPlayers.length !== players.length ||
      hasReturnedToSelection.current
    )
      return;
    hasReturnedToSelection.current = true;
    (async () => {
      await gameVotesApi.deleteByRoomId(supabase, room.id);
      await roomsApi.updateToGameSelection(supabase, room.id);
    })();
  }, [isHost, room.id, players.length, readyPlayers.length, supabase]);

  const handleMarkDone = () => {
    setIsDone(true);
    const current = (room.game_state as { readyPlayers?: string[] } | null)?.readyPlayers ?? [];
    const next = Array.from(new Set([...current, myPlayerInRoom.id]));
    void roomsApi.updateGameState(supabase, room.id, {
      phase: "async_results",
      readyPlayers: next,
      roundId,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" dir="rtl" lang="he">
        <p className="text-foreground/80">טוען תוצאות...</p>
      </div>
    );
  }

  // View A: Ready button
  if (!isViewing) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] gap-6 px-6 py-8"
        dir="rtl"
        lang="he"
      >
        <p className="text-center text-xl font-bold text-foreground">
          התוצאות מוכנות! לחץ לצפייה 🏆
        </p>
        <button
          type="button"
          onClick={() => setIsViewing(true)}
          className="rounded-2xl bg-playful-yellow px-8 py-4 text-xl font-bold text-foreground shadow-card active:scale-[0.98] animate-pulse"
        >
          צפה בתוצאות
        </button>
      </div>
    );
  }

  // View C: Waiting for others
  if (isDone) {
    const count = readyPlayers?.length ?? 0;
    const total = players.length;
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-6 py-8"
        dir="rtl"
        lang="he"
      >
        <p className="text-center text-xl font-medium text-foreground">
          ממתין לשאר השחקנים שיסיימו לקרוא... ⏳
        </p>
        <p className="text-center text-2xl font-bold text-foreground">
          ({count}/{total})
        </p>
      </div>
    );
  }

  // View B: Scrollable results
  return (
    <div className="flex flex-col w-full h-full" dir="rtl" lang="he">
      <div className="flex-1 overflow-y-auto w-full pb-24">
        {CATEGORIES.map((category, index) => {
          const catScores = computeScoreForCategory(category, answers);
          const bgColor = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
          return (
            <div
              key={category}
              className={`mb-4 rounded-2xl p-4 shadow-soft ${bgColor}`}
            >
              <h3 className="text-lg font-bold text-foreground mb-3">{category}</h3>
              <ul className="flex flex-col gap-2">
                {players.map((player) => {
                  const row = answers.find((a) => a.player_id === player.id);
                  const word = (row?.answers[category] ?? "").trim() || "—";
                  const pts = catScores.get(player.id) ?? 0;
                  const ptsLabel = pts === 0 ? "0" : pts === 10 ? "+10" : "+5";
                  return (
                    <li
                      key={player.id}
                      className="flex items-center gap-3 rounded-xl bg-white/90 px-3 py-2"
                    >
                      <span className="text-2xl shrink-0" aria-hidden>
                        {player.avatar}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate">{player.name}</p>
                        <p className="text-foreground/80 truncate">{word}</p>
                      </div>
                      <span
                        className={`text-lg font-bold shrink-0 ${
                          pts === 10
                            ? "text-green-600"
                            : pts === 5
                              ? "text-amber-600"
                              : "text-foreground/60"
                        }`}
                      >
                        {ptsLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t shadow-md rounded-t-2xl">
        <button
          type="button"
          onClick={handleMarkDone}
          className="w-full rounded-2xl bg-mint-green py-4 font-bold text-xl text-white shadow-card active:scale-[0.98]"
        >
          סיימתי, אני מוכן למשחק הבא ➡️
        </button>
      </div>
    </div>
  );
}
