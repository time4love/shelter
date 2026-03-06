"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { TolStatementRow } from "@/types/database";

/**
 * Fetches tol_statements for a room and subscribes to Realtime.
 * Used to know how many players have submitted and to fetch a specific author's statements.
 */
export function useTolStatements(roomId: string | null, enabled: boolean): TolStatementRow[] {
  const [statements, setStatements] = useState<TolStatementRow[]>([]);

  const refetch = useCallback(async (id: string) => {
    const client = createBrowserClient();
    const { data, error } = await client
      .from("tol_statements")
      .select("*")
      .eq("room_id", id);
    if (!error && data) setStatements(data as TolStatementRow[]);
  }, []);

  useEffect(() => {
    if (!roomId || !enabled) return;

    const client = createBrowserClient();
    refetch(roomId);

    const channel = client
      .channel(`tol_statements:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tol_statements", filter: `room_id=eq.${roomId}` },
        () => refetch(roomId)
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [roomId, enabled, refetch]);

  return statements;
}
