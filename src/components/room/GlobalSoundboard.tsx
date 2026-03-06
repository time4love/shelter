"use client";

import { useCallback, useState } from "react";
import type { PlayerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { Megaphone, Play, Trash2, X } from "lucide-react";
import { VoiceRecorder } from "./VoiceRecorder";
import { players as playersMutations } from "@/lib/supabase/typed-mutations";
import { usePlayerStore } from "@/store/player-store";
import { normalizePlayerSounds, getDefaultSoundName } from "@/lib/utils/player-sounds";
import type { PlayerSoundsMap } from "@/types/database";

const SLOTS: (1 | 2 | 3)[] = [1, 2, 3];

export interface GlobalSoundboardProps {
  myPlayerInRoom: PlayerRow | null;
  supabase: SupabaseClient<Database>;
  broadcastSound: (url: string) => void;
  playSound: (url: string) => void;
  refetchMyPlayer: () => Promise<void>;
  /** When true, the modal is visible. Controlled by parent (e.g. BottomNavBar). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal with 3 sound slots. Empty slots: VoiceRecorder. Filled: Play (broadcast + local) and Delete.
 * Opened from BottomNavBar; no floating button.
 */
export function GlobalSoundboard({
  myPlayerInRoom,
  supabase,
  broadcastSound,
  playSound,
  refetchMyPlayer,
  open,
  onOpenChange,
}: GlobalSoundboardProps) {
  const playerSounds = usePlayerStore((s) => s.playerSounds ?? null);
  const merged: PlayerSoundsMap = {
    ...normalizePlayerSounds(playerSounds ?? {}),
    ...normalizePlayerSounds((myPlayerInRoom?.sounds ?? {}) as Record<string, string | { url: string; name: string }>),
  };
  const sounds: PlayerSoundsMap | null =
    Object.keys(merged).length > 0 ? merged : null;

  const [editingSlot, setEditingSlot] = useState<null | (1 | 2 | 3)>(null);

  const handlePlay = (url: string) => {
    broadcastSound(url);
    playSound(url);
  };

  const handleDelete = async (slot: 1 | 2 | 3) => {
    if (!myPlayerInRoom) return;
    const next = { ...(sounds || {}) };
    delete next[String(slot)];
    const { error } = await playersMutations.update(supabase, myPlayerInRoom.id, {
      sounds: next,
    });
    if (!error) {
      usePlayerStore.getState().setPlayerSounds(next);
      await refetchMyPlayer();
    }
  };

  const handleNameBlur = useCallback(
    async (slot: 1 | 2 | 3, newName: string) => {
      setEditingSlot(null);
      if (!myPlayerInRoom || !sounds) return;
      const entry = sounds[String(slot)];
      if (!entry) return;
      const trimmed = newName.trim() || getDefaultSoundName(String(slot));
      if (trimmed === entry.name) return;
      const next: PlayerSoundsMap = {
        ...sounds,
        [String(slot)]: { url: entry.url, name: trimmed },
      };
      const { error } = await playersMutations.update(supabase, myPlayerInRoom.id, {
        sounds: next,
      });
      if (!error) {
        usePlayerStore.getState().setPlayerSounds(next);
        await refetchMyPlayer();
      }
    },
    [myPlayerInRoom, sounds, supabase, refetchMyPlayer]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 p-0"
      dir="rtl"
      lang="he"
      role="dialog"
      aria-modal="true"
      aria-labelledby="soundboard-title"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="rounded-t-3xl bg-gradient-to-b from-sky-blue/20 to-soft-pink/20 shadow-card animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-foreground/10 bg-white/95 px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <h2
            id="soundboard-title"
            className="text-xl font-bold text-foreground flex items-center gap-2"
          >
            <Megaphone className="h-6 w-6 text-mint-green" />
            לוח צלילים
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
        <div className="p-4 pb-8 max-h-[70vh] overflow-y-auto">
          <p className="text-center text-foreground/70 text-sm mb-4">
            הקלט עד 3 צלילים והשמע לכולם בחדר 🎵
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SLOTS.map((slot) => {
              const entry = sounds?.[String(slot)];
              const url = entry?.url;
              return (
                <div
                  key={slot}
                  className="rounded-2xl bg-white/90 shadow-soft p-4 flex flex-col items-center gap-3 min-h-[140px] justify-center"
                >
                  {url ? (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePlay(url)}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-playful-yellow text-white shadow transition hover:opacity-95 active:scale-95 focus:outline-none focus:ring-2 focus:ring-mint-green"
                          aria-label="השמע לכולם"
                        >
                          <Play className="h-6 w-6 me-0.5" fill="currentColor" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(slot)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-soft-pink/30 text-foreground/80 hover:bg-soft-pink/50 transition focus:outline-none focus:ring-2 focus:ring-mint-green"
                          aria-label="מחק צליל"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      {editingSlot === slot ? (
                        <input
                          type="text"
                          className="w-full max-w-[140px] text-center text-sm text-foreground/90 bg-white/80 border border-foreground/20 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-mint-green"
                          defaultValue={entry?.name ?? getDefaultSoundName(String(slot))}
                          onBlur={(e) => handleNameBlur(slot, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          autoFocus
                          aria-label="שם הצליל"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingSlot(slot)}
                          className="text-sm text-foreground/70 hover:text-foreground/90 underline decoration-dotted cursor-pointer min-h-[1.5rem]"
                        >
                          {entry?.name ?? getDefaultSoundName(String(slot))}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm text-foreground/70">צליל {slot}</span>
                      <VoiceRecorder
                        slot={slot}
                        playerId={myPlayerInRoom?.client_id ?? ""}
                        playerDbId={myPlayerInRoom?.id ?? ""}
                        currentSounds={sounds}
                        supabase={supabase}
                        onUploaded={refetchMyPlayer}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
