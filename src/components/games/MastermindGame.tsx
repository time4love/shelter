"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { RoomRow, PlayerRow, MastermindGuessRow } from "@/types/database";
import type { GameStateMastermind, MastermindColorName } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  rooms as roomsApi,
  mastermindCodes,
  mastermindGuesses,
  players as playersApi,
  gameVotes as gameVotesApi,
} from "@/lib/supabase/typed-mutations";

const MASTERMIND_COLORS: { name: MastermindColorName; class: string }[] = [
  { name: "red", class: "bg-red-500" },
  { name: "blue", class: "bg-blue-500" },
  { name: "green", class: "bg-green-500" },
  { name: "yellow", class: "bg-yellow-400" },
  { name: "orange", class: "bg-orange-500" },
  { name: "purple", class: "bg-purple-500" },
];

function parseGameState(room: RoomRow): GameStateMastermind | null {
  const g = room.game_state;
  if (g == null || typeof g !== "object") return null;
  const o = g as Record<string, unknown>;
  const roundId = typeof o.roundId === "string" ? o.roundId : undefined;
  if (o.phase === "setting" && typeof o.setterId === "string") {
    return { phase: "setting", setterId: o.setterId, roundId };
  }
  if (
    o.phase === "playing" &&
    typeof o.setterId === "string" &&
    typeof o.currentTurnId === "string" &&
    Array.isArray(o.guessersQueue)
  ) {
    return {
      phase: "playing",
      setterId: o.setterId,
      currentTurnId: o.currentTurnId,
      guessersQueue: o.guessersQueue as string[],
      roundId,
    };
  }
  if (o.phase === "round_results" && typeof o.setterId === "string") {
    return {
      phase: "round_results",
      setterId: o.setterId,
      winnerId: typeof o.winnerId === "string" ? o.winnerId : o.winnerId === null ? null : undefined,
      roundId,
    };
  }
  return null;
}

/** Compute bulls (exact) and hits (color right, position wrong); each secret peg used at most once. */
function computeBullsAndHits(secret: string[], guess: string[]): { bulls: number; hits: number } {
  const n = 4;
  const usedSecret = new Array(n).fill(false);
  const usedGuess = new Array(n).fill(false);
  let bulls = 0;
  for (let i = 0; i < n; i++) {
    if (secret[i] === guess[i]) {
      bulls++;
      usedSecret[i] = true;
      usedGuess[i] = true;
    }
  }
  let hits = 0;
  for (let gi = 0; gi < n; gi++) {
    if (usedGuess[gi]) continue;
    for (let si = 0; si < n; si++) {
      if (usedSecret[si]) continue;
      if (secret[si] === guess[gi]) {
        hits++;
        usedSecret[si] = true;
        usedGuess[gi] = true;
        break;
      }
    }
  }
  return { bulls, hits };
}

export interface MastermindGameProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

export function MastermindGame({
  room,
  players,
  myPlayerInRoom,
  isHost,
  supabase,
}: MastermindGameProps) {
  const rawState = parseGameState(room);

  useEffect(() => {
    if (room.current_game !== "mastermind" || !isHost || rawState !== null || players.length === 0) return;
    const roundId = (room.game_state as Record<string, unknown>)?.roundId as string | undefined;
    const randomIndex = Math.floor(Math.random() * players.length);
    const setterId = players[randomIndex]?.id ?? players[0]!.id;
    roomsApi.updateGameState(supabase, room.id, { phase: "setting", setterId, roundId });
  }, [room.current_game, room.id, room.game_state, isHost, players, rawState, supabase]);

  const gameState = rawState ?? { phase: "setting" as const, setterId: players[0]?.id ?? "" };

  return (
    <div
      className="flex min-h-screen flex-col bg-gradient-to-b from-soft-pink/20 via-background to-sky-blue/20 pt-6 pb-12"
      dir="rtl"
      lang="he"
    >
      <h1 className="mb-2 px-4 text-center text-2xl font-bold text-foreground">
        בול פגיעה 🎯
      </h1>

      {gameState.phase === "setting" && gameState.roundId && (
        <MastermindSettingPhase
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          setterId={gameState.setterId}
          roundId={gameState.roundId}
          supabase={supabase}
        />
      )}

      {gameState.phase === "playing" && gameState.roundId && (
        <MastermindPlayingPhase
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          gameState={gameState}
          roundId={gameState.roundId}
          supabase={supabase}
        />
      )}

      {gameState.phase === "round_results" && (
        <MastermindRoundResults
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          setterId={gameState.setterId}
          winnerId={gameState.winnerId ?? null}
          roundId={gameState.roundId}
          supabase={supabase}
        />
      )}
    </div>
  );
}

