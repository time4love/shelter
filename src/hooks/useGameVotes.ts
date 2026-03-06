"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { GameVoteRow } from "@/types/database";

/**
 * Fetches game votes for a room and subscribes to Realtime (INSERT, UPDATE).
 * Used in Game Selection view. Cleans up subscription on unmount.
 */
export function useGameVotes(
  roomId: string | null,
  myPlayerId: string | null,
  enabled: boolean
): { votes: GameVoteRow[]; myVote: GameVoteRow | null } {
  const [votes, setVotes] = useState<GameVoteRow[]>([]);

  const refetch = useCallback(async (id: string) => {
    const client = createBrowserClient();
    const { data, error } = await client
      .from("game_votes")
      .select("*")
      .eq("room_id", id);
    if (!error && data) setVotes(data as GameVoteRow[]);
  }, []);

  useEffect(() => {
    if (!roomId || !enabled) return;

    const client = createBrowserClient();
    refetch(roomId);

    const channel = client
      .channel(`game-votes:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_votes",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as GameVoteRow;
          setVotes((prev) => {
            const exists = prev.some((v) => v.id === row.id);
            if (exists) return prev;
            return [...prev, row];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_votes",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as GameVoteRow;
          setVotes((prev) => prev.map((v) => (v.id === row.id ? row : v)));
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [roomId, enabled, refetch]);

  const myVote =
    myPlayerId != null ? votes.find((v) => v.player_id === myPlayerId) ?? null : null;

  return { votes, myVote };
}
