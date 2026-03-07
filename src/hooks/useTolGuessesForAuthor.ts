"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { TolGuessRow } from "@/types/database";

/**
 * Fetches tol_guesses for a room + round + author and subscribes to Realtime.
 * Used to know when all players have guessed for the current author.
 */
export function useTolGuessesForAuthor(
  roomId: string | null,
  roundId: string | null,
  authorId: string | null,
  enabled: boolean
): TolGuessRow[] {
  const [guesses, setGuesses] = useState<TolGuessRow[]>([]);

  const refetch = useCallback(
    async (rId: string, round: string, aId: string) => {
      const client = createBrowserClient();
      const { data, error } = await client
        .from("tol_guesses")
        .select("*")
        .eq("room_id", rId)
        .eq("round_id", round)
        .eq("author_id", aId);
      if (!error && data) setGuesses(data as TolGuessRow[]);
    },
    []
  );

  useEffect(() => {
    if (!roomId || !roundId || !authorId || !enabled) return;

    const client = createBrowserClient();
    refetch(roomId, roundId, authorId);

    const channel = client
      .channel(`tol_guesses:${roomId}:${roundId}:${authorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tol_guesses",
          filter: `room_id=eq.${roomId}`,
        },
        () => refetch(roomId, roundId, authorId)
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [roomId, roundId, authorId, enabled, refetch]);

  return guesses;
}
