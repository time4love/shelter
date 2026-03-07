"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { TolStatementRow } from "@/types/database";

/**
 * Fetches tol_statements for a room and round, and subscribes to Realtime.
 * Used to know how many players have submitted and to fetch a specific author's statements.
 */
export function useTolStatements(
  roomId: string | null,
  roundId: string | null,
  enabled: boolean
): TolStatementRow[] {
  const [statements, setStatements] = useState<TolStatementRow[]>([]);

  const refetch = useCallback(
    async (rId: string, round: string) => {
      const client = createBrowserClient();
      const { data, error } = await client
        .from("tol_statements")
        .select("*")
        .eq("room_id", rId)
        .eq("round_id", round);
      if (!error && data) setStatements(data as TolStatementRow[]);
    },
    []
  );

  useEffect(() => {
    if (!roomId || !roundId || !enabled) return;

    const client = createBrowserClient();
    refetch(roomId, roundId);

    const channel = client
      .channel(`tol_statements:${roomId}:${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tol_statements", filter: `room_id=eq.${roomId}` },
        () => refetch(roomId, roundId)
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [roomId, roundId, enabled, refetch]);

  return statements;
}
