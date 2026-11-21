import { sortedFinishingEchoScores, type SortedFinishingEchoScores } from './finishingEchoScores';
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

/** The shipped whole-table distribution, which also serves as a fresh Echo's finishing table. */
export interface WholeTableDistribution extends EchoScoreDistribution {
  /** The finishing table of a fresh (0/5) Echo, which counts the same fully tuned Echoes. */
  readonly freshEchoFinishing: SortedFinishingEchoScores;
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
export function echoScoreDistribution(table: SubstatWeightTable): WholeTableDistribution {
  const added = addedEchoScores(TYPES_ER_LAST, MAX_TUNE_STAGE, table);
  const addedChances = chancesOf(added, false);
  const { chances, chancesWithEr } = addedChances;
  const chanceAbove = chancesAtOrAbove(chances);
  const chanceWithErAbove = chancesAtOrAbove(chancesWithEr);

  const firstHigher = (score: number) => firstAbove(added.scores, score + THRESHOLD_TOLERANCE);
  let freshEchoFinishing: SortedFinishingEchoScores | undefined;
  return {
    get freshEchoFinishing() {
      freshEchoFinishing ??= sortedFinishingEchoScores(added.scores, addedChances);
      return freshEchoFinishing;
    },
    topPercent: (score) => clamp01(chanceAbove[firstHigher(score)]!),
    erTopPercent: (score) => clamp01(chanceWithErAbove[firstHigher(score)]!),
  };
}
