"use client";

import { useState, useEffect } from "react";
import type { RoomRow, PlayerRow, BattleshipSubRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rooms as roomsApi, battleshipSubs } from "@/lib/supabase/typed-mutations";
import { BattleshipBoard } from "./BattleshipBoard";

export interface BattleshipHidingPhaseProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerInRoom: PlayerRow;
  isHost: boolean;
  gridSize: number;
  supabase: SupabaseClient<Database>;
}

export function BattleshipHidingPhase({
  room,
  players,
  myPlayerInRoom,
  isHost,
  gridSize,
  supabase,
}: BattleshipHidingPhaseProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subsCount, setSubsCount] = useState(0);
  const [hasMySub, setHasMySub] = useState(false);

  useEffect(() => {
    const fetchSubs = async () => {
      const { data } = await battleshipSubs.fetchByRoomId(supabase, room.id);
      const list: BattleshipSubRow[] = (data ?? []) as BattleshipSubRow[];
      setSubsCount(list.length);
      setHasMySub(list.some((row) => row.player_id === myPlayerInRoom.id));
    };
    fetchSubs();
    const channel = supabase
      .channel(`battleship_subs_${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battleship_subs", filter: `room_id=eq.${room.id}` },
        () => fetchSubs()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, myPlayerInRoom.id, supabase]);

  useEffect(() => {
    if (hasMySub) setSubmitted(true);
  }, [hasMySub]);

  const allReady = subsCount >= players.length;

  function handleCellClick(cellIndex: number) {
    if (submitted) return;
    setSelectedIndices((prev) => {
      const i = prev.indexOf(cellIndex);
      if (i >= 0) return prev.filter((_, j) => j !== i);
      if (prev.length >= 2) return prev;
      return [...prev, cellIndex];
    });
  }

  async function handleHideSubs() {
    if (selectedIndices.length !== 2 || loading) return;
    setLoading(true);
    try {
      const { error } = await battleshipSubs.insert(supabase, {
        room_id: room.id,
        player_id: myPlayerInRoom.id,
        cells: selectedIndices,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      // Show friendly error in UI if needed
    } finally {
      setLoading(false);
    }
  }

  async function handleStartBattle() {
    if (!isHost || !allReady) return;
    setLoading(true);
    try {
      await roomsApi.updateGameState(supabase, room.id, {
        phase: "playing",
        currentTurnId: players[0].id,
        alivePlayers: players.map((p) => p.id),
        gridSize,
      });
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }

  const cells = new Map<number, { kind: "sub" }>();
  selectedIndices.forEach((i) => cells.set(i, { kind: "sub" }));

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 pb-8" dir="rtl" lang="he">
      <h2 className="text-xl font-bold text-foreground">החבא את הצוללות שלך (2 תאים)</h2>
      <BattleshipBoard
        gridSize={gridSize}
        cells={cells}
        onCellClick={handleCellClick}
        maxSelections={2}
        selectedIndices={selectedIndices}
        players={players}
      />
      {!submitted ? (
        <button
          type="button"
          onClick={handleHideSubs}
          disabled={selectedIndices.length !== 2 || loading}
          className="w-full max-w-xs rounded-2xl bg-mint-green py-4 text-xl font-bold text-white shadow-card disabled:opacity-60"
        >
          {loading ? "שומר..." : "החבא צוללות!"}
        </button>
      ) : (
        <>
          <p className="text-foreground/80">ממתין לשאר...</p>
          {isHost && allReady && (
            <button
              type="button"
              onClick={handleStartBattle}
              disabled={loading}
              className="w-full max-w-xs rounded-2xl bg-playful-yellow py-4 text-xl font-bold text-foreground shadow-card disabled:opacity-60"
            >
              {loading ? "מתחיל..." : "התחל קרב"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
