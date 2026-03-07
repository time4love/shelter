"use client";

import { useState, useEffect, useRef } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { GameStateTOL } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { useTolStatements } from "@/hooks/useTolStatements";
import { useTolGuessesForAuthor } from "@/hooks/useTolGuessesForAuthor";
import { rooms as roomsApi, players as playersApi, tolGuesses as tolGuessesApi } from "@/lib/supabase/typed-mutations";
import { seededShuffle } from "@/lib/utils/seededShuffle";

export interface TolPlayingPhaseProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
  gameState: Extract<GameStateTOL, { phase: "playing" }>;
}

export function TolPlayingPhase({
  room,
  players,
  myPlayerInRoom,
  isHost,
  supabase,
  gameState,
}: TolPlayingPhaseProps) {
  const { roundId, currentAuthorId, authorsLeft } = gameState;
  const allStatements = useTolStatements(room.id, roundId, true);
  const guesses = useTolGuessesForAuthor(
    room.id,
    roundId,
    currentAuthorId,
    gameState.phase === "playing"
  );
  const [guessedIndex, setGuessedIndex] = useState<number | null>(null);
  const hasTriggeredReveal = useRef(false);

  const authorStatements = allStatements.find((s) => s.player_id === currentAuthorId);
  const authorPlayer = players.find((p) => p.id === currentAuthorId);
  const isAuthor = myPlayerInRoom.id === currentAuthorId;
  const myGuess = guesses.find((g) => g.guesser_id === myPlayerInRoom.id);
  const hasGuessed = myGuess != null;
  const othersCount = players.length - 1;
  const allGuessed = guesses.length >= othersCount;

  const shuffled =
    authorStatements?.statements &&
    Array.isArray(authorStatements.statements) &&
    authorStatements.statements.length === 4
      ? seededShuffle(currentAuthorId, authorStatements.statements as { text: string; isTruth: boolean }[])
      : [];
  const truthDisplayIndex =
    shuffled.length === 4
      ? shuffled.findIndex((s) => s.isTruth)
      : -1;

  const handleGuess = async (displayIndex: number) => {
    if (hasGuessed || isAuthor) return;
    setGuessedIndex(displayIndex);
    await tolGuessesApi.insert(supabase, {
      room_id: room.id,
      round_id: roundId,
      author_id: currentAuthorId,
      guesser_id: myPlayerInRoom.id,
      guessed_index: displayIndex,
    });
  };

  // Auto-transition to revealing_answers when everyone (except author) has guessed. Host only.
  useEffect(() => {
    if (!isHost || !allGuessed || truthDisplayIndex < 0 || hasTriggeredReveal.current) return;
    hasTriggeredReveal.current = true;

    const run = async () => {
      const scoreDeltas: Record<string, number> = {};
      players.forEach((p) => {
        scoreDeltas[p.id] = p.score;
      });
      guesses.forEach((g) => {
        if (g.guessed_index === truthDisplayIndex) {
          scoreDeltas[g.guesser_id] = (scoreDeltas[g.guesser_id] ?? 0) + 1;
        } else {
          scoreDeltas[currentAuthorId] = (scoreDeltas[currentAuthorId] ?? 0) + 1;
        }
      });
      await Promise.all(
        players.map((p) => {
          const newScore = scoreDeltas[p.id] ?? p.score;
          if (newScore === p.score) return Promise.resolve();
          return playersApi.update(supabase, p.id, { score: newScore });
        })
      );
      await roomsApi.updateGameState(supabase, room.id, {
        phase: "revealing_answers",
        roundId,
        currentAuthorId,
        authorsLeft,
      });
    };
    run();
  }, [isHost, allGuessed, truthDisplayIndex, roundId, currentAuthorId, authorsLeft, room.id, players, guesses, supabase]);

  // Reset trigger ref when author changes so next round can auto-reveal
  useEffect(() => {
    hasTriggeredReveal.current = false;
  }, [currentAuthorId]);

  if (!authorStatements || shuffled.length !== 4) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] p-6" dir="rtl" lang="he">
        <p className="text-foreground/80">טוען משפטים...</p>
      </div>
    );
  }

  if (isAuthor) {
    return (
      <div className="max-w-md mx-auto p-6 flex flex-col gap-6" dir="rtl" lang="he">
        <h2 className="text-2xl font-bold text-foreground text-center">
          אילו המשפטים שלך, חכה שכולם ינחשו!
        </h2>
        <ul className="flex flex-col gap-3">
          {shuffled.map((s, i) => (
            <li
              key={i}
              className="rounded-2xl bg-white/90 shadow-soft px-4 py-3 text-foreground"
            >
              {s.text}
            </li>
          ))}
        </ul>
        {allGuessed && (
          <p className="text-center text-foreground/80">כולם ניחשו! התוצאות יוצגו בקרוב...</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 flex flex-col gap-6" dir="rtl" lang="he">
      <h2 className="text-2xl font-bold text-foreground text-center">
        איזה משפט אמת? (המשפטים של{" "}
        <span className="inline-flex items-center gap-2">
          <span className="text-3xl" aria-hidden>
            {authorPlayer?.avatar ?? "👤"}
          </span>
          <span>{authorPlayer?.name ?? "..."}</span>
        </span>
        )
      </h2>
      {hasGuessed || guessedIndex !== null ? (
        <p className="text-center text-foreground/80">המתן לתוצאות...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {shuffled.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleGuess(i)}
              className="w-full rounded-2xl bg-white/90 shadow-soft px-4 py-4 text-foreground text-right font-medium hover:bg-playful-yellow/30 active:scale-[0.98] transition"
            >
              {s.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
