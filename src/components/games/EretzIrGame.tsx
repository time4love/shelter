"use client";

import { useEffect } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { GameStateEretzIr } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi } from "@/lib/supabase/typed-mutations";
import { EretzIrRollingPhase } from "@/components/games/eretz-ir/EretzIrRollingPhase";
import { EretzIrWritingPhase } from "@/components/games/eretz-ir/EretzIrWritingPhase";
import { EretzIrRevealingPhase } from "@/components/games/eretz-ir/EretzIrRevealingPhase";
import { EretzIrRoundResults } from "@/components/games/eretz-ir/EretzIrRoundResults";

export interface EretzIrGameProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

function parseGameState(room: RoomRow): GameStateEretzIr | null {
  const g = room.game_state;
  if (g == null || typeof g !== "object") return null;
  const o = g as Record<string, unknown>;
  if (o.phase === "rolling") return { phase: "rolling" };
  if (o.phase === "writing" && typeof o.letter === "string") {
    return { phase: "writing", letter: o.letter };
  }
  if (o.phase === "revealing" && typeof o.currentCategoryIndex === "number") {
    return { phase: "revealing", currentCategoryIndex: o.currentCategoryIndex };
  }
  if (o.phase === "round_results") return { phase: "round_results" };
  return null;
}

export function EretzIrGame({
  room,
  players,
  myPlayerInRoom,
  isHost,
  supabase,
}: EretzIrGameProps) {
  const gameState = parseGameState(room);

  useEffect(() => {
    if (!isHost || gameState !== null) return;
    roomsApi.updateGameState(supabase, room.id, { phase: "rolling" });
  }, [isHost, room.id, supabase, gameState]);

  const state = gameState ?? { phase: "rolling" as const };

  return (
    <div
      className="flex flex-col w-full bg-gradient-to-b from-soft-pink/20 via-background to-sky-blue/20"
      dir="rtl"
      lang="he"
    >
      <div className="p-4">
        <h1 className="mb-2 px-4 text-center text-2xl font-bold text-foreground">
          ארץ עיר 🌍
        </h1>

        {state.phase === "rolling" && (
          <EretzIrRollingPhase
            roomId={room.id}
            isHost={isHost}
            supabase={supabase}
          />
        )}

        {state.phase === "writing" && (
          <EretzIrWritingPhase
            room={room}
            players={players}
            myPlayerInRoom={myPlayerInRoom}
            isHost={isHost}
            letter={state.letter}
            supabase={supabase}
          />
        )}

        {state.phase === "revealing" && (
          <EretzIrRevealingPhase
            room={room}
            players={players}
            isHost={isHost}
            currentCategoryIndex={state.currentCategoryIndex}
            supabase={supabase}
          />
        )}

        {state.phase === "round_results" && (
          <EretzIrRoundResults
            room={room}
            players={players}
            isHost={isHost}
            supabase={supabase}
          />
        )}
      </div>
    </div>
  );
}
