"use client";

import { useState } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { GameStateTOL } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { useTolStatements } from "@/hooks/useTolStatements";
import { useTolGuessesForAuthor } from "@/hooks/useTolGuessesForAuthor";
import { rooms as roomsApi } from "@/lib/supabase/typed-mutations";
import { seededShuffle } from "@/lib/utils/seededShuffle";

export interface TolRevealViewProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
  gameState: Extract<GameStateTOL, { phase: "revealing_answers" }>;
}

export function TolRevealView({
  room,
  players,
  myPlayerInRoom,
  isHost,
  supabase,
  gameState,
}: TolRevealViewProps) {
  const { currentAuthorId, authorsLeft } = gameState;
  const [loading, setLoading] = useState(false);

  const allStatements = useTolStatements(room.id, true);
  const guesses = useTolGuessesForAuthor(
    room.id,
    currentAuthorId,
    true
  );

  const authorStatements = allStatements.find((s) => s.player_id === currentAuthorId);
  const authorPlayer = players.find((p) => p.id === currentAuthorId);

  const shuffled =
    authorStatements?.statements &&
    Array.isArray(authorStatements.statements) &&
    authorStatements.statements.length === 4
      ? seededShuffle(
          currentAuthorId,
          authorStatements.statements as { text: string; isTruth: boolean }[]
        )
      : [];
  const truthDisplayIndex =
    shuffled.length === 4 ? shuffled.findIndex((s) => s.isTruth) : -1;

  const myGuess = guesses.find((g) => g.guesser_id === myPlayerInRoom.id);
  const myGuessedIndex = myGuess?.guessed_index ?? -1;
  const iGuessedWrong =
    myGuessedIndex >= 0 && truthDisplayIndex >= 0 && myGuessedIndex !== truthDisplayIndex;

  const handleNextPlayer = async () => {
    if (!isHost || loading) return;
    setLoading(true);
    try {
      if (authorsLeft.length === 0) {
        await roomsApi.updateGameState(supabase, room.id, { phase: "round_results" });
      } else {
        const [nextAuthor, ...rest] = authorsLeft;
        await roomsApi.updateGameState(supabase, room.id, {
          phase: "playing",
          currentAuthorId: nextAuthor,
          authorsLeft: rest,
        });
      }
    } catch {
      // show error in UI if needed
    } finally {
      setLoading(false);
    }
  };

  if (!authorStatements || shuffled.length !== 4) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] p-6" dir="rtl" lang="he">
        <p className="text-foreground/80">טוען...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 flex flex-col gap-6" dir="rtl" lang="he">
      <h2 className="text-2xl font-bold text-foreground text-center">
        האמת נחשפה!
      </h2>

      <p className="text-center text-foreground/80 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-2xl" aria-hidden>{authorPlayer?.avatar ?? "👤"}</span>
        <span>המשפטים של {authorPlayer?.name ?? "..."}</span>
      </p>

      <ul className="flex flex-col gap-3">
        {shuffled.map((s, i) => {
          const isTruth = s.isTruth;
          const isMyWrongGuess = iGuessedWrong && myGuessedIndex === i;
          const dimmed = !isTruth && !isMyWrongGuess;

          let bg = "bg-white/90";
          let text = "text-foreground";
          if (isTruth) {
            bg = "bg-green-400";
            text = "text-white";
          } else if (isMyWrongGuess) {
            bg = "bg-red-400";
            text = "text-white";
          } else if (dimmed) {
            bg = "bg-white/50";
            text = "text-foreground/60";
          }

          return (
            <li
              key={i}
              className={`rounded-2xl shadow-soft px-4 py-3 font-medium ${bg} ${text}`}
            >
              {s.text}
            </li>
          );
        })}
      </ul>

      {isHost && (
        <button
          type="button"
          onClick={handleNextPlayer}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-mint-green text-white font-bold text-xl shadow-card hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "טוען..." : "המשך לשחקן הבא"}
        </button>
      )}
    </div>
  );
}