// --- Setting phase: setter picks 4 colors, others wait ---
interface MastermindSettingPhaseProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  setterId: string;
  roundId: string;
  supabase: SupabaseClient<Database>;
}

function MastermindSettingPhase({
  room,
  players,
  myPlayerInRoom,
  setterId,
  roundId,
  supabase,
}: MastermindSettingPhaseProps) {
  const [code, setCode] = useState<MastermindColorName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setter = players.find((p) => p.id === setterId);
  const isSetter = myPlayerInRoom.id === setterId;
  const guessersQueue = players.filter((p) => p.id !== setterId).map((p) => p.id);

  const addColor = (name: MastermindColorName) => {
    if (code.length >= 4) return;
    setCode((prev) => [...prev, name]);
  };

  const clearSlot = (index: number) => {
    setCode((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCode = async () => {
    if (code.length !== 4) return;
    setError(null);
    setLoading(true);
    try {
      const { error: insertErr } = await mastermindCodes.insert(supabase, {
        room_id: room.id,
        setter_id: setterId,
        round_id: roundId,
        code: [...code],
      });
      if (insertErr) throw insertErr;
      await roomsApi.updateGameState(supabase, room.id, {
        phase: "playing",
        setterId,
        currentTurnId: guessersQueue[0] ?? setterId,
        guessersQueue,
        roundId,
      });
    } catch {
      setError("אופס, משהו השתבש. נסה שוב!");
    } finally {
      setLoading(false);
    }
  };

  if (!isSetter) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6" dir="rtl" lang="he">
        <p className="text-center text-lg text-foreground/90">
          ממתינים ש{setter ? (
            <>
              {setter.name} <span aria-hidden>{setter.avatar}</span>
            </>
          ) : (
            "המגדיר"
          )}{" "}
          יבחר קוד סודי...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-4" dir="rtl" lang="he">
      <p className="text-center text-foreground/80">בחר 4 צבעים (אפשר כפילויות)</p>
      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => code[i] && clearSlot(i)}
            className="h-12 w-12 rounded-full border-2 border-dashed border-foreground/30 bg-white/80 shadow-soft"
            aria-label={code[i] ? `נקה צבע ${i + 1}` : "ריק"}
          >
            {code[i] && (
              <span
                className={`block h-full w-full rounded-full ${MASTERMIND_COLORS.find((c) => c.name === code[i])?.class ?? "bg-gray-400"}`}
              />
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {MASTERMIND_COLORS.map(({ name, class: cls }) => (
          <button
            key={name}
            type="button"
            onClick={() => addColor(name)}
            disabled={code.length >= 4}
            className={`h-10 w-10 rounded-full ${cls} shadow-soft disabled:opacity-50`}
            aria-label={name}
          />
        ))}
      </div>
      {error && <p className="text-center font-medium text-soft-pink" role="alert">{error}</p>}
      <button
        type="button"
        onClick={handleSetCode}
        disabled={code.length !== 4 || loading}
        className="w-full rounded-2xl bg-mint-green py-4 text-xl font-bold text-white shadow-card disabled:opacity-60"
      >
        {loading ? "שומר..." : "הצפן קוד!"}
      </button>
    </div>
  );
}

// --- Playing phase: history + current turn guess UI ---
interface MastermindPlayingPhaseProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  gameState: Extract<GameStateMastermind, { phase: "playing" }>;
  roundId: string;
  supabase: SupabaseClient<Database>;
}

function MastermindPlayingPhase({
  room,
  players,
  myPlayerInRoom,
  isHost,
  gameState,
  roundId,
  supabase,
}: MastermindPlayingPhaseProps) {
  const [guesses, setGuesses] = useState<MastermindGuessRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setterId, currentTurnId, guessersQueue } = gameState;
  const currentGuesser = players.find((p) => p.id === currentTurnId);
  const isMyTurn = currentTurnId === myPlayerInRoom.id && myPlayerInRoom.id !== setterId;

  const fetchGuesses = useCallback(async () => {
    const { data } = await mastermindGuesses.fetchByRoomId(supabase, room.id, roundId);
    setGuesses((data ?? []) as MastermindGuessRow[]);
  }, [room.id, roundId, supabase]);

  useEffect(() => {
    fetchGuesses();
    const ch = supabase
      .channel(`mastermind_guesses_${room.id}_${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mastermind_guesses", filter: `round_id=eq.${roundId}` },
        (payload) => {
          const row = payload.new as { room_id?: string; round_id?: string };
          if (row?.room_id === room.id && row?.round_id === roundId) fetchGuesses();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [room.id, roundId, supabase, fetchGuesses]);

  const lastProcessedCountRef = useRef<number>(-1);
  const initialSyncRef = useRef(false);
  useEffect(() => {
    if (!isHost) return;
    if (!initialSyncRef.current) {
      initialSyncRef.current = true;
      lastProcessedCountRef.current = guesses.length;
      return;
    }
    if (guesses.length <= lastProcessedCountRef.current) return;
    lastProcessedCountRef.current = guesses.length;
    const runHostLogic = async () => {
      const { data: codeRow } = await mastermindCodes.fetchByRoomId(supabase, room.id, roundId);
      const secretCode = (codeRow as { code?: string[] } | null)?.code;
      if (!secretCode || secretCode.length !== 4) return;
      const { data: list } = await mastermindGuesses.fetchByRoomId(supabase, room.id, roundId);
      const allGuesses = (list ?? []) as MastermindGuessRow[];
      const lastGuess = allGuesses[allGuesses.length - 1];
      if (!lastGuess) return;
      if (lastGuess.bulls === 4) {
        const guesser = players.find((p) => p.id === lastGuess.guesser_id);
        if (guesser) await playersApi.update(supabase, lastGuess.guesser_id, { score: guesser.score + 20 });
        const setter = players.find((p) => p.id === setterId);
        if (setter) await playersApi.update(supabase, setterId, { score: setter.score + 5 });
        await roomsApi.updateGameState(supabase, room.id, {
          phase: "round_results",
          setterId,
          winnerId: lastGuess.guesser_id,
          roundId,
        });
      } else {
        const idx = guessersQueue.indexOf(lastGuess.guesser_id);
        const nextIdx = idx + 1;
        const nextId = nextIdx < guessersQueue.length ? guessersQueue[nextIdx] : guessersQueue[0];
        await roomsApi.updateGameState(supabase, room.id, {
          phase: "playing",
          setterId,
          currentTurnId: nextId,
          guessersQueue,
          roundId,
        });
      }
    };
    runHostLogic();
  }, [isHost, guesses.length, room.id, roundId, supabase, setterId, guessersQueue, players]);

  return (
    <div className="flex flex-1 flex-col gap-4 px-4" dir="rtl" lang="he">
      <p className="text-center text-lg font-bold text-foreground">
        תורו של {currentGuesser ? (
          <>
            {currentGuesser.name} <span aria-hidden>{currentGuesser.avatar}</span>
          </>
        ) : (
          "..."
        )}
      </p>

      <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl bg-white/80 p-4 shadow-soft">
        {guesses.length === 0 && (
          <p className="text-center text-foreground/70 py-4">עדיין אין ניחושים. תור ראשון מתחיל!</p>
        )}
        {guesses.map((g) => {
          const guesser = players.find((p) => p.id === g.guesser_id);
          return (
            <div
              key={g.id}
              className="flex items-center gap-3 py-2 border-b border-foreground/10 last:border-0"
            >
              <span className="text-2xl" aria-hidden>{guesser?.avatar ?? "?"}</span>
              <div className="flex gap-1">
                {(g.guess as string[]).map((colorName, i) => (
                  <span
                    key={i}
                    className={`block h-8 w-8 rounded-full ${MASTERMIND_COLORS.find((c) => c.name === colorName)?.class ?? "bg-gray-400"}`}
                    aria-hidden
                  />
                ))}
              </div>
              <span className="mr-auto text-sm font-medium">
                {g.bulls} 🎯 | {g.hits} ⚪
              </span>
            </div>
          );
        })}
      </div>

      {isMyTurn && (
        <MastermindGuessInput
          onSubmit={async (guess) => {
            setError(null);
            setSubmitting(true);
            try {
              const { data: codeRow } = await mastermindCodes.fetchByRoomId(supabase, room.id, roundId);
              const secret = (codeRow as { code?: string[] } | null)?.code;
              if (!secret || secret.length !== 4) {
                setError("הקוד עדיין לא הוגדר. נסה שוב.");
                return;
              }
              const { bulls, hits } = computeBullsAndHits(secret, guess);
              const { error: insertErr } = await mastermindGuesses.insert(supabase, {
                room_id: room.id,
                guesser_id: myPlayerInRoom.id,
                round_id: roundId,
                guess: [...guess],
                bulls,
                hits,
              });
              if (insertErr) throw insertErr;
              await fetchGuesses();
            } catch {
              setError("אופס, משהו השתבש. נסה שוב!");
            } finally {
              setSubmitting(false);
            }
          }}
          submitting={submitting}
          error={error}
        />
      )}
    </div>
  );
}

// --- Guess input: 4 pegs + palette, submit when full ---
interface MastermindGuessInputProps {
  onSubmit: (guess: MastermindColorName[]) => void;
  submitting: boolean;
  error: string | null;
}

function MastermindGuessInput({ onSubmit, submitting, error }: MastermindGuessInputProps) {
  const [code, setCode] = useState<MastermindColorName[]>([]);

  const addColor = (name: MastermindColorName) => {
    if (code.length >= 4) return;
    setCode((prev) => [...prev, name]);
  };

  const clearSlot = (index: number) => {
    setCode((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (code.length !== 4) return;
    onSubmit(code);
    setCode([]);
  };

  return (
    <div className="sticky bottom-0 rounded-2xl bg-white p-4 shadow-lg border border-foreground/10">
      <p className="text-center text-foreground/80 text-sm mb-2">הניחוש שלך</p>
      <div className="flex justify-center gap-2 mb-3">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => code[i] && clearSlot(i)}
            className="h-12 w-12 rounded-full border-2 border-dashed border-foreground/30 bg-white"
            aria-label={code[i] ? `נקה ${i + 1}` : "ריק"}
          >
            {code[i] && (
              <span
                className={`block h-full w-full rounded-full ${MASTERMIND_COLORS.find((c) => c.name === code[i])?.class ?? "bg-gray-400"}`}
              />
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2 mb-3">
        {MASTERMIND_COLORS.map(({ name, class: cls }) => (
          <button
            key={name}
            type="button"
            onClick={() => addColor(name)}
            disabled={code.length >= 4}
            className={`h-10 w-10 rounded-full ${cls} shadow-soft disabled:opacity-50`}
            aria-label={name}
          />
        ))}
      </div>
      {error && <p className="text-center text-soft-pink text-sm mb-2" role="alert">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={code.length !== 4 || submitting}
        className="w-full rounded-2xl bg-playful-yellow py-3 text-lg font-bold text-foreground shadow-soft disabled:opacity-60"
      >
        {submitting ? "שולח..." : "נחש!"}
      </button>
    </div>
  );
}

// --- Round results: reveal code, winner, host back button ---
interface MastermindRoundResultsProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  setterId: string;
  winnerId: string | null;
  roundId?: string;
  supabase: SupabaseClient<Database>;
}

function MastermindRoundResults({
  room,
  players,
  isHost,
  setterId,
  winnerId,
  roundId,
  supabase,
}: MastermindRoundResultsProps) {
  const [secretCode, setSecretCode] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const winner = winnerId ? players.find((p) => p.id === winnerId) : null;

  useEffect(() => {
    if (!roundId) return;
    let cancelled = false;
    (async () => {
      const { data } = await mastermindCodes.fetchByRoomId(supabase, room.id, roundId);
      if (!cancelled && data) setSecretCode((data as { code: string[] }).code);
    })();
    return () => { cancelled = true; };
  }, [room.id, roundId, supabase]);

  const handleBackToSelection = async () => {
    if (!isHost) return;
    setError(null);
    setLoading(true);
    try {
      await gameVotesApi.deleteByRoomId(supabase, room.id);
      const { error: errRoom } = await roomsApi.updateToGameSelection(supabase, room.id);
      if (errRoom) throw errRoom;
    } catch {
      setError("אופס, משהו השתבש. נסה שוב!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6" dir="rtl" lang="he">
      <h2 className="text-center text-2xl font-bold text-foreground">הקוד הנסתר</h2>
      <div className="flex justify-center gap-3">
        {(secretCode ?? []).map((colorName, i) => (
          <span
            key={i}
            className={`block h-14 w-14 rounded-full ${MASTERMIND_COLORS.find((c) => c.name === colorName)?.class ?? "bg-gray-400"} shadow-soft`}
            aria-hidden
          />
        ))}
      </div>
      <div className="rounded-2xl bg-playful-yellow/30 p-6 text-center shadow-soft">
        <p className="text-lg text-foreground/80">
          הקוד נפרץ על ידי {winner ? (
            <>
              {winner.name} <span aria-hidden>{winner.avatar}</span>
            </>
          ) : (
            "..."
          )}!
        </p>
      </div>
      {error && <p className="text-center font-medium text-soft-pink" role="alert">{error}</p>}
      {isHost && (
        <button
          type="button"
          onClick={handleBackToSelection}
          disabled={loading}
          className="w-full rounded-2xl bg-mint-green py-4 text-xl font-bold text-white shadow-card disabled:opacity-60"
        >
          {loading ? "מעביר..." : "חזור לבחירת משחקים"}
        </button>
      )}
    </div>
  );
}
