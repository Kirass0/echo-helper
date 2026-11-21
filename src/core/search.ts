// Echo Scores this close are equal, so floating-point summation order never decides a threshold or a tie.
export const SCORE_TOLERANCE = 1e-9;

/** The index of the first element of an ascending array at or above x, or the length if there is none. */
export function firstAtOrAbove(sorted: ArrayLike<number>, x: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (sorted[middle]! < x) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** The index of the first element of an ascending array strictly above x, or the length if there is none. */
export function firstAbove(sorted: ArrayLike<number>, x: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (sorted[middle]! <= x) low = middle + 1;
    else high = middle;
  }
  return low;
}

export const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/** Adds a chance to the entry for an Echo Score, creating it at 0. */
export function addChance(map: Map<number, number>, score: number, chance: number): void {
  map.set(score, (map.get(score) ?? 0) + chance);
}
