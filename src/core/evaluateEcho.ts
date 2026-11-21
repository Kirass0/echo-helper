import { echoScore, type Echo } from './echo';
import { finishingEchoScores, type SortedFinishingEchoScores } from './finishingEchoScores';
import { MAX_TUNE_STAGE } from './gameData';
import { THRESHOLD_TOLERANCE } from './search';
import type { SubstatWeightTable } from './substatWeightTable';

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
  /** This Echo's finishing table for this Weight Table, when the caller already has it; otherwise it is built. */
  readonly finishing?: SortedFinishingEchoScores | undefined;
}

/** The exact Echo Evaluation of an Echo for a Weight Table, with optional Target Score and ER Target Score. */
export function evaluateEcho(
  echo: Echo,
  table: SubstatWeightTable,
  targetScore: number | null,
  erTargetScore: number | null,
  { signal, finishing: built }: CalculationOptions = {},
): EchoEvaluation {
  signal?.throwIfAborted();
  const currentScore = echoScore(echo, table);
  const finishing = built ?? finishingEchoScores(echo, table);
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
  finishing: SortedFinishingEchoScores,
  targetScore: number | null,
  erTargetScore: number | null,
): EchoOutlook {
  const { scores, chances } = finishing;
  const thresholds = thresholdsOf(scores);
  const distributionOf = (chanceAtOrAbove: (score: number) => number) =>
    thresholds.map((threshold) => ({ threshold, chance: chanceAtOrAbove(threshold) }));
  return {
    best: scores.at(-1)!,
    worst: scores[0]!,
    average: averageOf(scores, chances),
    median: medianOf(scores, chances),
    targetChance: targetScore === null ? null : finishing.chanceAtOrAbove(targetScore),
    erTargetChance: erTargetScore === null ? null : finishing.chanceWithErAtOrAbove(erTargetScore),
    distribution: distributionOf(finishing.chanceAtOrAbove),
    distributionWithEr:
      erTargetScore === null ? null : distributionOf(finishing.chanceWithErAtOrAbove),
  };
}

// The helpers below read Echo Scores ascending, with parallel chances that sum to 1.

/** The chance-weighted average Echo Score. */
export function averageOf(scores: Float64Array, chances: Float64Array): number {
  let total = 0;
  for (let i = 0; i < scores.length; i++) total += scores[i]! * chances[i]!;
  return total;
}

// Real Echo Scores from Worst to Best, so the steps stay exact; one closer than the merge gap to the last kept is
// skipped, except Best.
export function thresholdsOf(scores: Float64Array): number[] {
  const worst = scores[0]!;
  const best = scores.at(-1)!;
  const mergeGap = (best - worst) / MAX_DISTRIBUTION_STEPS;
  const thresholds = [worst];
  let last = worst;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i]! - last >= mergeGap) thresholds.push((last = scores[i]!));
  }
  if (last < best) thresholds.push(best);
  return thresholds;
}

// The lowest Echo Score with a chance of at least half to finish at or below it.
export function medianOf(scores: Float64Array, chances: Float64Array): number {
  let chanceAtOrBelow = 0;
  for (let i = 0; i < scores.length; i++) {
    chanceAtOrBelow += chances[i]!;
    if (chanceAtOrBelow >= 0.5 - THRESHOLD_TOLERANCE) return scores[i]!;
  }
  return scores.at(-1)!;
}
