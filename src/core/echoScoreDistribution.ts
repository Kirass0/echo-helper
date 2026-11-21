import { MAX_TUNE_STAGE, SUBSTAT_TYPES } from './gameData';
import { THRESHOLD_TOLERANCE, clamp01, firstAbove } from './search';
import { addedEchoScores, chancesAtOrAbove, chancesOf } from './sortedTable';
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
  const added = addedEchoScores(TYPES_ER_LAST, MAX_TUNE_STAGE, table);
  const { chances, chancesWithEr } = chancesOf(added, false);
  const chanceAbove = chancesAtOrAbove(chances);
  const chanceWithErAbove = chancesAtOrAbove(chancesWithEr);

  const firstHigher = (score: number) => firstAbove(added.scores, score + THRESHOLD_TOLERANCE);
  return {
    topPercent: (score) => clamp01(chanceAbove[firstHigher(score)]!),
    erTopPercent: (score) => clamp01(chanceWithErAbove[firstHigher(score)]!),
  };
}
