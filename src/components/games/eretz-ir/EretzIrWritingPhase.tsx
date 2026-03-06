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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6" dir="rtl" lang="he">
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
    <div className="flex min-h-0 flex-1 flex-col px-4" dir="rtl" lang="he">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-background to-transparent pb-2 pt-2">
        <h2 className="text-center text-xl font-bold text-foreground">
          האות: {letter}
        </h2>
      </div>

      {/* Card */}
      <div
        className={`flex flex-1 flex-col rounded-2xl p-6 shadow-card ${bgColor} min-h-[200px] justify-center`}
      >
        <h3 className="mb-4 text-center text-2xl font-bold text-foreground">
          {category}
        </h3>
        <input
          type="text"
          value={answers[category] ?? ""}
          onChange={(e) => setAnswer(category, e.target.value)}
          className="w-full rounded-xl border-2 border-foreground/20 bg-white/90 px-4 py-3 text-lg text-foreground placeholder:text-foreground/50"
          placeholder={`כתוב ${category} שמתחיל/ה ב־${letter}...`}
          dir="rtl"
          autoComplete="off"
        />
      </div>

      {/* Navigation */}
      <div className="mt-4 flex gap-3">
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
        <p className="mt-2 text-center text-soft-pink font-medium" role="alert">
          {submitError}
        </p>
      )}

      {/* Progress indicators */}
      <div className="mt-6 flex gap-1">
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

      {/* Host: sticky stop button */}
      {isHost && (
        <div className="sticky bottom-0 mt-4 bg-background/95 py-2">
          <button
            type="button"
            onClick={handleHostStop}
            className="w-full rounded-xl bg-soft-pink py-3 font-bold text-white shadow-card active:scale-[0.98]"
          >
            עצור! עברו לתוצאות
          </button>
        </div>
      )}
    </div>
  );
}
