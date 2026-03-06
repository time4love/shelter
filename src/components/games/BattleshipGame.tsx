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
  const roundId = typeof o.roundId === "string" ? o.roundId : undefined;
  if (o.phase === "hiding") {
    return { phase: "hiding", roundId };
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
      roundId,
    };
  }
  if (o.phase === "round_results") {
    return {
      phase: "round_results",
      winnerId: typeof o.winnerId === "string" ? o.winnerId : undefined,
      roundId,
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
    const roundId = (room.game_state as Record<string, unknown>)?.roundId as string | undefined;
    roomsApi.updateGameState(supabase, room.id, { phase: "hiding", roundId });
  }, [isHost, room.id, room.game_state, supabase, gameState]);

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

      {state.phase === "hiding" && state.roundId && (
        <BattleshipPlacement
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          roundId={state.roundId}
          supabase={supabase}
        />
      )}

      {state.phase === "playing" && state.roundId && (
        <BattleshipBattlefield
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          gameState={state}
          roundId={state.roundId}
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
