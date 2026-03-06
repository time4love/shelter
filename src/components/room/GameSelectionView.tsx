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
  { id: "the_imposter", label: "המתחזה", icon: "🕵️‍♂️" },
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
      if (error) throw error;
    } catch {
      setStartError("אופס, משהו השתבש. נסה שוב!");
    } finally {
      setVoting(false);
    }
  }

  function getWinningGameId(): GameId {
    const truth = voteCount("truth_or_lie");
    const imposter = voteCount("the_imposter");
    if (imposter > truth) return "the_imposter";
    return "truth_or_lie";
  }

  async function handleHostStart() {
    setStartError(null);
    setStarting(true);
    try {
      const winningGame = getWinningGameId();
      const { error } = await roomsApi.updateStatusAndGame(
        supabase,
        room.id,
        "playing",
        winningGame
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
      className="min-h-screen bg-gradient-to-b from-soft-pink/20 via-background to-sky-blue/20 flex flex-col p-6"
      dir="rtl"
      lang="he"
    >
      <h1 className="text-3xl font-bold text-foreground text-center mt-4 mb-2">
        איזה משחק נשחק עכשיו?
      </h1>
      <p className="text-foreground/70 text-center mb-6">בחר משחק והצבע להצבעה</p>

      {startError && (
        <p className="text-soft-pink font-medium text-center mb-4" role="alert">
          {startError}
        </p>
      )}

      <div className="flex-1 flex flex-col gap-4 max-w-md w-full mx-auto">
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

      {isHost && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-foreground/80 font-medium">
            סה״כ הצבעות: {totalVotes} מתוך {totalPlayers} שחקנים
          </p>
          <button
            type="button"
            onClick={handleHostStart}
            disabled={starting}
            className="w-full max-w-xs py-4 rounded-2xl bg-mint-green text-white font-bold text-xl shadow-card hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
          >
            {starting ? "מתחיל..." : "בחר את המשחק המנצח והתחל!"}
          </button>
        </div>
      )}
    </div>
  );
}
