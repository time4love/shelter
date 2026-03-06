"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/player-store";

/**
 * Ensures playerId exists in the persisted store. Generates and saves a UUID on first load.
 * Call once at the top of the Room page (or app shell) so all room logic has a stable client id.
 */
export function useEnsurePlayerId(): void {
  useEffect(() => {
    const { playerId } = usePlayerStore.getState();
    if (playerId) return;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    usePlayerStore.setState({ playerId: id });
  }, []);
}
