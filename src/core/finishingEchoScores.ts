import { echoScore, scoreRolls, type Echo } from './echo';
import { MAX_TUNE_STAGE, SUBSTAT_TYPES, type SubstatType } from './gameData';
import { SCORE_TOLERANCE, clamp01, firstAtOrAbove } from './search';
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

/** The finishing table of an Echo for a Weight Table. */
export function finishingEchoScores(echo: Echo, table: SubstatWeightTable): FinishingEchoScores {
  return finishingEchoScoresFor([...echo.substats.keys()], echoScore(echo, table), table);
}

interface ErSplit {
  withEr: number;
  withoutEr: number;
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
): FinishingEchoScores {
  const toAdd = MAX_TUNE_STAGE - types.length;
  // bySize[k] maps an added Echo Score to its chances, with and without Energy Regen added, summed over every set of
  // k of the missing types added so far.
  const bySize: Map<number, ErSplit>[] = Array.from({ length: toAdd + 1 }, () => new Map());
  bySize[0]!.set(0.0, { withEr: 0, withoutEr: 1 });

  for (const type of SUBSTAT_TYPES.filter((type) => !types.includes(type))) {
    const rolls = scoreRolls(type, table);
    const isEr = type === 'Energy_Regen';
    for (let size = toAdd; size >= 1; size--) {
      const larger = bySize[size]!;
      for (const [score, split] of bySize[size - 1]!) {
        const added = isEr ? { withEr: split.withEr + split.withoutEr, withoutEr: 0 } : split;
        for (const roll of rolls) {
          const key = score + roll.score;
          const chances = larger.get(key);
          if (chances) {
            chances.withEr += added.withEr * roll.chance;
            chances.withoutEr += added.withoutEr * roll.chance;
          } else {
            larger.set(key, {
              withEr: added.withEr * roll.chance,
              withoutEr: added.withoutEr * roll.chance,
            });
          }
        }
      }
    }
  }

  // Each set of missing types is equally likely, so the summed chances are divided by the number of sets.
  const finished = bySize[toAdd]!;
  let setCount = 0;
  for (const split of finished.values()) setCount += split.withEr + split.withoutEr;
  const hasEr = types.includes('Energy_Regen');
  const outcomes = [...finished]
    .map(([added, split]): FinishingOutcome => {
      const chanceWithEr = (hasEr ? split.withEr + split.withoutEr : split.withEr) / setCount;
      const chanceWithoutEr = (hasEr ? 0 : split.withoutEr) / setCount;
      return {
        score: currentScore + added,
        chanceWithEr,
        chanceWithoutEr,
        chance: chanceWithEr + chanceWithoutEr,
      };
    })
    .sort((a, b) => a.score - b.score);

  const scores = Float64Array.from(outcomes, (outcome) => outcome.score);
  // The chance of finishing at or above each Echo Score; both have a trailing 0.
  const atOrAbove = new Float64Array(outcomes.length + 1);
  const withErAtOrAbove = new Float64Array(outcomes.length + 1);
  for (let i = outcomes.length - 1; i >= 0; i--) {
    atOrAbove[i] = atOrAbove[i + 1]! + outcomes[i]!.chance;
    withErAtOrAbove[i] = withErAtOrAbove[i + 1]! + outcomes[i]!.chanceWithEr;
  }
  const lookUp = (chances: Float64Array, score: number) =>
    clamp01(chances[firstAtOrAbove(scores, score - SCORE_TOLERANCE)]!);

  return {
    outcomes,
    chanceAtOrAbove: (score) => lookUp(atOrAbove, score),
    chanceWithErAtOrAbove: (score) => lookUp(withErAtOrAbove, score),
  };
}
