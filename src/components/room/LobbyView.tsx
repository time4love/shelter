"use client";

import { useState } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { Copy, Users } from "lucide-react";
import { rooms as roomsApi } from "@/lib/supabase/typed-mutations";

export interface LobbyViewProps {
  shortCode: string;
  room: RoomRow;
  players: PlayerRow[];
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

/**
 * Lobby: players grid, copy invite link, and (host only) start button.
 */
export function LobbyView({
  shortCode,
  room,
  players,
  isHost,
  supabase,
}: LobbyViewProps) {
  const [copyDone, setCopyDone] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const inviteUrl =
    typeof window !== "undefined" ? `${window.location.origin}/room/${shortCode}` : "";

  function handleCopyInvite() {
    if (typeof navigator === "undefined" || !inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }

  async function handleStart() {
    setStartError(null);
    setStarting(true);
    try {
      const { error } = await roomsApi.updateStatus(supabase, room.id, "game_selection");
      if (error) throw error;
    } catch {
      setStartError("שגיאה בעדכון החדר");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col w-full bg-gradient-to-b from-soft-pink/20 via-background to-sky-blue/20">
      <div className="p-4">
        <h1 className="text-3xl font-bold text-foreground text-center mt-4 mb-2">
          {isHost ? "מחכים לחברים..." : "ממתינים שכולם יצטרפו"}
        </h1>
        <p className="text-foreground/70 text-center mb-6">חדר: {shortCode}</p>

        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={handleCopyInvite}
            className="flex items-center gap-2 py-3 px-6 rounded-2xl bg-sky-blue/90 text-white font-medium shadow-soft"
          >
            <Copy className="w-5 h-5" />
            {copyDone ? "הועתק!" : "העתק קישור להזמנה"}
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-6 h-6 text-foreground/70" />
            <span className="font-medium text-foreground">{players.length} משתתפים</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-md">
            {players.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl bg-white/90 shadow-soft p-4 flex flex-col items-center gap-2"
              >
                <span className="text-4xl">{p.avatar}</span>
                <span className="font-bold text-foreground">{p.name}</span>
                {p.is_host && (
                  <span className="text-xs text-foreground/60">מארח/ת</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {(isHost || startError) && (
        <div className="bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t shadow-md rounded-t-2xl">
          {startError && (
            <p className="text-soft-pink font-medium text-center mt-2 mb-2" role="alert">
              {startError}
            </p>
          )}
          {isHost && (
            <button
              type="button"
              onClick={handleStart}
              disabled={starting}
              className="w-full max-w-xs py-4 rounded-2xl bg-playful-yellow text-foreground font-bold text-xl shadow-card hover:opacity-95 active:scale-[0.98] disabled:opacity-60 mx-auto block"
            >
              {starting ? "מעביר..." : "כולנו כאן אפשר להתחיל"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
