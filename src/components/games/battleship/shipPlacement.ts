import type { BattleshipShip } from "@/types/database";
import { BOARD_SIZE, SHIP_SIZES, TOTAL_CELLS } from "./constants";

/**
 * Generate valid non-overlapping placements for all 5 ships on a 10x10 grid.
 * Uses random horizontal/vertical placement with collision detection.
 */
export function generateRandomFleet(): BattleshipShip[] {
  const occupied = new Set<number>();
  const ships: BattleshipShip[] = [];
  const maxAttempts = 200;

  for (const size of SHIP_SIZES) {
    let placed = false;
    for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
      const horizontal = Math.random() < 0.5;
      const start = Math.floor(Math.random() * TOTAL_CELLS);
      const row = Math.floor(start / BOARD_SIZE);
      const col = start % BOARD_SIZE;

      const cells: number[] = [];
      if (horizontal) {
        if (col + size > BOARD_SIZE) continue;
        for (let c = col; c < col + size; c++) cells.push(row * BOARD_SIZE + c);
      } else {
        if (row + size > BOARD_SIZE) continue;
        for (let r = row; r < row + size; r++) cells.push(r * BOARD_SIZE + col);
      }

      const overlap = cells.some((cell) => occupied.has(cell));
      if (overlap) continue;

      cells.forEach((c) => occupied.add(c));
      ships.push({
        id: crypto.randomUUID(),
        size,
        cells,
      });
      placed = true;
    }
    if (!placed) {
      // Fallback: retry entire fleet once
      return generateRandomFleet();
    }
  }
  return ships;
}

/** Check if a new ship of given size at origin with horizontal flag fits and doesn't overlap existing cells. */
export function canPlaceShip(
  originIndex: number,
  size: number,
  horizontal: boolean,
  occupied: Set<number>
): boolean {
  const row = Math.floor(originIndex / BOARD_SIZE);
  const col = originIndex % BOARD_SIZE;
  if (horizontal) {
    if (col + size > BOARD_SIZE) return false;
    for (let c = col; c < col + size; c++) {
      if (occupied.has(row * BOARD_SIZE + c)) return false;
    }
  } else {
    if (row + size > BOARD_SIZE) return false;
    for (let r = row; r < row + size; r++) {
      if (occupied.has(r * BOARD_SIZE + col)) return false;
    }
  }
  return true;
}

/** Get cell indices for a ship placed at origin with given size and orientation. */
export function getShipCells(originIndex: number, size: number, horizontal: boolean): number[] {
  const row = Math.floor(originIndex / BOARD_SIZE);
  const col = originIndex % BOARD_SIZE;
  const cells: number[] = [];
  if (horizontal) {
    for (let c = col; c < col + size; c++) cells.push(row * BOARD_SIZE + c);
  } else {
    for (let r = row; r < row + size; r++) cells.push(r * BOARD_SIZE + col);
  }
  return cells;
}
