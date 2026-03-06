/**
 * Simple deterministic "hash" for seeding. Same string always gives same number.
 */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Deterministic shuffle of an array using a seed string.
 * All clients using the same seed get the same order (for Truth or Lie display).
 */
export function seededShuffle<T>(seed: string, array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = (hash(seed + i) % (i + 1)) >>> 0;
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
