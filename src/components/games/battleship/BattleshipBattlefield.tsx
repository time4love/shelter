"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RoomRow, PlayerRow, BattleshipBoardRow, BattleshipShotRow } from "@/types/database";
import type { GameStateBattleship } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi, battleshipBoards, battleshipShots, players as playersApi } from "@/lib/supabase/typed-mutations";
import { BOARD_SIZE, TOTAL_SHIP_CELLS } from "./constants";
import { BattleshipBoard } from "./BattleshipBoard";
import type { CellState } from "./BattleshipBoard";

export interface BattleshipBattlefieldProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  gameState: Extract<GameStateBattleship, { phase: "playing" }>;
  roundId: string;
  supabase: SupabaseClient<Database>;
}

export function BattleshipBattlefield({
  room,
  players,
  myPlayerInRoom,
  isHost,
  gameState,
  roundId,
  supabase,
}: BattleshipBattlefieldProps) {
  const [boards, setBoards] = useState<BattleshipBoardRow[]>([]);
  const [shots, setShots] = useState<BattleshipShotRow[]>([]);
  const [shooting, setShooting] = useState(false);
  const shootingRef = useRef(false);
  const { currentTurnId, targetQueue, currentTargetId, alivePlayers } = gameState;
  const isMyTurn = currentTurnId === myPlayerInRoom.id;

  const fetchBoards = useCallback(async () => {
    const { data } = await battleshipBoards.fetchByRoomId(supabase, room.id, roundId);
    setBoards((data ?? []) as BattleshipBoardRow[]);
  }, [room.id, roundId, supabase]);

  const fetchShots = useCallback(async () => {
    const { data } = await battleshipShots.fetchByRoomId(supabase, room.id, roundId);
    setShots((data ?? []) as BattleshipShotRow[]);
  }, [room.id, roundId, supabase]);

  useEffect(() => {
    fetchBoards();
    fetchShots();
    const chBoards = supabase
      .channel(`battleship_boards_${room.id}_${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battleship_boards", filter: `round_id=eq.${roundId}` },
        (payload) => {
          const row = payload.new as { room_id?: string; round_id?: string };
          if (row?.room_id === room.id && row?.round_id === roundId) fetchBoards();
        }
      )
      .subscribe();
    const chShots = supabase
      .channel(`battleship_shots_${room.id}_${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battleship_shots", filter: `round_id=eq.${roundId}` },
        (payload) => {
          const row = payload.new as { room_id?: string; round_id?: string };
          if (row?.room_id === room.id && row?.round_id === roundId) fetchShots();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(chBoards);
      supabase.removeChannel(chShots);
    };
  }, [room.id, roundId, supabase, fetchBoards, fetchShots]);

  // After shooting, keep UI disabled until turn actually passes (prevents multiple shots before host updates).
  useEffect(() => {
    if (!isMyTurn) {
      shootingRef.current = false;
      setShooting(false);
    }
  }, [isMyTurn]);

  const targetBoard = boards.find((b) => b.player_id === currentTargetId);
  const shotsOnTarget = shots.filter((s) => s.target_id === currentTargetId);
  const shotCellsTarget = new Set(shotsOnTarget.map((s) => s.cell_index));

  // Show ship positions ONLY when viewing your own board (you're the target being attacked).
  // Never show ships when it's your turn (you're the shooter attacking an opponent).
  const isViewingOwnBoard =
    myPlayerInRoom.id === currentTargetId && currentTurnId !== myPlayerInRoom.id;

  const cells = new Map<number, CellState>();
  shotsOnTarget.forEach((s) => {
    if (s.is_hit) cells.set(s.cell_index, { kind: "hit", hitPlayerId: currentTargetId });
    else cells.set(s.cell_index, { kind: "water" });
  });
  if (isViewingOwnBoard && targetBoard?.ships) {
    targetBoard.ships.forEach((ship) => {
      ship.cells.forEach((c) => {
        if (!cells.has(c)) cells.set(c, { kind: "sub" });
      });
    });
  }

  const lastProcessedCountRef = useRef<number>(-1);
  const initialSyncDoneRef = useRef(false);
  useEffect(() => {
    if (!isHost) return;
    if (!initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      lastProcessedCountRef.current = shots.length;
      return;
    }
    if (shots.length <= lastProcessedCountRef.current) return;
    lastProcessedCountRef.current = shots.length;
    const runTurnLogic = async () => {
      const { data: shotsList } = await battleshipShots.fetchByRoomId(supabase, room.id, roundId);
      const allShots: BattleshipShotRow[] = (shotsList ?? []) as BattleshipShotRow[];
      const lastShot = allShots[allShots.length - 1];
      if (!lastShot) return;

      const hitsByTarget = new Map<string, number>();
      allShots.forEach((s) => {
        if (s.is_hit) hitsByTarget.set(s.target_id, (hitsByTarget.get(s.target_id) ?? 0) + 1);
      });
      const stillAlive = alivePlayers.filter((id) => (hitsByTarget.get(id) ?? 0) < TOTAL_SHIP_CELLS);
      if (stillAlive.length <= 1) {
        const winnerId = stillAlive[0] ?? null;
        if (winnerId) {
          const winner = players.find((p) => p.id === winnerId);
          if (winner) await playersApi.update(supabase, winnerId, { score: winner.score + 20 });
        }
        await roomsApi.updateGameState(supabase, room.id, { phase: "round_results", winnerId, roundId });
        return;
      }

      // Use actual shooter from the shot (handles multiple shots from same player before state updated).
      const shooterId = lastShot.shooter_id;

      if (lastShot.is_hit) {
        if (stillAlive.length < alivePlayers.length) {
          const nextOpponent = stillAlive.find((id) => id !== shooterId);
          const newTargetId = stillAlive.includes(lastShot.target_id)
            ? lastShot.target_id
            : (targetQueue.find((id) => stillAlive.includes(id)) ?? nextOpponent ?? shooterId);
          await roomsApi.updateGameState(supabase, room.id, {
            phase: "playing",
            currentTurnId: shooterId,
            targetQueue: targetQueue.filter((id) => stillAlive.includes(id)),
            currentTargetId: newTargetId,
            alivePlayers: stillAlive,
            roundId,
          });
        }
        return;
      }

      // Miss: pass turn to next player after the one who shot; they get a fresh target queue.
      const idx = stillAlive.indexOf(shooterId);
      const nextIdx = idx === -1 ? 0 : (idx + 1) % stillAlive.length;
      const newTurnId = stillAlive[nextIdx]!;
      const newQueue = stillAlive.filter((id) => id !== newTurnId);
      const newTargetId = newQueue[0] ?? newTurnId;

      await roomsApi.updateGameState(supabase, room.id, {
        phase: "playing",
        currentTurnId: newTurnId,
        targetQueue: newQueue,
        currentTargetId: newTargetId,
        alivePlayers: stillAlive,
        roundId,
      });
    };
    runTurnLogic();
  }, [isHost, shots.length, room.id, roundId, supabase, currentTurnId, targetQueue, currentTargetId, alivePlayers, players]);

  async function handleCellClick(cellIndex: number) {
    if (!isMyTurn || shooting || shotCellsTarget.has(cellIndex)) return;
    if (!targetBoard) return;
    if (shootingRef.current) return;
    shootingRef.current = true;
    setShooting(true);
    let isHit = false;
    for (const ship of targetBoard.ships ?? []) {
      if (ship.cells.includes(cellIndex)) {
        isHit = true;
        break;
      }
    }
    try {
      const { error } = await battleshipShots.insert(supabase, {
        room_id: room.id,
        shooter_id: myPlayerInRoom.id,
        target_id: currentTargetId,
        round_id: roundId,
        cell_index: cellIndex,
        is_hit: isHit,
      });
      if (error) throw error;
      if (isHit) {
        await playersApi.update(supabase, myPlayerInRoom.id, { score: myPlayerInRoom.score + 10 });
      }
      await fetchShots();
      // On hit: same player keeps turn — clear so they can shoot again. On miss: keep disabled until turn passes (useEffect clears when !isMyTurn).
      if (isHit) {
        shootingRef.current = false;
        setShooting(false);
      }
    } catch {
      shootingRef.current = false;
      setShooting(false);
    }
  }

  const shooter = players.find((p) => p.id === currentTurnId);
  const target = players.find((p) => p.id === currentTargetId);

  return (
    <div className="flex flex-1 flex-col items-center gap-4 px-4 pb-8" dir="rtl" lang="he">
      <div
        className={`text-center text-lg font-bold ${isMyTurn ? "animate-pulse text-green-600" : "text-foreground"}`}
      >
        <span aria-hidden>{shooter?.avatar ?? "…"}</span> תוקף את הלוח של{" "}
        <span aria-hidden>{target?.avatar ?? "…"}</span>
      </div>
      <BattleshipBoard
        gridSize={BOARD_SIZE}
        cells={cells}
        onCellClick={isMyTurn && !shooting ? handleCellClick : undefined}
        clickableEmptyOnly
        players={players}
      />
    </div>
  );
}
