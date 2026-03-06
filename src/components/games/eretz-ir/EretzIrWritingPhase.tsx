"use client";

import { useState, useCallback } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { EretzIrAnswersMap } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi, eretzIrAnswers as eretzIrAnswersApi } from "@/lib/supabase/typed-mutations";
import { CATEGORIES, CATEGORY_COLORS } from "./constants";

export interface EretzIrWritingPhaseProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  letter: string;
  supabase: SupabaseClient<Database>;
}

const INITIAL_ANSWERS: EretzIrAnswersMap = Object.fromEntries(
  CATEGORIES.map((c) => [c, ""])
);

export function EretzIrWritingPhase({
  room,
  myPlayerInRoom,
  isHost,
  letter,
  supabase,
}: EretzIrWritingPhaseProps) {
  const [answers, setAnswers] = useState<EretzIrAnswersMap>(() => ({ ...INITIAL_ANSWERS }));
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const category = CATEGORIES[currentCardIndex];
  const bgColor = CATEGORY_COLORS[currentCardIndex];
  const isLastCard = currentCardIndex === CATEGORIES.length - 1;

  const setAnswer = useCallback((cat: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [cat]: value }));
  }, []);

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      const { error } = await eretzIrAnswersApi.upsert(supabase, {
        room_id: room.id,
        player_id: myPlayerInRoom.id,
        answers,
      });
      if (error) throw error;
      setIsWaiting(true);
    } catch {
      setSubmitError("אופס, משהו השתבש. נסה שוב!");
    }
  };

  async function handleHostStop() {
    await roomsApi.updateGameState(supabase, room.id, {
      phase: "revealing",
      currentCategoryIndex: 0,
    });
  }

  if (isWaiting) {
    return (
      <div
        className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50 items-center justify-center gap-4 px-6"
        dir="rtl"
        lang="he"
      >
        <p className="text-xl font-medium text-foreground">ממתין לשאר...</p>
        {isHost && (
          <button
            type="button"
            onClick={handleHostStop}
            className="rounded-2xl bg-soft-pink px-6 py-3 font-bold text-white shadow-card active:scale-[0.98]"
          >
            עצור! עברו לתוצאות
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50"
      dir="rtl"
      lang="he"
    >
      {/* Sticky header */}
      <div className="flex-none p-4 bg-gray-50 border-b border-black/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-center text-xl font-bold text-foreground">
            האות: {letter}
          </h2>
          {isHost && (
            <button
              type="button"
              onClick={handleHostStop}
              className="rounded-xl bg-soft-pink px-4 py-2 font-bold text-white shadow-card active:scale-[0.98]"
            >
              עצור! עברו לתוצאות
            </button>
          )}
        </div>
      </div>

      {/* Flexible card area (middle) */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div
          className={`max-h-full w-full max-w-md aspect-square md:aspect-auto p-6 flex flex-col items-center justify-center rounded-2xl shadow-card ${bgColor}`}
        >
          <h3 className="mb-3 text-center text-2xl font-bold text-foreground shrink-0">
            {category}
          </h3>
          <input
            type="text"
            value={answers[category] ?? ""}
            onChange={(e) => setAnswer(category, e.target.value)}
            className="w-full min-h-0 max-h-[40vh] rounded-xl border-2 border-foreground/20 bg-white/90 px-4 py-3 text-lg text-foreground placeholder:text-foreground/50"
            placeholder={`כתוב ${category} שמתחיל/ה ב־${letter}...`}
            dir="rtl"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Sticky footer: nav buttons + progress rectangles */}
      <div className="flex-none bg-white p-4 pb-[env(safe-area-inset-bottom)] border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCurrentCardIndex((i) => Math.max(0, i - 1))}
            disabled={currentCardIndex === 0}
            className="flex-1 rounded-xl bg-white/90 py-3 font-bold text-foreground shadow-soft disabled:opacity-50 active:scale-[0.98]"
          >
            הקודם ←
          </button>
          {isLastCard ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-mint-green py-3 font-bold text-white shadow-card active:scale-[0.98]"
            >
              סיימתי! שלח תשובות
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentCardIndex((i) => i + 1)}
              className="flex-1 rounded-xl bg-playful-yellow py-3 font-bold text-foreground shadow-card active:scale-[0.98]"
            >
              הבא →
            </button>
          )}
        </div>
        {submitError && (
          <p className="mt-2 text-center text-soft-pink font-medium text-sm" role="alert">
            {submitError}
          </p>
        )}
        <div className="mt-3 flex gap-1">
          {CATEGORIES.map((cat, index) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCurrentCardIndex(index)}
              className={`h-2 flex-1 rounded-full mx-0.5 ${
                (answers[cat] ?? "").trim() ? "bg-green-400" : "bg-red-400"
              }`}
              title={cat}
              aria-label={`קטגוריה ${cat}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
