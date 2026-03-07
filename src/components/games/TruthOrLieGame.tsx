"use client";

import type { RoomRow, PlayerRow } from "@/types/database";
import type { GameStateTOL } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi } from "@/lib/supabase/typed-mutations";
import { TolWritingPhase } from "@/components/games/tol/TolWritingPhase";
import { TolPlayingPhase } from "@/components/games/tol/TolPlayingPhase";
import { TolRevealView } from "@/components/games/tol/TolRevealView";
import { TolRoundResults } from "@/components/games/tol/TolRoundResults";

export interface TruthOrLieGameProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

function parseGameState(room: RoomRow): GameStateTOL | null {
  const g = room.game_state;
  if (g == null || typeof g !== "object") return null;
  const o = g as Record<string, unknown>;
  const roundId = typeof o.roundId === "string" ? o.roundId : crypto.randomUUID();
  if (o.phase === "writing") return { phase: "writing", roundId };
  if (
    o.phase === "playing" &&
    typeof o.currentAuthorId === "string" &&
    Array.isArray(o.authorsLeft)
  ) {
    return {
      phase: "playing",
      roundId,
      currentAuthorId: o.currentAuthorId,
      authorsLeft: o.authorsLeft as string[],
    };
  }
  if (
    o.phase === "revealing_answers" &&
    typeof o.currentAuthorId === "string" &&
    Array.isArray(o.authorsLeft)
  ) {
    return {
      phase: "revealing_answers",
      roundId,
      currentAuthorId: o.currentAuthorId,
      authorsLeft: o.authorsLeft as string[],
    };
  }
  if (o.phase === "round_results") return { phase: "round_results", roundId };
  return null;
}

export function TruthOrLieGame({
  room,
  players,
  myPlayerInRoom,
  isHost,
  supabase,
}: TruthOrLieGameProps) {
  const gameState = parseGameState(room) ?? {
    phase: "writing" as const,
    roundId: crypto.randomUUID(),
  };

  const handleStartGame = async () => {
    if (players.length === 0) return;
    const roundId =
      gameState.phase === "writing" ? gameState.roundId : crypto.randomUUID();
    const [first, ...rest] = players;
    await roomsApi.updateGameState(supabase, room.id, {
      phase: "playing",
      roundId,
      currentAuthorId: first.id,
      authorsLeft: rest.map((p) => p.id),
    });
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-soft-pink/20 via-background to-sky-blue/20 flex flex-col pt-6 pb-12"
      dir="rtl"
      lang="he"
    >
      <h1 className="text-2xl font-bold text-foreground text-center mb-2 px-4">
        אמת או שקר
      </h1>

      {gameState.phase === "writing" && (
        <TolWritingPhase
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          supabase={supabase}
          roundId={gameState.roundId}
          onStartGame={handleStartGame}
        />
      )}

      {gameState.phase === "playing" && (
        <TolPlayingPhase
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          supabase={supabase}
          gameState={gameState}
        />
      )}

      {gameState.phase === "revealing_answers" && (
        <TolRevealView
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          supabase={supabase}
          gameState={gameState}
        />
      )}

      {gameState.phase === "round_results" && (
        <TolRoundResults
          room={room}
          players={players}
          isHost={isHost}
          supabase={supabase}
        />
      )}
    </div>
  );
}
