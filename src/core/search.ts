// An Echo Score, Substat value or chance this close to a threshold reaches it, and Echo Scores this close are equal,
// so floating-point summation order never decides a threshold, a tie, a rule or the Median.
export const THRESHOLD_TOLERANCE = 1e-9;

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

/**
 * A running sum with Neumaier's compensation, so summing millions of chances in any order stays within a few units
 * in the last place of the exact sum.
 */
export class CompensatedSum {
  #sum = 0;
  #compensation = 0;

  add(x: number): void {
    const sum = this.#sum + x;
    if (Math.abs(this.#sum) >= Math.abs(x)) this.#compensation += this.#sum - sum + x;
    else this.#compensation += x - sum + this.#sum;
    this.#sum = sum;
  }

  get value(): number {
    return this.#sum + this.#compensation;
  }
}
