"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { GameId } from "@/types/database";
import type { GameVoteRow } from "@/types/database";
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
  /** Current selection round – votes are scoped to this round (no cross-round collision). */
  selectionRoundId?: string | null;
}

const GAMES: { id: GameId; label: string; icon: string }[] = [
  { id: "truth_or_lie", label: "אמת או שקר", icon: "🎭" },
  { id: "eretz_ir", label: "ארץ עיר", icon: "🏙️" },
  { id: "battleship", label: "צוללות", icon: "🚢" },
  { id: "mastermind", label: "בול פגיעה", icon: "🎯" },
];

const TRANSITION_DELAY_MS = 2000;

/** Group votes by game_id, return game ID with max count; on tie, pick random among tied. */
function getWinningGameId(votes: GameVoteRow[]): GameId {
  const counts = GAMES.reduce(
    (acc, g) => {
      acc[g.id] = votes.filter((v) => v.game_id === g.id).length;
      return acc;
    },
    {} as Record<GameId, number>
  );
  const maxCount = Math.max(...Object.values(counts));
  const tied = GAMES.filter((g) => counts[g.id] === maxCount);
  return tied[Math.floor(Math.random() * tied.length)]!.id;
}

function battleshipGridSize(playerCount: number): number {
  if (playerCount <= 3) return 5;
  if (playerCount <= 5) return 6;
  return 7;
}

function buildGameState(
  winningGame: GameId,
  players: PlayerRow[],
  newRoundId: string
):
  | { phase: "writing"; roundId: string }
  | { phase: "rolling"; roundId: string }
  | { phase: "hiding"; gridSize: number; roundId: string }
  | { phase: "setting"; setterId: string; roundId: string }
  | undefined {
  if (winningGame === "truth_or_lie") {
    return { phase: "writing", roundId: newRoundId };
  }
  if (winningGame === "eretz_ir") {
    return { phase: "rolling", roundId: newRoundId };
  }
  if (winningGame === "battleship") {
    return {
      phase: "hiding",
      gridSize: battleshipGridSize(players.length),
      roundId: newRoundId,
    };
  }
  if (winningGame === "mastermind") {
    const randomIndex = Math.floor(Math.random() * players.length);
    const setterId = players[randomIndex]?.id ?? players[0]!.id;
    return { phase: "setting", setterId, roundId: newRoundId };
  }
  return undefined;
}

