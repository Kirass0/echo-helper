// The plain Map-based port (spec §3, "Order of work"), kept in test code as the exact reference the fast Core is
// checked against. It never ships: only tests import it.
import { scoreRolls } from '../../echo';
import { MAX_TUNE_STAGE, SUBSTAT_TYPES } from '../../gameData';
import { THRESHOLD_TOLERANCE, addChance, clamp01, firstAbove } from '../../search';
import type { SubstatWeightTable } from '../../substatWeightTable';

/** The whole-table distribution of fully tuned Echo Scores for a Weight Table, behind Top Percent and ER Top Percent. */
export interface EchoScoreDistribution {
  /** The share of fully tuned Echoes with a strictly higher Echo Score, in [0, 1]. */
  topPercent(score: number): number;
  /** The share of fully tuned Echoes with an Energy Regen Substat and a strictly higher Echo Score, in [0, 1]. */
  erTopPercent(score: number): number;
}

/**
 * Every set of Substat types is equally likely and each value is rolled independently, so every fully tuned Echo is
 * counted rather than simulated.
 */
export function echoScoreDistribution(table: SubstatWeightTable): EchoScoreDistribution {
  // bySize[k] maps an Echo Score to its chance summed over every set of k of the Substat types added so far.
  const bySize: Map<number, number>[] = Array.from({ length: MAX_TUNE_STAGE + 1 }, () => new Map());
  bySize[0]!.set(0.0, 1.0);

  // Energy Regen comes last, so every set with it is a set of the other types one short, plus an Energy Regen roll.
  const types = [
    ...SUBSTAT_TYPES.filter((type) => type !== 'Energy_Regen'),
    'Energy_Regen' as const,
  ];
  const withEr = new Map<number, number>();
  for (const type of types) {
    const rolls = scoreRolls(type, table);
    if (type === 'Energy_Regen') {
      for (const [score, chance] of bySize[MAX_TUNE_STAGE - 1]!)
        for (const roll of rolls) addChance(withEr, score + roll.score, chance * roll.chance);
    }
    for (let size = MAX_TUNE_STAGE; size >= 1; size--) {
      const larger = bySize[size]!;
      for (const [score, chance] of bySize[size - 1]!)
        for (const roll of rolls) addChance(larger, score + roll.score, chance * roll.chance);
    }
  }

  const fullyTuned = [...bySize[MAX_TUNE_STAGE]!].sort((a, b) => a[0] - b[0]);
  const scores = Float64Array.from(fullyTuned, ([score]) => score);

  // Each set of Substat types is equally likely, so the summed chances are divided by the number of sets.
  const setCount = fullyTuned.reduce((total, [, chance]) => total + chance, 0);
  // Those with Energy Regen were summed the same way, so their Echo Scores are among the keys exactly.
  const chanceAbove = new Float64Array(scores.length + 1);
  const chanceWithErAbove = new Float64Array(scores.length + 1);
  for (let i = scores.length - 1; i >= 0; i--) {
    chanceAbove[i] = chanceAbove[i + 1]! + fullyTuned[i]![1] / setCount;
    chanceWithErAbove[i] = chanceWithErAbove[i + 1]! + (withEr.get(scores[i]!) ?? 0) / setCount;
  }

  const firstHigher = (score: number) => firstAbove(scores, score + THRESHOLD_TOLERANCE);
  return {
    topPercent: (score) => clamp01(chanceAbove[firstHigher(score)]!),
    erTopPercent: (score) => clamp01(chanceWithErAbove[firstHigher(score)]!),
  };
}
