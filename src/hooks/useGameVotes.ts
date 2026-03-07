"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { GameVoteRow } from "@/types/database";

/**
 * Fetches game votes for a room (and optional selection round) and subscribes to Realtime.
 * When selectionRoundId is set, only votes for that round are returned (no cross-round collision).
 */
export function useGameVotes(
  roomId: string | null,
  myPlayerId: string | null,
  enabled: boolean,
  selectionRoundId: string | null = null
): { votes: GameVoteRow[]; myVote: GameVoteRow | null } {
  const [votes, setVotes] = useState<GameVoteRow[]>([]);

  const refetch = useCallback(
    async (id: string) => {
      const client = createBrowserClient();
      let q = client.from("game_votes").select("*").eq("room_id", id);
      if (selectionRoundId != null) {
        q = q.eq("selection_round_id", selectionRoundId);
      } else {
        q = q.is("selection_round_id", null);
      }
      const { data, error } = await q;
      if (!error && data) setVotes(data as GameVoteRow[]);
    },
    [selectionRoundId]
  );

  useEffect(() => {
    if (!roomId || !enabled) return;

    const client = createBrowserClient();
    refetch(roomId);

    const channel = client
      .channel(`game-votes:${roomId}:${selectionRoundId ?? "legacy"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_votes",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          refetch(roomId);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [roomId, selectionRoundId, enabled, refetch]);

  const myVote =
    myPlayerId != null ? votes.find((v) => v.player_id === myPlayerId) ?? null : null;

  return { votes, myVote };
}
