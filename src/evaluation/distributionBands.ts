// The distribution chart's bands (spec §7, "Distribution chart"): one range for every listed table, cut into 60 equal
// bands with the same edges, and each table's chance of finishing in each band.
import type { ChanceAtOrAbove } from '../calculation/protocol';

export const BAND_COUNT = 60;

/** Echo Scores this close count as equal, as in Core. */
const TOLERANCE = 1e-9;

/** A listed table as the chart draws it: where the Echo can finish for it, and its targets. */
export interface ChartedTable {
  readonly name: string;
  /** The chance of finishing at or above real Echo Scores, from Worst to Best. */
  readonly distribution: readonly ChanceAtOrAbove[];
  readonly targetScore: number | null;
  readonly erTargetScore: number | null;
}

export interface DistributionBands {
  /** The range of the horizontal axis. */
  readonly from: number;
  readonly to: number;
  /** The 61 band edges, from `from` to `to`. */
  readonly edges: readonly number[];
  /** Each table's chance of finishing in each band, by table name. The last band includes its upper edge. */
  readonly chances: ReadonlyMap<string, readonly number[]>;
  /** The highest chance of any band of any table: the top of the vertical axis. */
  readonly highestChance: number;
}

/**
 * The range runs from the lowest Worst to the highest Best Echo Score of all the tables, widened to include every
 * table's Target Score and ER Target Score. It depends only on the tables, never on which one is in focus. A range of
 * a single Echo Score is widened to one Echo Score above it.
 */
export function distributionBands(tables: readonly ChartedTable[]): DistributionBands {
  const ends = tables.flatMap(({ distribution, targetScore, erTargetScore }) => [
    ...distribution.map(({ threshold }) => threshold),
    ...(targetScore === null ? [] : [targetScore]),
    ...(erTargetScore === null ? [] : [erTargetScore]),
  ]);
  const from = Math.min(...ends);
  const highest = Math.max(...ends);
  const to = highest - from < TOLERANCE ? from + 1 : highest;

  const width = (to - from) / BAND_COUNT;
  const edges = Array.from({ length: BAND_COUNT + 1 }, (_, i) =>
    i === BAND_COUNT ? to : from + i * width,
  );

  let highestChance = 0;
  const chances = new Map<string, readonly number[]>();
  for (const { name, distribution } of tables) {
    const atOrAbove = edges.map((edge, i) =>
      i === BAND_COUNT ? 0 : chanceAtOrAbove(distribution, edge),
    );
    const bands = atOrAbove.slice(1).map((above, i) => (atOrAbove[i] ?? 0) - above);
    highestChance = Math.max(highestChance, ...bands);
    chances.set(name, bands);
  }
  return { from, to, edges, chances, highestChance };
}

/** The chance at the first threshold at or above the Echo Score, or 0 past the last. */
function chanceAtOrAbove(distribution: readonly ChanceAtOrAbove[], score: number): number {
  let low = 0;
  let high = distribution.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((distribution[middle]?.threshold ?? Infinity) < score - TOLERANCE) low = middle + 1;
    else high = middle;
  }
  return distribution[low]?.chance ?? 0;
}
