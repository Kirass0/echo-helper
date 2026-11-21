import { MAX_TUNE_STAGE, SUBSTAT_TYPES } from './gameData';
import { SCORE_TOLERANCE, clamp01, firstAbove } from './search';
import { addedEchoScores } from './sortedTable';
import type { SubstatWeightTable } from './substatWeightTable';

/** The whole-table distribution of fully tuned Echo Scores for a Weight Table, behind Top Percent and ER Top Percent. */
export interface EchoScoreDistribution {
  /** The share of fully tuned Echoes with a strictly higher Echo Score, in [0, 1]. */
  topPercent(score: number): number;
  /** The share of fully tuned Echoes with an Energy Regen Substat and a strictly higher Echo Score, in [0, 1]. */
  erTopPercent(score: number): number;
}

// Energy Regen comes last, as in the source, which decides the order each Echo Score's contributions are summed in.
const TYPES_ER_LAST = [
  ...SUBSTAT_TYPES.filter((type) => type !== 'Energy_Regen'),
  'Energy_Regen' as const,
];

/**
 * Every set of Substat types is equally likely and each value is rolled independently, so every fully tuned Echo is
 * counted rather than simulated.
 */
export function echoScoreDistribution(table: SubstatWeightTable): EchoScoreDistribution {
  const { scores, withEr, withoutEr } = addedEchoScores(TYPES_ER_LAST, MAX_TUNE_STAGE, table);

  // Each set of Substat types is equally likely, so the summed chances are divided by the number of sets.
  let setCount = 0;
  for (let i = 0; i < scores.length; i++) setCount += withEr[i]! + withoutEr[i]!;
  const chanceAbove = new Float64Array(scores.length + 1);
  const chanceWithErAbove = new Float64Array(scores.length + 1);
  for (let i = scores.length - 1; i >= 0; i--) {
    chanceAbove[i] = chanceAbove[i + 1]! + (withEr[i]! + withoutEr[i]!) / setCount;
    chanceWithErAbove[i] = chanceWithErAbove[i + 1]! + withEr[i]! / setCount;
  }

  const firstHigher = (score: number) => firstAbove(scores, score + SCORE_TOLERANCE);
  return {
    topPercent: (score) => clamp01(chanceAbove[firstHigher(score)]!),
    erTopPercent: (score) => clamp01(chanceWithErAbove[firstHigher(score)]!),
  };
}
