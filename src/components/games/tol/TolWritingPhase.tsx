"use client";

import { useState } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TolStatementItem } from "@/types/database";
import { useTolStatements } from "@/hooks/useTolStatements";
import { tolStatements as tolStatementsApi } from "@/lib/supabase/typed-mutations";

export interface TolWritingPhaseProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
  roundId: string;
  onStartGame: () => void;
}

const PLACEHOLDERS = [
  "משפט ראשון...",
  "משפט שני...",
  "משפט שלישי...",
  "משפט רביעי...",
];

export function TolWritingPhase({
  room,
  players,
  myPlayerInRoom,
  isHost,
  supabase,
  roundId,
  onStartGame,
}: TolWritingPhaseProps) {
  const allStatements = useTolStatements(room.id, roundId, true);
  const [texts, setTexts] = useState<string[]>(["", "", "", ""]);
  const [truthIndex, setTruthIndex] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const myStatement = allStatements.find((s) => s.player_id === myPlayerInRoom.id);
  const countSubmitted = allStatements.length;
  const everyoneSubmitted = countSubmitted >= players.length;

  const handleSubmit = async () => {
    const hasEmpty = texts.some((t) => !t.trim());
    if (hasEmpty) {
      setError("כתוב ארבעה משפטים");
      return;
    }
    const truthCount = texts.map((_, i) => (i === truthIndex ? 1 : 0)).reduce<number>((a, b) => a + b, 0);
    if (truthCount !== 1) {
      setError("בחר משפט אחד שהוא האמת");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const statements: TolStatementItem[] = texts.map((text, i) => ({
        text: text.trim(),
        isTruth: i === truthIndex,
      }));
      const { error: err } = await tolStatementsApi.insert(supabase, {
        room_id: room.id,
        round_id: roundId,
        player_id: myPlayerInRoom.id,
        statements,
      });
      if (err) throw err;
      setSubmitted(true);
    } catch {
      setError("אופס, משהו השתבש. נסה שוב!");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted || myStatement) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6" dir="rtl" lang="he">
        <p className="text-xl text-foreground/90 mb-4">מחכים לשאר השחקנים...</p>
        <p className="text-foreground/70 mb-6">
          {countSubmitted} מתוך {players.length} הגישו
        </p>
        {isHost && everyoneSubmitted && (
          <button
            type="button"
            onClick={onStartGame}
            className="w-full max-w-xs py-4 rounded-2xl bg-mint-green text-white font-bold text-xl shadow-card hover:opacity-95 active:scale-[0.98]"
          >
            התחל משחק
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 flex flex-col gap-6" dir="rtl" lang="he">
      <h2 className="text-2xl font-bold text-foreground text-center">
        כתוב ארבעה משפטים – אחד אמת ושלושה שקר
      </h2>
      {error && (
        <p className="text-soft-pink font-medium text-center" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="truth"
                id={`truth-${i}`}
                checked={truthIndex === i}
                onChange={() => setTruthIndex(i)}
                className="w-5 h-5 accent-mint-green"
              />
              <label htmlFor={`truth-${i}`} className="text-sm text-foreground/80">
                זה האמת
              </label>
            </div>
            <input
              type="text"
              value={texts[i]}
              onChange={(e) => setTexts((prev) => [...prev.slice(0, i), e.target.value, ...prev.slice(i + 1)])}
              placeholder={PLACEHOLDERS[i]}
              className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-foreground placeholder:text-foreground/50"
              maxLength={200}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 rounded-2xl bg-playful-yellow text-foreground font-bold text-xl shadow-soft hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
      >
        {submitting ? "שולח..." : "שלח"}
      </button>
    </div>
  );
}
