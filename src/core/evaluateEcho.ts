import { echoScore, type Echo } from './echo';
import { finishingEchoScores, type FinishingEchoScores } from './finishingEchoScores';
import { MAX_TUNE_STAGE } from './gameData';
import type { SubstatWeightTable } from './substatWeightTable';

// A chance this close to a threshold counts as reaching it, so floating-point summation order never decides the Median.
const CHANCE_TOLERANCE = 1e-9;

// Caps a distribution at about this many points; a chart can't show more across its width.
const MAX_DISTRIBUTION_STEPS = 500;

/** The chance that the Echo finishes with an Echo Score at or above the threshold. */
export interface DistributionPoint {
  readonly threshold: number;
  readonly chance: number;
}

/**
 * What a partly tuned Echo can still become: the Echo Scores it can finish with at Tune Stage 5. Chances are in [0, 1].
 * The distribution always runs from Worst to Best. The with-ER results are present only when an ER Target Score was
 * given, and distributionWithEr has the same thresholds.
 */
export interface EchoOutlook {
  readonly best: number;
  readonly worst: number;
  readonly average: number;
  readonly median: number;
  readonly targetChance: number | null;
  readonly erTargetChance: number | null;
  readonly distribution: readonly DistributionPoint[];
  readonly distributionWithEr: readonly DistributionPoint[] | null;
}

/**
 * Verdicts for a 5/5 Echo. Each is null when it does not apply: no Target Score given, or no ER Target Score given or
 * the Echo has no Energy Regen.
 */
export interface FullyTunedVerdict {
  readonly reachesTarget: boolean | null;
  readonly reachesErTarget: boolean | null;
}

/** The result of evaluating an Echo: a partly tuned Echo has an outlook, a 5/5 Echo a verdict instead. */
export interface EchoEvaluation {
  readonly echoScore: number;
  readonly targetScore: number | null;
  readonly erTargetScore: number | null;
  readonly outlook: EchoOutlook | null;
  readonly verdict: FullyTunedVerdict | null;
}

export interface CalculationOptions {
  /** Aborting it stops the calculation with the signal's reason (an `AbortError` by default). */
  readonly signal?: AbortSignal | undefined;
}

/** The exact Echo Evaluation of an Echo for a Weight Table, with optional Target Score and ER Target Score. */
export function evaluateEcho(
  echo: Echo,
  table: SubstatWeightTable,
  targetScore: number | null,
  erTargetScore: number | null,
  { signal }: CalculationOptions = {},
): EchoEvaluation {
  signal?.throwIfAborted();
  const currentScore = echoScore(echo, table);
  const finishing = finishingEchoScores(echo, table);
  signal?.throwIfAborted();

  if (echo.tuneStage === MAX_TUNE_STAGE) {
    // A 5/5 Echo finishes at its Echo Score, so it reaches a target exactly when it has any chance to.
    const reachesTarget = targetScore === null ? null : finishing.chanceAtOrAbove(targetScore) > 0;
    const reachesErTarget =
      erTargetScore !== null && echo.substats.has('Energy_Regen')
        ? finishing.chanceWithErAtOrAbove(erTargetScore) > 0
        : null;
    return {
      echoScore: currentScore,
      targetScore,
      erTargetScore,
      outlook: null,
      verdict: { reachesTarget, reachesErTarget },
    };
  }
  return {
    echoScore: currentScore,
    targetScore,
    erTargetScore,
    outlook: outlookOf(finishing, targetScore, erTargetScore),
    verdict: null,
  };
}

function outlookOf(
  finishing: FinishingEchoScores,
  targetScore: number | null,
  erTargetScore: number | null,
): EchoOutlook {
  const outcomes = finishing.outcomes;
  const thresholds = thresholdsOf(outcomes);
  const distributionOf = (chanceAtOrAbove: (score: number) => number) =>
    thresholds.map((threshold) => ({ threshold, chance: chanceAtOrAbove(threshold) }));
  return {
    best: outcomes.at(-1)!.score,
    worst: outcomes[0]!.score,
    average: outcomes.reduce((total, outcome) => total + outcome.score * outcome.chance, 0),
    median: medianOf(outcomes),
    targetChance: targetScore === null ? null : finishing.chanceAtOrAbove(targetScore),
    erTargetChance: erTargetScore === null ? null : finishing.chanceWithErAtOrAbove(erTargetScore),
    distribution: distributionOf(finishing.chanceAtOrAbove),
    distributionWithEr:
      erTargetScore === null ? null : distributionOf(finishing.chanceWithErAtOrAbove),
  };
}

/** An Echo Score and its chance; a list of them is ascending by score and its chances sum to 1. */
export interface ScoredChance {
  readonly score: number;
  readonly chance: number;
}

// Real Echo Scores from Worst to Best, so the steps stay exact; one closer than the merge gap to the last kept is
// skipped, except Best.
export function thresholdsOf(outcomes: readonly ScoredChance[]): number[] {
  const worst = outcomes[0]!.score;
  const best = outcomes.at(-1)!.score;
  const mergeGap = (best - worst) / MAX_DISTRIBUTION_STEPS;
  const thresholds = [worst];
  for (const outcome of outcomes.slice(1)) {
    if (outcome.score - thresholds.at(-1)! >= mergeGap) thresholds.push(outcome.score);
  }
  if (thresholds.at(-1)! < best) thresholds.push(best);
  return thresholds;
}

// The lowest Echo Score with a chance of at least half to finish at or below it.
export function medianOf(outcomes: readonly ScoredChance[]): number {
  let chanceAtOrBelow = 0;
  for (const outcome of outcomes) {
    chanceAtOrBelow += outcome.chance;
    if (chanceAtOrBelow >= 0.5 - CHANCE_TOLERANCE) return outcome.score;
  }
  return outcomes.at(-1)!.score;
}
