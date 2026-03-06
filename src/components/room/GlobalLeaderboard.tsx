"use client";

import { useState } from "react";
import type { PlayerRow } from "@/types/database";
import { Trophy, X } from "lucide-react";

export interface GlobalLeaderboardProps {
  players: PlayerRow[];
}

/**
 * Floating Action Button that opens a modal with the current room leaderboard
 * (players sorted by score). Accessible from Lobby, Game Selection, and during games.
 */
export function GlobalLeaderboard({ players }: GlobalLeaderboardProps) {
  const [open, setOpen] = useState(false);

  const sortedByScore = [...players].sort((a, b) => b.score - a.score);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 start-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-playful-yellow text-white shadow-card transition hover:opacity-95 active:scale-95 focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-offset-2"
        aria-label="הצג טבלת ליגה"
        dir="rtl"
        lang="he"
      >
        <Trophy className="h-7 w-7" strokeWidth={2} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          dir="rtl"
          lang="he"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leaderboard-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-b from-soft-pink/30 to-sky-blue/30 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-foreground/10 bg-white/90 px-4 py-3 flex items-center justify-between">
              <h2
                id="leaderboard-title"
                className="text-xl font-bold text-foreground flex items-center gap-2"
              >
                <Trophy className="h-6 w-6 text-playful-yellow" />
                טבלת ליגה
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-foreground/70 hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-mint-green"
                aria-label="סגור"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-4rem)] p-4">
              {sortedByScore.length === 0 ? (
                <p className="text-center text-foreground/70 py-6">אין עדיין שחקנים בטבלה.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {sortedByScore.map((p, i) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-4 rounded-2xl bg-white/90 shadow-soft px-4 py-3"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-playful-yellow/30 text-lg font-bold text-foreground"
                        aria-hidden
                      >
                        #{i + 1}
                      </span>
                      <span className="text-2xl" aria-hidden>
                        {p.avatar}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{p.name}</p>
                        <p className="text-foreground/70 text-sm">{p.score} נקודות</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
