"use client";

import { useState } from "react";
import { usePlayerStore, AVATAR_OPTIONS, type AvatarOption } from "@/store/player-store";
import type { Database } from "@/types/database";
import type { RoomRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { players as playersApi } from "@/lib/supabase/typed-mutations";

export interface JoinModalProps {
  room: RoomRow;
  shortCode: string;
  localPlayerId: string;
  playerName: string;
  playerAvatar: string;
  setPlayerName: (name: string) => void;
  setPlayerAvatar: (avatar: AvatarOption | string) => void;
  onJoined: () => Promise<void>;
  supabase: SupabaseClient<Database>;
}

/**
 * Modal/view that asks for Name and Avatar. Shown when the user has not joined this room yet.
 * On submit: (1) update Zustand (2) INSERT/upsert player in Supabase (3) call onJoined().
 */
export function JoinModal({
  room,
  shortCode,
  localPlayerId,
  playerName,
  playerAvatar,
  setPlayerName,
  setPlayerAvatar,
  onJoined,
  supabase,
}: JoinModalProps) {
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleSubmit() {
    const name = playerName?.trim();
    if (!name) {
      setJoinError("כתוב את השם שלך");
      return;
    }
    if (!playerAvatar) {
      setJoinError("בחר אווטר");
      return;
    }
    setJoinError(null);
    setJoining(true);
    try {
      usePlayerStore.getState().setPlayerName(name);
      usePlayerStore.getState().setPlayerAvatar(playerAvatar);
      usePlayerStore.getState().setRoomId(room.id);

      const { error } = await playersApi.upsert(supabase, {
        room_id: room.id,
        client_id: localPlayerId,
        name,
        avatar: playerAvatar,
        is_host: room.host_id === localPlayerId,
      });
      if (error) throw error;

      await onJoined();
    } catch {
      setJoinError("אופס, משהו השתבש. נסה שוב!");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-pink/30 via-background to-sky-blue/20 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/90 shadow-card p-8 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-foreground text-center">היכנס לחדר</h2>
        <p className="text-foreground/70 text-center">חדר: {shortCode}</p>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-foreground">השם שלך</span>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="כתוב כאן"
            className="rounded-2xl border-2 border-foreground/10 bg-background px-4 py-3 text-lg focus:border-sky-blue focus:outline-none"
            dir="rtl"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="font-medium text-foreground">בחר אווטר</span>
          <div className="grid grid-cols-3 gap-3">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setPlayerAvatar(emoji)}
                className={`aspect-square rounded-2xl text-4xl flex items-center justify-center transition shadow-soft ${
                  playerAvatar === emoji
                    ? "ring-4 ring-playful-yellow bg-playful-yellow/30"
                    : "bg-background hover:bg-soft-pink/20"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {joinError && (
          <p className="text-soft-pink font-medium text-center text-sm" role="alert">
            {joinError}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={joining}
          className="w-full py-4 rounded-2xl bg-mint-green text-white font-bold text-lg shadow-soft hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
        >
          {joining ? "נכנס..." : "היכנס לחדר"}
        </button>
      </div>
    </div>
  );
}
