"use client";

import { useState } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi, gameVotes as gameVotesApi } from "@/lib/supabase/typed-mutations";

export interface BattleshipRoundResultsProps {
  room: RoomRow;
  players: PlayerRow[];
  isHost: boolean;
  winnerId: string | null | undefined;
  supabase: SupabaseClient<Database>;
}

export function BattleshipRoundResults({
  room,
  players,
  isHost,
  winnerId,
  supabase,
}: BattleshipRoundResultsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const winner = winnerId ? players.find((p) => p.id === winnerId) : null;

  const handleBackToSelection = async () => {
    if (!isHost) return;
    setError(null);
    setLoading(true);
    try {
      const { error: errVotes } = await gameVotesApi.deleteByRoomId(supabase, room.id);
      if (errVotes) throw errVotes;
      const { error: errRoom } = await roomsApi.updateToGameSelection(supabase, room.id);
      if (errRoom) throw errRoom;
    } catch {
      setError("אופס, משהו השתבש. נסה שוב!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6" dir="rtl" lang="he">
      <h2 className="text-center text-2xl font-bold text-foreground">סיום קרב צוללות</h2>
      {winner ? (
        <div className="rounded-2xl bg-playful-yellow/30 p-6 text-center shadow-soft">
          <p className="text-lg text-foreground/80">המנצח השורד הוא:</p>
          <p className="mt-2 flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
            <span aria-hidden>{winner.avatar}</span>
            {winner.name}
          </p>
        </div>
      ) : (
        <p className="text-center text-foreground/80">הקרב הסתיים.</p>
      )}
      {error && (
        <p className="text-center font-medium text-soft-pink" role="alert">
          {error}
        </p>
      )}
      {isHost && (
        <button
          type="button"
          onClick={handleBackToSelection}
          disabled={loading}
          className="w-full rounded-2xl bg-mint-green py-4 text-xl font-bold text-white shadow-card hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "מעביר..." : "חזור לבחירת משחקים"}
        </button>
      )}
    </div>
  );
}
