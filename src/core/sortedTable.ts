// "Echo Score → chance" tables as sorted typed arrays (spec §3, "Freedom and its limits"). Each roll shifts a sorted
// table, and the shifted tables are merged in order, combining exactly equal Echo Scores. Floating-point addition and
// rounding are monotonic, so a shifted table stays in order; only neighbours that become equal need combining. The
// merges read the shifted tables through a heap of runs rather than building them. Each merge walks the heap in its
// own loop: a shared iterator over the runs measured 15-20% slower on the 61 catalogue tables.

import { scoreRolls, type ScoreRoll } from './echo';
import { type SubstatType } from './gameData';
import type { SubstatWeightTable } from './substatWeightTable';

/**
 * A min-heap of sorted runs keyed by the Echo Score each run is at, for merging many runs in one pass without
 * building the tables in between.
 */
export class RunHeap {
  readonly #keys: Float64Array;
  readonly #runs: Int32Array;
  #size = 0;

  constructor(capacity: number) {
    this.#keys = new Float64Array(capacity);
    this.#runs = new Int32Array(capacity);
  }

  get size(): number {
    return this.#size;
  }

  /** The run with the lowest Echo Score. */
  get topRun(): number {
    return this.#runs[0]!;
  }

  get topKey(): number {
    return this.#keys[0]!;
  }

  push(run: number, key: number): void {
    let at = this.#size++;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (this.#keys[parent]! <= key) break;
      this.#keys[at] = this.#keys[parent]!;
      this.#runs[at] = this.#runs[parent]!;
      at = parent;
    }
    this.#keys[at] = key;
    this.#runs[at] = run;
  }

  /** Moves the top run on to its next Echo Score. */
  advanceTop(key: number): void {
    this.#siftDown(this.#runs[0]!, key);
  }

  /** Drops the top run, once it has no Echo Scores left. */
  popTop(): void {
    const last = --this.#size;
    if (last > 0) this.#siftDown(this.#runs[last]!, this.#keys[last]!);
  }

  #siftDown(run: number, key: number): void {
    const keys = this.#keys;
    const runs = this.#runs;
    const size = this.#size;
    let at = 0;
    for (;;) {
      let child = 2 * at + 1;
      if (child >= size) break;
      if (child + 1 < size && keys[child + 1]! < keys[child]!) child++;
      if (keys[child]! >= key) break;
      keys[at] = keys[child]!;
      runs[at] = runs[child]!;
      at = child;
    }
    keys[at] = key;
    runs[at] = run;
  }
}

/**
 * The chance at or above each index of ascending entries: each entry's chance summed with those after it, with a
 * trailing 0 for "above every entry".
 */
export function chancesAtOrAbove(chances: Float64Array): Float64Array {
  const atOrAbove = new Float64Array(chances.length + 1);
  for (let i = chances.length - 1; i >= 0; i--) atOrAbove[i] = atOrAbove[i + 1]! + chances[i]!;
  return atOrAbove;
}

/**
 * Echo Scores added by a set of Substat types, ascending, with the chances with and without Energy Regen added,
 * summed over every set of types.
 */
export interface AddedEchoScores {
  readonly scores: Float64Array;
  readonly withEr: Float64Array;
  readonly withoutEr: Float64Array;
}

/** Added Echo Scores' chances divided by the number of sets of types, which are equally likely, so they sum to 1. */
export interface AddedEchoScoreChances {
  readonly chancesWithEr: Float64Array;
  readonly chancesWithoutEr: Float64Array;
  /** chancesWithEr + chancesWithoutEr. */
  readonly chances: Float64Array;
}

/**
 * The chances of the added Echo Scores, each set of types counted once. When the Echo already has Energy Regen, every
 * outcome is with Energy Regen.
 */
