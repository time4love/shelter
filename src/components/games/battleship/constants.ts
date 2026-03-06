/** Classic Battleship: fixed 10x10 board */
export const BOARD_SIZE = 10;
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;

/** Ship lengths: 5, 4, 3, 2, 1 (total 15 cells) */
export const SHIP_SIZES = [5, 4, 3, 2, 1] as const;
export const TOTAL_SHIP_CELLS = 5 + 4 + 3 + 2 + 1; // 15