export function GameSelectionView({
  room,
  players,
  isHost,
  myPlayerInRoom,
  supabase,
  selectionRoundId = null,
}: GameSelectionViewProps) {
  const localPlayerId = myPlayerInRoom.id;
  const { votes, myVote } = useGameVotes(room.id, localPlayerId, true, selectionRoundId);
  const [voting, setVoting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [transitionOverlay, setTransitionOverlay] = useState<{
    gameId: GameId;
    gameName: string;
  } | null>(null);
  const transitionTriggeredRef = useRef(false);
  const votesRef = useRef(votes);
  const playersRef = useRef(players);
  votesRef.current = votes;
  playersRef.current = players;

  const hasVoted = votes.some((v) => v.player_id === localPlayerId);
  const voteCount = useCallback(
    (gameId: GameId) => votes.filter((v) => v.game_id === gameId).length,
    [votes]
  );

  const everyoneVoted =
    players.length > 0 && votes.length > 0 && votes.length === players.length;

  // Host-only: when everyone has voted, show overlay then after delay update room.
  // Note: isHost is from parent (room.host_id === playerId from store); don't use myPlayerInRoom.id vs host_id.
  // Use refs for votes/players so effect doesn't re-run on their change and cancel the timeout.
  useEffect(() => {
    if (!isHost) return;
    if (!everyoneVoted || transitionTriggeredRef.current) return;

    transitionTriggeredRef.current = true;
    const currentVotes = votesRef.current;
    const currentPlayers = playersRef.current;
    const winningGameId = getWinningGameId(currentVotes);
    const gameName = GAMES.find((g) => g.id === winningGameId)?.label ?? winningGameId;

    setTransitionOverlay({ gameId: winningGameId, gameName });

    const timeoutId = window.setTimeout(async () => {
      setStartError(null);
      try {
        const newRoundId = crypto.randomUUID();
        const gameState = buildGameState(winningGameId, playersRef.current, newRoundId);
        const { error } = await roomsApi.updateStatusAndGame(
          supabase,
          room.id,
          "playing",
          winningGameId,
          gameState
        );
        if (error) {
          console.error("Auto-start game error:", error);
          setStartError("אופס, משהו השתבש. נסה שוב!");
          transitionTriggeredRef.current = false;
        }
      } catch {
        setStartError("אופס, משהו השתבש. נסה שוב!");
        transitionTriggeredRef.current = false;
      } finally {
        setTransitionOverlay(null);
      }
    }, TRANSITION_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isHost, room.id, everyoneVoted, supabase]);

  // Non-host: show same overlay when everyone voted (same winner computed for display).
  useEffect(() => {
    if (isHost) return;
    if (!everyoneVoted) return;
    if (transitionOverlay) return;

    const winningGameId = getWinningGameId(votes);
    const gameName = GAMES.find((g) => g.id === winningGameId)?.label ?? winningGameId;
    setTransitionOverlay({ gameId: winningGameId, gameName });

    const timeoutId = window.setTimeout(() => setTransitionOverlay(null), TRANSITION_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isHost, everyoneVoted, votes, transitionOverlay]);

  async function handleVote(gameId: GameId) {
    setVoting(true);
    setStartError(null);
    try {
      const row = {
        room_id: room.id,
        player_id: myPlayerInRoom.id,
        game_id: gameId,
        selection_round_id: selectionRoundId ?? room.id,
      };
      const { error } = await gameVotesApi.upsert(supabase, row);
      if (error) {
        console.error("Game vote upsert error:", error);
        throw error;
      }
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

  return (
    <div
      className="flex flex-col w-full min-h-full bg-gradient-to-b from-soft-pink/20 via-background to-sky-blue/20"
      dir="rtl"
      lang="he"
    >
      {/* Transition overlay: all players see it when everyone has voted */}
      {transitionOverlay && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sky-blue/95 text-white p-6"
          dir="rtl"
          lang="he"
          aria-live="polite"
        >
          <p className="text-2xl font-bold text-center mb-2">
            המשחק הנבחר הוא...
          </p>
          <p className="text-4xl font-bold text-center mb-4">
            {transitionOverlay.gameName}! 🎮
          </p>
          <p className="text-xl text-white/90">מכין את החדר... 🚀</p>
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        {/* Dynamic header */}
        {!hasVoted ? (
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center mt-4 mb-2 animate-pulse">
            איזה משחק נשחק? הצבע עכשיו! 👇
          </h1>
        ) : (
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center mt-4 mb-2">
            הצבעת! ממתינים לשאר... ⏳
          </h1>
        )}
        <p className="text-foreground/70 text-center mb-6">
          בחר את המשחק שהכי תרצה לשחק
        </p>

        {startError && (
          <p className="text-soft-pink font-medium text-center mb-4" role="alert">
            {startError}
          </p>
        )}

        <div className="flex flex-col gap-4 max-w-md w-full mx-auto flex-1">
          {GAMES.map((game) => {
            const gameVotes = votes.filter((v) => v.game_id === game.id);
            const isSelected = myVote?.game_id === game.id;
            const voters = gameVotes
              .map((v) => players.find((p) => p.id === v.player_id))
              .filter((p): p is PlayerRow => p != null);
            const showVotedHighlight = hasVoted && isSelected;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => handleVote(game.id)}
                disabled={voting}
                className={`
                  w-full rounded-2xl p-6 flex flex-col items-stretch gap-0
                  text-right transition shadow-soft active:scale-[0.98] disabled:opacity-60
                  ${showVotedHighlight ? "ring-4 ring-green-400 bg-mint-green/20" : ""}
                  ${!showVotedHighlight && isSelected ? "ring-4 ring-playful-yellow bg-playful-yellow/30" : ""}
                  ${!showVotedHighlight && !isSelected ? "bg-white/90 hover:bg-white" : ""}
                `}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-5xl" aria-hidden>
                    {game.icon}
                  </span>
                  <p className="flex-1 min-w-0 font-bold text-xl text-foreground">
                    {game.label}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  {voters.length === 0 ? (
                    <span className="text-sm text-gray-400">עדיין אין הצבעות</span>
                  ) : (
                    voters.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        <span aria-hidden>{player.avatar}</span>
                        <span>{player.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Voting status: who voted, who we're waiting for */}
        <section
          className="mt-6 pt-4 border-t border-foreground/10"
          aria-label="סטטוס הצבעות"
        >
          <p className="text-sm font-medium text-foreground/80 mb-3 text-center">
            סטטוס הצבעות:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {players.map((player) => {
              const voted = votes.some((v) => v.player_id === player.id);
              return (
                <div
                  key={player.id}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    ${voted ? "bg-mint-green/20 opacity-100" : "opacity-50 grayscale"}
                  `}
                >
                  <span className="text-lg" aria-hidden>
                    {player.avatar}
                  </span>
                  <span className="text-foreground/90">{player.name}</span>
                  <span aria-hidden>{voted ? "✅" : "⏳"}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
