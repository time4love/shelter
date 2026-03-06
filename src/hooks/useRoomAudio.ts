"use client";

import { useCallback, useEffect, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAudioUnlockStore } from "@/store/audio-unlock-store";

/** Append cache-busting query so re-recorded clips at the same URL play the new content. */
function withCacheBust(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_=${Date.now()}`;
}

/**
 * Plays an audio URL. On NotAllowedError (autoplay blocked), sets global audioBlocked so the unlock banner is shown.
 * Uses cache-busting so re-recorded clips (same URL, new content) play the latest version.
 */
export function playAudioUrl(url: string): void {
  try {
    const audio = new Audio(withCacheBust(url));
    const played = audio.play();
    if (typeof played?.catch === "function") {
      played.catch((err: unknown) => {
        const isBlocked =
          err instanceof Error && (err.name === "NotAllowedError" || err.name === "NotAllowed");
        if (isBlocked) {
          useAudioUnlockStore.getState().setAudioBlocked(true);
        }
      });
    }
  } catch {
    // Ignore
  }
}

/** Minimal silent WAV (data URL) to unlock audio context on user gesture. */
const SILENT_AUDIO_DATA_URL =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

/**
 * Play a silent clip to unlock the browser audio context (call from a user gesture).
 */
export function unlockAudioContext(): void {
  try {
    const audio = new Audio(SILENT_AUDIO_DATA_URL);
    audio.play().then(() => {
      useAudioUnlockStore.getState().setAudioBlocked(false);
    }).catch(() => {
      // Still clear so user can try again
      useAudioUnlockStore.getState().setAudioBlocked(false);
    });
  } catch {
    useAudioUnlockStore.getState().setAudioBlocked(false);
  }
}

/**
 * Subscribes to room_${roomId} for audio broadcast: receives play_sound and plays; exposes broadcastSound and playSound.
 * Mount at highest level in the room page.
 */
export function useRoomAudio(roomId: string | null) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>["channel"]> | null>(null);

  const broadcastSound = useCallback(
    (url: string) => {
      const ch = channelRef.current;
      if (!roomId || !ch) return;
      ch.send({
        type: "broadcast",
        event: "play_sound",
        payload: { url },
      });
    },
    [roomId]
  );

  const playSound = useCallback((url: string) => {
    playAudioUrl(url);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const supabase = createBrowserClient();
    const channel = supabase.channel(`room_${roomId}`);

    channel.on("broadcast", { event: "play_sound" }, (payload) => {
      const url = (payload.payload as { url?: string })?.url;
      if (typeof url !== "string" || !url) return;
      const audio = new Audio(withCacheBust(url));
      audio.play().catch((err: unknown) => {
        const isBlocked =
          err instanceof Error && (err.name === "NotAllowedError" || err.name === "NotAllowed");
        if (isBlocked) {
          useAudioUnlockStore.getState().setAudioBlocked(true);
        }
      });
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") channelRef.current = channel;
    });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { broadcastSound, playSound };
}
