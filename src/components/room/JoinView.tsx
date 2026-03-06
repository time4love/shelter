"use client";

import { useState } from "react";
import { usePlayerStore, AVATAR_OPTIONS, type AvatarOption } from "@/store/player-store";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { players as playersApi } from "@/lib/supabase/typed-mutations";

export interface JoinViewProps {
  shortCode: string;
  roomId: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  setPlayerName: (name: string) => void;
  setPlayerAvatar: (avatar: AvatarOption | string) => void;
  onJoin: (roomId: string, name?: string, avatar?: string) => void;
  onJoinedRefetch: () => Promise<void>;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

/**
 * Guest join flow: name input, avatar grid, and Join button.
 * Host is auto-joined and never sees this view.
 */
export function JoinView({
  shortCode,
  roomId,
  playerId,
  playerName,
  playerAvatar,
  setPlayerName,
  setPlayerAvatar,
  onJoin,
  onJoinedRefetch,
  isHost,
  supabase,
}: JoinViewProps) {
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleJoin() {
    const name = playerName?.trim();
    if (!name) {
      setJoinError("כתוב את השם שלך");
      return;
    }
    if (!playerAvatar) {
      setJoinError("בחר אווטר");
      return;
    }
    const id = playerId || crypto.randomUUID();
    if (!playerId) usePlayerStore.setState({ playerId: id });
    setJoinError(null);
    setJoining(true);
    try {
      const { error } = await playersApi.upsert(supabase, {
        room_id: roomId,
        client_id: id,
        name,
        avatar: playerAvatar,
        is_host: isHost,
      });
      if (error) throw error;
      onJoin(roomId, name, playerAvatar);
      await onJoinedRefetch();
    } catch {
      setJoinError("שגיאה בהצטרפות לחדר");
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
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-4 rounded-2xl bg-mint-green text-white font-bold text-lg shadow-soft hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
        >
          {joining ? "נכנס..." : "היכנס לחדר"}
        </button>
      </div>
    </div>
  );
}
