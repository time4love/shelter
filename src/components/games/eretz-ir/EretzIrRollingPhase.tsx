"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi } from "@/lib/supabase/typed-mutations";
import { LETTERS } from "./constants";

export interface EretzIrRollingPhaseProps {
  roomId: string;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

export function EretzIrRollingPhase({
  roomId,
  isHost,
  supabase,
}: EretzIrRollingPhaseProps) {
  async function handleDrawLetter() {
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    await roomsApi.updateGameState(supabase, roomId, {
      phase: "writing",
      letter,
    });
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col items-center justify-center gap-8 px-6 py-4">
        <h2 className="text-2xl font-bold text-foreground">הגרלת אות!</h2>
        {!isHost && (
          <p className="text-foreground/80">מחכים למארח שיגריל את האות...</p>
        )}
      </div>
      {isHost && (
        <div className="bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t shadow-md rounded-t-2xl">
          <button
            type="button"
            onClick={handleDrawLetter}
            className="w-full rounded-2xl bg-playful-yellow px-10 py-5 text-xl font-bold text-foreground shadow-card active:scale-[0.98]"
          >
            הגרל אות!
          </button>
        </div>
      )}
    </div>
  );
}
