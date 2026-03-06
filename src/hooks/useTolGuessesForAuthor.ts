"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { TolGuessRow } from "@/types/database";

/**
 * Fetches tol_guesses for a room + author and subscribes to Realtime.
 * Used to know when all players have guessed for the current author.
 */
export function useTolGuessesForAuthor(
  roomId: string | null,
  authorId: string | null,
  enabled: boolean
): TolGuessRow[] {
  const [guesses, setGuesses] = useState<TolGuessRow[]>([]);

  const refetch = useCallback(
    async (rId: string, aId: string) => {
      const client = createBrowserClient();
      const { data, error } = await client
        .from("tol_guesses")
        .select("*")
        .eq("room_id", rId)
        .eq("author_id", aId);
      if (!error && data) setGuesses(data as TolGuessRow[]);
    },
    []
  );

  useEffect(() => {
    if (!roomId || !authorId || !enabled) return;

    const client = createBrowserClient();
    refetch(roomId, authorId);

    const channel = client
      .channel(`tol_guesses:${roomId}:${authorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tol_guesses",
          filter: `room_id=eq.${roomId}`,
        },
        () => refetch(roomId, authorId)
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [roomId, authorId, enabled, refetch]);

  return guesses;
}
