import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export interface PlayerState {
  playerId: string;
  playerName: string;
  playerAvatar: AvatarOption | string;
  roomId: string | null;
  setPlayerName: (name: string) => void;
  setPlayerAvatar: (avatar: AvatarOption | string) => void;
  setRoomId: (roomId: string | null) => void;
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

      setPlayerName: (name) => set({ playerName: name }),
      setPlayerAvatar: (avatar) => set({ playerAvatar: avatar }),
      setRoomId: (roomId) => set({ roomId }),

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
      }),
      // Hydration: ensure playerId exists after rehydrate
      onRehydrateStorage: () => (state) => {
        if (state && !state.playerId && typeof window !== "undefined") {
          usePlayerStore.setState({ playerId: generatePlayerId() });
        }
      },
    }
  )
);

