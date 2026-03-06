"use client";

import type { RoomRow, PlayerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { TruthOrLieGame } from "@/components/games/TruthOrLieGame";
import { EretzIrGame } from "@/components/games/EretzIrGame";

export interface GameEngineProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

/**
 * Renders the active game based on room.current_game.
 * Modular so new games (e.g. The Imposter) can be added easily.
 */
export function GameEngine({
  room,
  players,
  myPlayerInRoom,
  isHost,
  supabase,
}: GameEngineProps) {
  const currentGame = room.current_game;

  if (currentGame === "truth_or_lie") {
    return (
      <TruthOrLieGame
        room={room}
        players={players}
        myPlayerInRoom={myPlayerInRoom}
        isHost={isHost}
        supabase={supabase}
      />
    );
  }

  if (currentGame === "eretz_ir") {
    return (
      <EretzIrGame
        room={room}
        players={players}
        myPlayerInRoom={myPlayerInRoom}
        isHost={isHost}
        supabase={supabase}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-pink/20 to-sky-blue/20 flex items-center justify-center p-6" dir="rtl" lang="he">
      <p className="text-xl text-foreground/80">משחק לא זוהה. חזור לבחירת משחק.</p>
    </div>
  );
}
