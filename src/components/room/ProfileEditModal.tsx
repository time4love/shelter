"use client";

import { useState } from "react";
import { usePlayerStore, AVATAR_OPTIONS, type AvatarOption } from "@/store/player-store";
import type { PlayerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { X } from "lucide-react";
import { players as playersApi } from "@/lib/supabase/typed-mutations";

export interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myPlayerInRoom: PlayerRow;
  playerName: string;
  playerAvatar: string;
  setPlayerName: (name: string) => void;
  setPlayerAvatar: (avatar: AvatarOption | string) => void;
  supabase: SupabaseClient<Database>;
  onSaved?: () => void;
}

/**
 * Condensed modal to edit current player's name and avatar.
 * Updates Supabase players table and local Zustand state on save.
 */
export function ProfileEditModal({
  open,
  onOpenChange,
  myPlayerInRoom,
  playerName,
  playerAvatar,
  setPlayerName,
  setPlayerAvatar,
  supabase,
  onSaved,
}: ProfileEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const name = playerName?.trim();
    if (!name) {
      setError("כתוב את השם שלך");
      return;
    }
    if (!playerAvatar) {
      setError("בחר אווטר");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      usePlayerStore.getState().setPlayerName(name);
      usePlayerStore.getState().setPlayerAvatar(playerAvatar);

      const { error: updateError } = await playersApi.update(supabase, myPlayerInRoom.id, {
        name,
        avatar: playerAvatar,
      });
      if (updateError) throw updateError;

      onSaved?.();
      onOpenChange(false);
    } catch {
      setError("אופס, משהו השתבש. נסה שוב!");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      dir="rtl"
      lang="he"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-edit-title"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white/95 shadow-card border border-foreground/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
          <h2 id="profile-edit-title" className="text-lg font-bold text-foreground">
            ערוך פרופיל
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 text-foreground/70 hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-mint-green"
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-medium text-foreground text-sm">השם שלך</span>
            <input
              type="text"
              value={playerName ?? ""}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="כתוב כאן"
              className="rounded-xl border-2 border-foreground/10 bg-background px-4 py-2.5 text-base focus:border-sky-blue focus:outline-none"
              dir="rtl"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="font-medium text-foreground text-sm">בחר אווטר</span>
            <div className="grid grid-cols-3 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setPlayerAvatar(emoji)}
                  className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition shadow-soft ${
                    playerAvatar === emoji
                      ? "ring-2 ring-playful-yellow bg-playful-yellow/30"
                      : "bg-background hover:bg-soft-pink/20"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-soft-pink font-medium text-center text-sm" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-mint-green text-white font-bold shadow-soft hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}
