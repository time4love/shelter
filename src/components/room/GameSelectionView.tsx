"use client";

import { useState } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { GameId } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { useGameVotes } from "@/hooks/useGameVotes";
import { gameVotes as gameVotesApi, rooms as roomsApi } from "@/lib/supabase/typed-mutations";

export interface GameSelectionViewProps {
  room: RoomRow;
  players: PlayerRow[];
  isHost: boolean;
  myPlayerInRoom: PlayerRow;
  supabase: SupabaseClient<Database>;
}

const GAMES: { id: GameId; label: string; icon: string }[] = [
  { id: "truth_or_lie", label: "אמת או שקר", icon: "🎭" },
  { id: "eretz_ir", label: "ארץ עיר", icon: "🌍" },
  { id: "battleship", label: "צוללות", icon: "🚢" },
  { id: "mastermind", label: "בול פגיעה", icon: "🎯" },
];

export function GameSelectionView({
  room,
  players,
  isHost,
  myPlayerInRoom,
  supabase,
}: GameSelectionViewProps) {
  const { votes, myVote } = useGameVotes(room.id, myPlayerInRoom.id, true);
  const [voting, setVoting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const voteCount = (gameId: GameId) =>
    votes.filter((v) => v.game_id === gameId).length;

  async function handleVote(gameId: GameId) {
    setVoting(true);
    setStartError(null);
    try {
      const { error } = await gameVotesApi.upsert(supabase, {
        room_id: room.id,
        player_id: myPlayerInRoom.id,
        game_id: gameId,
      });
      if (error) {
        console.error("Game vote upsert error:", error);
        throw error;
      }
      // Vote saved; Realtime will update counts (or we already have data from .select())
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "אופס, משהו השתבש. נסה שוב!";
      setStartError(message);
    } finally {
      setVoting(false);
    }
  }

  function getWinningGameId(): GameId {
    const truth = voteCount("truth_or_lie");
    const eretzIr = voteCount("eretz_ir");
    const battleship = voteCount("battleship");
    const mastermind = voteCount("mastermind");
    const max = Math.max(truth, eretzIr, battleship, mastermind);
    if (mastermind === max) return "mastermind";
    if (battleship === max) return "battleship";
    if (eretzIr === max) return "eretz_ir";
    return "truth_or_lie";
  }

  function battleshipGridSize(playerCount: number): number {
    if (playerCount <= 3) return 5;
    if (playerCount <= 5) return 6;
    return 7;
  }

  async function handleHostStart() {
    setStartError(null);
    setStarting(true);
    try {
      const winningGame = getWinningGameId();
      let gameState:
        | { phase: "writing" }
        | { phase: "rolling" }
        | { phase: "hiding"; gridSize: number }
        | { phase: "setting"; setterId: string }
        | undefined;
      if (winningGame === "truth_or_lie") {
        gameState = { phase: "writing" };
      } else if (winningGame === "eretz_ir") {
        gameState = { phase: "rolling" };
      } else if (winningGame === "battleship") {
        gameState = { phase: "hiding", gridSize: battleshipGridSize(players.length) };
      } else if (winningGame === "mastermind") {
        const randomIndex = Math.floor(Math.random() * players.length);
        const setterId = players[randomIndex]?.id ?? players[0]!.id;
        gameState = { phase: "setting", setterId };
      }
      const { error } = await roomsApi.updateStatusAndGame(
        supabase,
        room.id,
        "playing",
        winningGame,
        gameState
      );
      if (error) throw error;
    } catch {
      setStartError("אופס, משהו השתבש. נסה שוב!");
    } finally {
      setStarting(false);
    }
  }

  const totalVotes = votes.length;
  const totalPlayers = players.length;

  return (
    <div
      className="flex flex-col w-full bg-gradient-to-b from-soft-pink/20 via-background to-sky-blue/20"
      dir="rtl"
      lang="he"
    >
      <div className="p-4">
        <h1 className="text-3xl font-bold text-foreground text-center mt-4 mb-2">
          איזה משחק נשחק עכשיו?
        </h1>
        <p className="text-foreground/70 text-center mb-6">בחר משחק והצבע להצבעה</p>

        {startError && (
          <p className="text-soft-pink font-medium text-center mb-4" role="alert">
            {startError}
          </p>
        )}

        <div className="flex flex-col gap-4 max-w-md w-full mx-auto">
          {GAMES.map((game) => {
            const count = voteCount(game.id);
            const isSelected = myVote?.game_id === game.id;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => handleVote(game.id)}
                disabled={voting}
                className={`
                  w-full rounded-2xl p-6 flex items-center justify-between gap-4
                  text-right transition shadow-soft active:scale-[0.98] disabled:opacity-60
                  ${isSelected ? "ring-4 ring-playful-yellow bg-playful-yellow/30" : "bg-white/90 hover:bg-white"}
                `}
              >
                <span className="text-5xl" aria-hidden>
                  {game.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xl text-foreground">{game.label}</p>
                  <p className="text-foreground/70 text-sm mt-1">
                    {count} {count === 1 ? "הצבעה" : "הצבעות"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {isHost && (
        <div className="bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t shadow-md rounded-t-2xl">
          <p className="text-foreground/80 font-medium text-center mb-3">
            סה״כ הצבעות: {totalVotes} מתוך {totalPlayers} שחקנים
          </p>
          <button
            type="button"
            onClick={handleHostStart}
            disabled={starting}
            className="w-full max-w-xs py-4 rounded-2xl bg-mint-green text-white font-bold text-xl shadow-card hover:opacity-95 active:scale-[0.98] disabled:opacity-60 mx-auto block"
          >
            {starting ? "מתחיל..." : "בחר את המשחק המנצח והתחל!"}
          </button>
        </div>
      )}
    </div>
  );
}
