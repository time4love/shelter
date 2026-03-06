"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { RoomRow, PlayerRow } from "@/types/database";

const ROOM_NOT_FOUND_MESSAGE = "החדר לא קיים או נסגר";

export type RoomAndJoinStatus = {
  room: RoomRow | null;
  roomError: string | null;
  loading: boolean;
  /** Current user's player record in this room, or null if not joined. */
  myPlayerInRoom: PlayerRow | null;
  /** Call after JoinModal submit to re-check and show Lobby. */
  refetchMyPlayer: () => Promise<void>;
};

/**
 * Fetches room by short_code, then fetches "my" player for that room (client_id + room_id).
 * Subscribes to room Realtime updates so status changes (e.g. game_selection, playing) sync to all clients.
 */
export function useRoomAndJoinStatus(
  shortCode: string | undefined,
  localPlayerId: string
): RoomAndJoinStatus {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myPlayerInRoom, setMyPlayerInRoom] = useState<PlayerRow | null>(null);

  const fetchRoomAndMyPlayer = useCallback(async () => {
    if (!shortCode?.trim()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setRoomError(null);
    setRoom(null);
    setMyPlayerInRoom(null);

    const client = createBrowserClient();

    const { data: roomData, error: roomErr } = await client
      .from("rooms")
      .select("*")
      .eq("short_code", shortCode.toUpperCase())
      .maybeSingle();

    if (roomErr) {
      setRoomError(ROOM_NOT_FOUND_MESSAGE);
      setLoading(false);
      return;
    }
    const roomRow = roomData as RoomRow | null;
    if (!roomRow) {
      setRoomError(ROOM_NOT_FOUND_MESSAGE);
      setLoading(false);
      return;
    }

    setRoom(roomRow);

    const { data: playerData } = await client
      .from("players")
      .select("*")
      .eq("room_id", roomRow.id)
      .eq("client_id", localPlayerId)
      .maybeSingle();

    setMyPlayerInRoom((playerData as PlayerRow | null) ?? null);
    setLoading(false);
  }, [shortCode, localPlayerId]);

  useEffect(() => {
    if (!shortCode || !localPlayerId) {
      setLoading(false);
      return;
    }
    fetchRoomAndMyPlayer();
  }, [shortCode, localPlayerId, fetchRoomAndMyPlayer]);

  // Subscribe to room updates so status changes (game_selection → playing) sync to all clients
  useEffect(() => {
    if (!room?.id) return;
    const client = createBrowserClient();
    const channel = client
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom((prev) => (prev ? { ...prev, ...(payload.new as Partial<RoomRow>) } : null));
        }
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [room?.id]);

  const refetchMyPlayer = useCallback(async () => {
    if (!room || !localPlayerId) return;
    const client = createBrowserClient();
    const { data } = await client
      .from("players")
      .select("*")
      .eq("room_id", room.id)
      .eq("client_id", localPlayerId)
      .maybeSingle();
    setMyPlayerInRoom((data as PlayerRow | null) ?? null);
  }, [room, localPlayerId]);

  return {
    room,
    roomError,
    loading,
    myPlayerInRoom,
    refetchMyPlayer,
  };
}
