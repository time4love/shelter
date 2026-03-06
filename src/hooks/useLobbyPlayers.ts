"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PlayerRow } from "@/types/database";

/**
 * Fetches all players for a room and subscribes to Realtime (INSERT, UPDATE, DELETE).
 * Only run when the user has joined the room (Lobby view). Cleans up subscription on unmount.
 */
export function useLobbyPlayers(roomId: string | null, enabled: boolean): PlayerRow[] {
  const [players, setPlayers] = useState<PlayerRow[]>([]);

  const refetch = useCallback(async (id: string) => {
    const client = createBrowserClient();
    const { data, error } = await client
      .from("players")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: true });
    if (!error && data) setPlayers(data as PlayerRow[]);
  }, []);

  useEffect(() => {
    if (!roomId || !enabled) return;

    const client = createBrowserClient();
    refetch(roomId);

    const channel = client
      .channel(`lobby-players:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as PlayerRow;
          setPlayers((prev) =>
            [...prev, row].sort(
              (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as PlayerRow;
          setPlayers((prev) => prev.map((p) => (p.id === row.id ? row : p)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.old as PlayerRow;
          setPlayers((prev) => prev.filter((p) => p.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [roomId, enabled, refetch]);

  return players;
}
