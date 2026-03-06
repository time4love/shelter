"use client";

import { useState } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi, gameVotes as gameVotesApi } from "@/lib/supabase/typed-mutations";

export interface TolRoundResultsProps {
  room: RoomRow;
  players: PlayerRow[];
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

export function TolRoundResults({
  room,
  players,
  isHost,
  supabase,
}: TolRoundResultsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedByScore = [...players].sort((a, b) => b.score - a.score);

  const handleNextGame = async () => {
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
    <div className="max-w-md mx-auto p-6 flex flex-col gap-6" dir="rtl" lang="he">
      <h2 className="text-2xl font-bold text-foreground text-center">תוצאות הסיבוב</h2>
      {error && (
        <p className="text-soft-pink font-medium text-center" role="alert">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {sortedByScore.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center gap-4 rounded-2xl bg-white/90 shadow-soft px-4 py-3"
          >
            <span className="text-2xl" aria-hidden>
              {p.avatar}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground truncate">{p.name}</p>
              <p className="text-foreground/70 text-sm">{p.score} נקודות</p>
            </div>
            <span className="text-xl font-bold text-playful-yellow">
              #{i + 1}
            </span>
          </li>
        ))}
      </ul>
      {isHost && (
        <button
          type="button"
          onClick={handleNextGame}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-mint-green text-white font-bold text-xl shadow-card hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "מעביר..." : "המשך למשחק הבא"}
        </button>
      )}
    </div>
  );
}