export function chancesOf(added: AddedEchoScores, hasEr: boolean): AddedEchoScoreChances {
  const length = added.scores.length;
  let setCount = 0;
  for (let i = 0; i < length; i++) setCount += added.withEr[i]! + added.withoutEr[i]!;
  const chances = new Float64Array(length);
  const chancesWithEr = new Float64Array(length);
  const chancesWithoutEr = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    const withEr = hasEr ? added.withEr[i]! + added.withoutEr[i]! : added.withEr[i]!;
    const withoutEr = hasEr ? 0 : added.withoutEr[i]!;
    chancesWithEr[i] = withEr / setCount;
    chancesWithoutEr[i] = withoutEr / setCount;
    chances[i] = chancesWithEr[i]! + chancesWithoutEr[i]!;
  }
  return { chances, chancesWithEr, chancesWithoutEr };
}

const NO_SCORES: AddedEchoScores = {
  scores: new Float64Array(0),
  withEr: new Float64Array(0),
  withoutEr: new Float64Array(0),
};

/**
 * The added Echo Scores with one more Substat type added: its entries as they are, merged with a copy shifted by each
 * roll of the type. Adding Energy Regen moves every shifted chance to "with Energy Regen".
 */
function withTypeAdded(
  added: AddedEchoScores,
  smaller: AddedEchoScores,
  rolls: readonly ScoreRoll[],
  addsEr: boolean,
): AddedEchoScores {
  // Run 0 is the table itself; run r + 1 is the smaller table shifted by roll r.
  const sources = [added, ...rolls.map(() => smaller)];
  const shifts = [0, ...rolls.map((roll) => roll.score)];
  const capacity = added.scores.length + rolls.length * smaller.scores.length;
  const scores = new Float64Array(capacity);
  const withEr = new Float64Array(capacity);
  const withoutEr = new Float64Array(capacity);
  const at = new Int32Array(sources.length);
  const heap = new RunHeap(sources.length);
  sources.forEach((source, r) => {
    if (source.scores.length > 0) heap.push(r, source.scores[0]! + shifts[r]!);
  });
  let n = -1;
  let last = NaN;
  while (heap.size > 0) {
    const r = heap.topRun;
    const score = heap.topKey;
    const source = sources[r]!;
    const i = at[r]!;
    let er = source.withEr[i]!;
    let noEr = source.withoutEr[i]!;
    if (r > 0) {
      const chance = rolls[r - 1]!.chance;
      if (addsEr) {
        er = (er + noEr) * chance;
        noEr = 0;
      } else {
        er *= chance;
        noEr *= chance;
      }
    }
    if (score === last) {
      withEr[n]! += er;
      withoutEr[n]! += noEr;
    } else {
      scores[++n] = last = score;
      withEr[n] = er;
      withoutEr[n] = noEr;
    }
    if (i + 1 < source.scores.length) {
      at[r] = i + 1;
      heap.advanceTop(source.scores[i + 1]! + shifts[r]!);
    } else heap.popTop();
  }
  const length = n + 1;
  return {
    scores: scores.slice(0, length),
    withEr: withEr.slice(0, length),
    withoutEr: withoutEr.slice(0, length),
  };
}

/**
 * The Echo Scores added by `toAdd` of the given Substat types, picked as a set and rolled independently, with their
 * chances summed over every such set (not divided by the number of sets). The types are added in the order given,
 * which is the order their contributions are summed in, exactly as the source sums them.
 */
export function addedEchoScores(
  types: readonly SubstatType[],
  toAdd: number,
  table: SubstatWeightTable,
): AddedEchoScores {
  // bySize[k] holds the Echo Scores added by every set of k of the types added so far.
  const bySize: AddedEchoScores[] = Array.from({ length: toAdd + 1 }, () => NO_SCORES);
  bySize[0] = {
    scores: Float64Array.of(0),
    withEr: Float64Array.of(0),
    withoutEr: Float64Array.of(1),
  };
  types.forEach((type, added) => {
    const rolls = scoreRolls(type, table);
    const addsEr = type === 'Energy_Regen';
    // A set can't have more types than were added, and one too small to reach toAdd with the rest is never read.
    const lowest = Math.max(1, toAdd - (types.length - added - 1));
    for (let size = Math.min(toAdd, added + 1); size >= lowest; size--) {
      const smaller = bySize[size - 1]!;
      if (smaller.scores.length === 0) continue;
      bySize[size] = withTypeAdded(bySize[size]!, smaller, rolls, addsEr);
    }
  });
  return bySize[toAdd]!;
}
