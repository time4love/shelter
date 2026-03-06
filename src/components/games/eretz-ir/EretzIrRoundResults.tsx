"use client";

import { useState } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi, gameVotes as gameVotesApi } from "@/lib/supabase/typed-mutations";

export interface EretzIrRoundResultsProps {
  room: RoomRow;
  players: PlayerRow[];
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

export function EretzIrRoundResults({
  room,
  players,
  isHost,
  supabase,
}: EretzIrRoundResultsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedByScore = [...players].sort((a, b) => b.score - a.score);

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
      <h2 className="text-center text-2xl font-bold text-foreground">תוצאות הסיבוב</h2>
      {error && (
        <p className="text-center font-medium text-soft-pink" role="alert">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {sortedByScore.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center gap-4 rounded-2xl bg-white/90 px-4 py-3 shadow-soft"
          >
            <span className="text-2xl" aria-hidden>
              {p.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-foreground">{p.name}</p>
              <p className="text-sm text-foreground/70">{p.score} נקודות</p>
            </div>
            <span className="text-xl font-bold text-playful-yellow">#{i + 1}</span>
          </li>
        ))}
      </ul>
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
