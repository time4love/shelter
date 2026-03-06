"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { usePlayerStore } from "@/store/player-store";
import { generateShortCode } from "@/lib/utils/codes";
import { Sparkles } from "lucide-react";

/**
 * Home page: big friendly CTA to create a new room.
 * Creates room in Supabase and redirects to /room/[short_code].
 */
export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerId = usePlayerStore((s) => s.playerId || "");

  async function handleCreateRoom() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      // Ensure we have a local player ID (persist may not have rehydrated yet)
      let id = usePlayerStore.getState().playerId;
      if (!id) {
        id = crypto.randomUUID();
        usePlayerStore.setState({ playerId: id });
      }

      let code = generateShortCode();
      const maxAttempts = 5;
      for (let i = 0; i < maxAttempts; i++) {
        const { data: existing } = await supabase
          .from("rooms")
          .select("id")
          .eq("short_code", code)
          .maybeSingle();
        if (!existing) break;
        code = generateShortCode();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase canary client types
      const { data: room, error: insertError } = await (supabase as any)
        .from("rooms")
        .insert({ short_code: code, host_id: id, status: "lobby" })
        .select("id")
        .single();

      if (insertError) throw insertError;
      if (!room) throw new Error("Failed to create room");

      usePlayerStore.getState().setRoomId(room.id);
      if (!usePlayerStore.getState().playerId) {
        usePlayerStore.setState({ playerId: id });
      }
      router.push(`/room/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת חדר");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-pink/30 via-background to-sky-blue/20 flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 max-w-md w-full">
        <div className="flex items-center gap-3">
          <span className="text-5xl" aria-hidden>🏠</span>
          <h1 className="text-4xl font-bold text-foreground drop-shadow-sm">
            משחק בממ״ד
          </h1>
        </div>
        <p className="text-lg text-foreground/80 text-center">
          צרו חדר, הזמינו חברים, ותתחילו לשחק ביחד!
        </p>

        <button
          type="button"
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full max-w-xs flex items-center justify-center gap-2 py-4 px-8 rounded-3xl bg-playful-yellow text-foreground font-bold text-xl shadow-soft hover:opacity-95 active:scale-[0.98] transition disabled:opacity-60 disabled:pointer-events-none"
        >
          {loading ? (
            <span className="animate-pulse">יוצר חדר...</span>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              צור חדר חדש
            </>
          )}
        </button>

        {error && (
          <p className="text-soft-pink font-medium text-center" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
