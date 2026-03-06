/** Grid size by player count: 2-3 → 5, 4-5 → 6, 6+ → 7 */
export function calculateGridSize(playerCount: number): number {
  if (playerCount <= 3) return 5;
  if (playerCount <= 5) return 6;
  return 7;
}
