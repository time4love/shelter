"use client";

import type { PlayerRow } from "@/types/database";

export type CellState =
  | { kind: "empty" }
  | { kind: "sub"; isLocal?: boolean }
  | { kind: "water" }
  | { kind: "hit"; hitPlayerId: string };

export interface BattleshipBoardProps {
  gridSize: number;
  cells: Map<number, CellState>;
  onCellClick?: (cellIndex: number) => void;
  /** Only cells with kind "empty" are clickable when this is true (playing phase) */
  clickableEmptyOnly?: boolean;
  /** In hiding phase: max selections (e.g. 2) */
  maxSelections?: number;
  /** In hiding phase: current selected indices (for visual) */
  selectedIndices?: number[];
  players: PlayerRow[];
}

export function BattleshipBoard({
  gridSize,
  cells,
  onCellClick,
  clickableEmptyOnly,
  maxSelections,
  selectedIndices = [],
  players,
}: BattleshipBoardProps) {
  const total = gridSize * gridSize;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  function handleClick(index: number) {
    if (!onCellClick) return;
    const state = cells.get(index) ?? { kind: "empty" as const };
    if (clickableEmptyOnly && state.kind !== "empty") return;
    if (maxSelections != null && state.kind === "empty") {
      const alreadySelected = selectedIndices.includes(index);
      if (!alreadySelected && selectedIndices.length >= maxSelections) return;
    }
    onCellClick(index);
  }

  return (
    <div
      className="inline-grid gap-1 rounded-2xl bg-sky-blue/30 p-2 shadow-soft"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
      }}
      dir="ltr"
      aria-label="לוח צוללות"
    >
      {Array.from({ length: total }, (_, i) => {
        const state = cells.get(i) ?? { kind: "empty" as const };
        const isSelected = selectedIndices.includes(i);

        let content: React.ReactNode = null;
        let className =
          "aspect-square min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-2xl transition-all ";

        if (state.kind === "sub" || isSelected) {
          className += "bg-blue-500 text-white scale-105";
          content = "🚢";
        } else if (state.kind === "water") {
          className += "bg-sky-blue/80 text-white animate-bounce";
          content = "💧";
        } else if (state.kind === "hit") {
          const hitPlayer = playerMap.get(state.hitPlayerId);
          className += "bg-soft-pink text-white scale-110";
          content = (
            <span className="flex flex-col items-center gap-0.5">
              <span>💥</span>
              {hitPlayer && (
                <span className="text-base" title={hitPlayer.name}>
                  {hitPlayer.avatar}
                </span>
              )}
            </span>
          );
        } else {
          className += "bg-blue-300 hover:bg-blue-400 active:scale-95";
        }

        const canClick =
          onCellClick &&
          (clickableEmptyOnly ? state.kind === "empty" : state.kind === "empty" || (maxSelections != null && isSelected));

        return (
          <button
            key={i}
            type="button"
            className={className}
            onClick={() => handleClick(i)}
            disabled={!canClick}
            aria-label={
              state.kind === "hit"
                ? `פגיעה ב-${playerMap.get(state.hitPlayerId)?.name ?? "שחקן"}`
                : state.kind === "water"
                  ? "החטאה"
                  : `תא ${i + 1}`
            }
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
