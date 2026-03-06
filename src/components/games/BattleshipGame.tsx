"use client";

import { useEffect } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { GameStateBattleship } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi } from "@/lib/supabase/typed-mutations";
import { BattleshipPlacement } from "@/components/games/battleship/BattleshipPlacement";
import { BattleshipBattlefield } from "@/components/games/battleship/BattleshipBattlefield";
import { BattleshipRoundResults } from "@/components/games/battleship/BattleshipRoundResults";

export interface BattleshipGameProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

function parseGameState(room: RoomRow): GameStateBattleship | null {
  const g = room.game_state;
  if (g == null || typeof g !== "object") return null;
  const o = g as Record<string, unknown>;
  if (o.phase === "hiding") {
    return { phase: "hiding" };
  }
  if (
    o.phase === "playing" &&
    typeof o.currentTurnId === "string" &&
    Array.isArray(o.targetQueue) &&
    typeof o.currentTargetId === "string" &&
    Array.isArray(o.alivePlayers)
  ) {
    return {
      phase: "playing",
      currentTurnId: o.currentTurnId,
      targetQueue: o.targetQueue as string[],
      currentTargetId: o.currentTargetId,
      alivePlayers: o.alivePlayers as string[],
    };
  }
  if (o.phase === "round_results") {
    return {
      phase: "round_results",
      winnerId: typeof o.winnerId === "string" ? o.winnerId : undefined,
    };
  }
  return null;
}

export function BattleshipGame({
  room,
  players,
  myPlayerInRoom,
  isHost,
  supabase,
}: BattleshipGameProps) {
  const gameState = parseGameState(room);

  useEffect(() => {
    if (!isHost || gameState !== null) return;
    roomsApi.updateGameState(supabase, room.id, { phase: "hiding" });
  }, [isHost, room.id, supabase, gameState]);

  const state = gameState ?? { phase: "hiding" as const };

  return (
    <div
      className="flex min-h-screen flex-col bg-gradient-to-b from-soft-pink/20 via-background to-sky-blue/20 pt-6 pb-12"
      dir="rtl"
      lang="he"
    >
      <h1 className="mb-2 px-4 text-center text-2xl font-bold text-foreground">
        צוללות 🚢
      </h1>

      {state.phase === "hiding" && (
        <BattleshipPlacement
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          supabase={supabase}
        />
      )}

      {state.phase === "playing" && (
        <BattleshipBattlefield
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          gameState={state}
          supabase={supabase}
        />
      )}

      {state.phase === "round_results" && (
        <BattleshipRoundResults
          room={room}
          players={players}
          isHost={isHost}
          winnerId={state.winnerId}
          supabase={supabase}
        />
      )}
    </div>
  );
}
