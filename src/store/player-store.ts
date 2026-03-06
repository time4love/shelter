import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlayerSoundsMap } from "@/types/database";
import { normalizePlayerSounds, type RawPlayerSounds } from "@/lib/utils/player-sounds";

/**
 * Generates a simple UUID v4 for local player identity.
 * Persisted so the same device keeps the same ID across refreshes.
 */
function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const AVATAR_OPTIONS = ["🐶", "🐱", "🐼", "🦊", "🐰", "🦁"] as const;
export type AvatarOption = (typeof AVATAR_OPTIONS)[number];

export type { PlayerSoundsMap };

export interface PlayerState {
  playerId: string;
  playerName: string;
  playerAvatar: AvatarOption | string;
  roomId: string | null;
  /** Soundboard slot → { url, name }; persisted so clips carry across rooms. */
  playerSounds: PlayerSoundsMap | null;
  setPlayerName: (name: string) => void;
  setPlayerAvatar: (avatar: AvatarOption | string) => void;
  setRoomId: (roomId: string | null) => void;
  setPlayerSounds: (sounds: PlayerSoundsMap) => void;
  /** Call when joining a room; optionally set name/avatar if not set */
  joinRoom: (roomId: string, name?: string, avatar?: AvatarOption | string) => void;
  leaveRoom: () => void;
  /** Whether the user has completed the join flow (name + avatar set) */
  hasJoinedProfile: () => boolean;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      playerId: "",
      playerName: "",
      playerAvatar: "",
      roomId: null,
      playerSounds: {},

      setPlayerName: (name) => set({ playerName: name }),
      setPlayerAvatar: (avatar) => set({ playerAvatar: avatar }),
      setRoomId: (roomId) => set({ roomId }),
      setPlayerSounds: (sounds) => set({ playerSounds: sounds }),

      joinRoom: (roomId, name, avatar) => {
        set((s) => ({
          roomId,
          ...(name != null && { playerName: name }),
          ...(avatar != null && { playerAvatar: avatar }),
          // Ensure we have a playerId on first load (hydration may set it from persist)
          playerId: s.playerId || generatePlayerId(),
        }));
      },

      leaveRoom: () => set({ roomId: null }),

      hasJoinedProfile: () => {
        const { playerName, playerAvatar } = get();
        return Boolean(playerName?.trim() && playerAvatar);
      },
    }),
    {
      name: "shelter-player",
      partialize: (s) => ({
        playerId: s.playerId || generatePlayerId(),
        playerName: s.playerName,
        playerAvatar: s.playerAvatar,
        roomId: s.roomId,
        playerSounds: s.playerSounds ?? {},
      }),
      // Hydration: ensure playerId exists; normalize legacy playerSounds (string URLs → { url, name })
      onRehydrateStorage: () => (state) => {
        if (!state || typeof window === "undefined") return;
        const updates: Partial<PlayerState> = {};
        if (!state.playerId) updates.playerId = generatePlayerId();
        if (state.playerSounds && typeof state.playerSounds === "object") {
          updates.playerSounds = normalizePlayerSounds(state.playerSounds as RawPlayerSounds);
        }
        if (Object.keys(updates).length > 0) usePlayerStore.setState(updates);
      },
    }
  )
);

