"use client";

import { useCallback, useEffect, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

/**
 * Plays an audio URL (handles browser autoplay policy).
 */
function playAudioUrl(url: string): void {
  try {
    const audio = new Audio(url);
    const played = audio.play();
    if (typeof played?.catch === "function") {
      played.catch(() => {
        // Autoplay blocked or failed – ignore (e.g. user hasn't interacted yet)
      });
    }
  } catch {
    // Ignore
  }
}

/**
 * Subscribes to room audio broadcast and exposes broadcastSound.
 * When a "play_sound" event is received, plays the audio on this device.
 * Mount once per room (e.g. in RoomPage) so it's active during lobby and all games.
 */
export function useRoomAudio(roomId: string | null) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>["channel"]> | null>(null);

  const broadcastSound = useCallback(
    (url: string) => {
      if (!roomId || !channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "play_sound",
        payload: { url },
      });
    },
    [roomId]
  );

  /** Play a sound on this device only (e.g. when current user taps Play). */
  const playSound = useCallback((url: string) => {
    playAudioUrl(url);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const supabase = createBrowserClient();
    const channel = supabase.channel(`room_audio_${roomId}`);

    channel.on("broadcast", { event: "play_sound" }, (payload) => {
      const url = (payload.payload as { url?: string })?.url;
      if (typeof url === "string" && url) playAudioUrl(url);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { broadcastSound, playSound };
}
