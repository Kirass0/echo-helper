import { echoScore, type Echo } from './echo';
import { MAX_TUNE_STAGE, SUBSTAT_TYPES, type SubstatType } from './gameData';
import { THRESHOLD_TOLERANCE, clamp01, firstAtOrAbove } from './search';
import { addedEchoScores, chancesAtOrAbove, chancesOf } from './sortedTable';
import type { SubstatWeightTable } from './substatWeightTable';

/** An Echo Score an Echo can finish with, and the chances, in [0, 1], of finishing there with and without Energy Regen. */
export interface FinishingOutcome {
  readonly score: number;
  readonly chanceWithEr: number;
  readonly chanceWithoutEr: number;
  /** chanceWithEr + chanceWithoutEr. */
  readonly chance: number;
}

/**
 * The finishing table of a partly tuned Echo: the exact chance of each Echo Score it can finish with once fully tuned,
 * split by whether it then has Energy Regen.
 */
export interface FinishingEchoScores {
  /** Every Echo Score the Echo can finish with, ascending; each has a chance above 0, and the chances sum to 1. */
  readonly outcomes: readonly FinishingOutcome[];
  /** The chance of finishing at or above an Echo Score, in [0, 1]; scores within 1e-9 of it count. */
  chanceAtOrAbove(score: number): number;
  /** The chance of finishing with Energy Regen and at or above an Echo Score, in [0, 1]. */
  chanceWithErAtOrAbove(score: number): number;
}

/** A finishing table as the Core reads it: its outcomes as parallel typed arrays, ascending by Echo Score. */
export interface SortedFinishingEchoScores extends FinishingEchoScores {
  readonly scores: Float64Array;
  readonly chances: Float64Array;
  readonly chancesWithEr: Float64Array;
}

/** The finishing table of an Echo for a Weight Table. */
export function finishingEchoScores(
  echo: Echo,
  table: SubstatWeightTable,
): SortedFinishingEchoScores {
  return finishingEchoScoresFor([...echo.substats.keys()], echoScore(echo, table), table);
}

/**
 * The finishing table of an Echo with these Substat types and this Echo Score; its values only matter through the
 * Echo Score. The Substat types still to come are a uniform pick from those it lacks, each rolled independently, so
 * every way to finish is counted rather than simulated.
 */
export function finishingEchoScoresFor(
  types: readonly SubstatType[],
  currentScore: number,
  table: SubstatWeightTable,
): SortedFinishingEchoScores {
  const missing = SUBSTAT_TYPES.filter((type) => !types.includes(type));
  const added = addedEchoScores(missing, MAX_TUNE_STAGE - types.length, table);
  const { chances, chancesWithEr, chancesWithoutEr } = chancesOf(
    added,
    types.includes('Energy_Regen'),
  );
  // Adding the current Echo Score keeps them in order; scores that become equal stay separate outcomes.
  const scores = new Float64Array(added.scores.length);
  for (let i = 0; i < scores.length; i++) scores[i] = currentScore + added.scores[i]!;

  const atOrAbove = chancesAtOrAbove(chances);
  const withErAtOrAbove = chancesAtOrAbove(chancesWithEr);
  const lookUp = (atOrAboveEach: Float64Array, score: number) =>
    clamp01(atOrAboveEach[firstAtOrAbove(scores, score - THRESHOLD_TOLERANCE)]!);

  let outcomes: FinishingOutcome[] | undefined;
  return {
    scores,
    chances,
    chancesWithEr,
    // Built on first read: the Core itself reads the typed arrays, and a large table has millions of outcomes.
    get outcomes() {
      outcomes ??= Array.from(scores, (score, i) => ({
        score,
        chanceWithEr: chancesWithEr[i]!,
        chanceWithoutEr: chancesWithoutEr[i]!,
        chance: chances[i]!,
      }));
      return outcomes;
    },
    chanceAtOrAbove: (score) => lookUp(atOrAbove, score),
    chanceWithErAtOrAbove: (score) => lookUp(withErAtOrAbove, score),
  };
}
