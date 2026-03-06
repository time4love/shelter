"use client";

import { useState, useEffect, useCallback } from "react";
import type { RoomRow, PlayerRow } from "@/types/database";
import type { GameStateBattleship } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { BattleshipSubRow, BattleshipShotRow } from "@/types/database";
import { rooms as roomsApi, battleshipSubs, battleshipShots, players as playersApi } from "@/lib/supabase/typed-mutations";
import { BattleshipBoard } from "./BattleshipBoard";

export interface BattleshipPlayingPhaseProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  gameState: Extract<GameStateBattleship, { phase: "playing" }>;
  gridSize: number; // from game_state when battle started
  supabase: SupabaseClient<Database>;
}

export function BattleshipPlayingPhase({
  room,
  players,
  myPlayerInRoom,
  isHost,
  gameState,
  gridSize,
  supabase,
}: BattleshipPlayingPhaseProps) {
  const [shots, setShots] = useState<BattleshipShotRow[]>([]);
  const [subs, setSubs] = useState<BattleshipSubRow[]>([]);
  const [shooting, setShooting] = useState(false);
  const currentTurnId = gameState.currentTurnId;
  const alivePlayers = gameState.alivePlayers;
  const isMyTurn = currentTurnId === myPlayerInRoom.id;

  const fetchShots = useCallback(async () => {
    const { data } = await battleshipShots.fetchByRoomId(supabase, room.id);
    setShots((data ?? []) as BattleshipShotRow[]);
  }, [room.id, supabase]);

  const fetchSubs = useCallback(async () => {
    const { data } = await battleshipSubs.fetchByRoomId(supabase, room.id);
    setSubs((data ?? []) as BattleshipSubRow[]);
  }, [room.id, supabase]);

  useEffect(() => {
    fetchShots();
    fetchSubs();
    const channelShots = supabase
      .channel(`battleship_shots_${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "battleship_shots", filter: `room_id=eq.${room.id}` },
        () => fetchShots()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channelShots);
    };
  }, [room.id, supabase, fetchShots]);

  // Host: when a new shot is added, wait 1.5s then advance turn and check elimination / game over
  const [lastShotCount, setLastShotCount] = useState(0);
  useEffect(() => {
    if (!isHost || shots.length <= lastShotCount) return;
    setLastShotCount(shots.length);
    const timer = setTimeout(async () => {
      const { data: shotsList } = await battleshipShots.fetchByRoomId(supabase, room.id);
      const latestShots: BattleshipShotRow[] = (shotsList ?? []) as BattleshipShotRow[];
      const hitCountByPlayer = new Map<string, number>();
      latestShots.forEach((s) => {
        if (s.result === "hit" && s.hit_player_id) {
          hitCountByPlayer.set(s.hit_player_id, (hitCountByPlayer.get(s.hit_player_id) ?? 0) + 1);
        }
      });
      const stillAlive = alivePlayers.filter((id) => (hitCountByPlayer.get(id) ?? 0) < 2);
      if (stillAlive.length <= 1) {
        const winnerId = stillAlive[0] ?? null;
        if (winnerId) {
          const winner = players.find((p) => p.id === winnerId);
          if (winner) {
            await playersApi.update(supabase, winnerId, { score: winner.score + 20 });
          }
        }
        await roomsApi.updateGameState(supabase, room.id, { phase: "round_results", winnerId: winnerId ?? null });
        return;
      }
      const currentIdx = alivePlayers.indexOf(currentTurnId);
      let nextIdx = (currentIdx + 1) % alivePlayers.length;
      let nextId = alivePlayers[nextIdx];
      while (!stillAlive.includes(nextId) && stillAlive.length > 1) {
        nextIdx = (nextIdx + 1) % alivePlayers.length;
        nextId = alivePlayers[nextIdx];
      }
      if (!stillAlive.includes(nextId)) nextId = stillAlive[0];
      await roomsApi.updateGameState(supabase, room.id, {
        phase: "playing",
        currentTurnId: nextId,
        alivePlayers: stillAlive,
        gridSize,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [isHost, shots.length, room.id, supabase, alivePlayers, currentTurnId, players, lastShotCount]);

  const shotCellIndices = new Set(shots.map((s) => s.cell_index));
  const cells = new Map<number, { kind: "water" } | { kind: "hit"; hitPlayerId: string }>();
  shots.forEach((s) => {
    if (s.result === "water") cells.set(s.cell_index, { kind: "water" });
    else if (s.result === "hit" && s.hit_player_id) cells.set(s.cell_index, { kind: "hit", hitPlayerId: s.hit_player_id });
  });

  async function handleCellClick(cellIndex: number) {
    if (!isMyTurn || shooting || shotCellIndices.has(cellIndex)) return;
    setShooting(true);
    try {
      let hitPlayerId: string | null = null;
      for (const row of subs) {
        if (row.cells.includes(cellIndex)) {
          hitPlayerId = row.player_id;
          break;
        }
      }
      const result = hitPlayerId ? ("hit" as const) : ("water" as const);
      const { error } = await battleshipShots.insert(supabase, {
        room_id: room.id,
        shooter_id: myPlayerInRoom.id,
        cell_index: cellIndex,
        result,
        hit_player_id: hitPlayerId,
      });
      if (error) throw error;
      if (hitPlayerId) {
        await playersApi.update(supabase, myPlayerInRoom.id, { score: myPlayerInRoom.score + 10 });
      }
      await fetchShots();
    } catch {
      // Friendly error
    } finally {
      setShooting(false);
    }
  }

  const currentTurnPlayer = players.find((p) => p.id === currentTurnId);

  return (
    <div className="flex flex-1 flex-col items-center gap-4 px-4 pb-8" dir="rtl" lang="he">
      <div
        className={`text-center text-xl font-bold ${isMyTurn ? "animate-pulse text-green-600" : "text-foreground"}`}
      >
        תורו של {currentTurnPlayer ? (
          <>
            {currentTurnPlayer.name}{" "}
            <span className="text-2xl" aria-hidden>{currentTurnPlayer.avatar}</span>
          </>
        ) : (
          "..."
        )}
      </div>
      <BattleshipBoard
        gridSize={gridSize}
        cells={cells}
        onCellClick={isMyTurn && !shooting ? handleCellClick : undefined}
        clickableEmptyOnly
        players={players}
      />
    </div>
  );
}
