"use client";

import { useState, useEffect } from "react";
import type { RoomRow, PlayerRow, BattleshipShip } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi, battleshipBoards } from "@/lib/supabase/typed-mutations";
import { BOARD_SIZE, SHIP_SIZES } from "./constants";
import { generateRandomFleet, canPlaceShip, getShipCells } from "./shipPlacement";
import { BattleshipBoard } from "./BattleshipBoard";
import type { CellState } from "./BattleshipBoard";

export interface BattleshipPlacementProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}

export function BattleshipPlacement({
  room,
  players,
  myPlayerInRoom,
  isHost,
  supabase,
}: BattleshipPlacementProps) {
  const [ships, setShips] = useState<BattleshipShip[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [boardsCount, setBoardsCount] = useState(0);
  const [manualSizeIndex, setManualSizeIndex] = useState(0);
  const [horizontal, setHorizontal] = useState(true);

  useEffect(() => {
    const fetchBoards = async () => {
      const { data } = await battleshipBoards.fetchByRoomId(supabase, room.id);
      const list = (data ?? []) as { player_id: string }[];
      setBoardsCount(list.length);
    };
    fetchBoards();
    const channel = supabase
      .channel(`battleship_boards_${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battleship_boards", filter: `room_id=eq.${room.id}` },
        () => fetchBoards()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, supabase]);

  const allReady = boardsCount >= players.length;
  const canSubmit = ships.length === 5;

  function buildCellsMap(): Map<number, CellState> {
    const map = new Map<number, CellState>();
    ships.forEach((ship) => {
      ship.cells.forEach((cell) => map.set(cell, { kind: "sub" }));
    });
    return map;
  }

  function handleRandomize() {
    setShips(generateRandomFleet());
  }

  function getOccupiedSet(): Set<number> {
    const set = new Set<number>();
    ships.forEach((ship) => ship.cells.forEach((c) => set.add(c)));
    return set;
  }

  function handleCellClick(cellIndex: number) {
    if (submitted || ships.length >= 5) return;
    const size = SHIP_SIZES[manualSizeIndex];
    const occupied = getOccupiedSet();
    if (!canPlaceShip(cellIndex, size, horizontal, occupied)) return;
    const cells = getShipCells(cellIndex, size, horizontal);
    setShips((prev) => [
      ...prev,
      { id: crypto.randomUUID(), size, cells },
    ]);
    if (manualSizeIndex < SHIP_SIZES.length - 1) {
      setManualSizeIndex((i) => i + 1);
    }
  }

  function handleRemoveLastShip() {
    if (ships.length === 0) return;
    setShips((prev) => prev.slice(0, -1));
    setManualSizeIndex((i) => (i > 0 ? i - 1 : 0));
  }

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const { error } = await battleshipBoards.upsert(supabase, {
        room_id: room.id,
        player_id: myPlayerInRoom.id,
        ships,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      // Kid-friendly error could be shown
    } finally {
      setLoading(false);
    }
  }

  async function handleStartWar() {
    if (!isHost || !allReady) return;
    setLoading(true);
    try {
      const firstId = players[0].id;
      const opps = players.filter((p) => p.id !== firstId).map((p) => p.id);
      const alivePlayers = players.map((p) => p.id);
      await roomsApi.updateGameState(supabase, room.id, {
        phase: "playing",
        currentTurnId: firstId,
        targetQueue: opps,
        currentTargetId: opps[0] ?? firstId,
        alivePlayers,
      });
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }

  const cells = buildCellsMap();

  return (
    <div className="flex flex-1 flex-col items-center gap-4 px-4 pb-8" dir="rtl" lang="he">
      <h2 className="text-xl font-bold text-foreground">הנח 5 אוניות (5, 4, 3, 2, 1 תאים)</h2>

      <BattleshipBoard
        gridSize={BOARD_SIZE}
        cells={cells}
        onCellClick={submitted ? undefined : handleCellClick}
        players={players}
      />

      {!submitted && (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={handleRandomize}
            className="w-full rounded-2xl bg-sky-blue/80 py-3 text-lg font-bold text-white shadow-soft"
          >
            ערבב צוללות אקראית
          </button>
          {ships.length < 5 && (
            <>
              <p className="text-center text-foreground/80">
                מניח אונייה באורך {SHIP_SIZES[manualSizeIndex]} — {horizontal ? "אופקי" : "אנכי"}
              </p>
              <button
                type="button"
                onClick={() => setHorizontal((h) => !h)}
                className="rounded-xl bg-mint-green/80 py-2 text-base font-medium text-white"
              >
                סובב (אופקי/אנכי)
              </button>
              {ships.length > 0 && (
                <button
                  type="button"
                  onClick={handleRemoveLastShip}
                  className="rounded-xl border-2 border-soft-pink py-2 text-base text-soft-pink"
                >
                  הסר אונייה אחרונה
                </button>
              )}
            </>
          )}
          {canSubmit && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-2xl bg-mint-green py-4 text-xl font-bold text-white shadow-card disabled:opacity-60"
            >
              {loading ? "שומר..." : "מוכן!"}
            </button>
          )}
        </div>
      )}

      {submitted && (
        <>
          <p className="text-foreground/80">ממתין לשאר השחקנים...</p>
          {isHost && allReady && (
            <button
              type="button"
              onClick={handleStartWar}
              disabled={loading}
              className="w-full max-w-xs rounded-2xl bg-playful-yellow py-4 text-xl font-bold text-foreground shadow-card disabled:opacity-60"
            >
              {loading ? "מתחיל..." : "התחל מלחמה"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
