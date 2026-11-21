import { MAX_TUNE_STAGE } from './gameData';

/** The EXP, Tuners and Shell Credits spent to tune an Echo up to a Tune Stage. */
export interface TuningCost {
  readonly exp: number;
  readonly tuners: number;
  readonly shellCredits: number;
}

// Cumulative, indexed by Tune Stage.
const COST_TO_REACH: readonly TuningCost[] = [
  { exp: 0, tuners: 0, shellCredits: 0 },
  { exp: 4400, tuners: 10, shellCredits: 2440 },
  { exp: 16500, tuners: 20, shellCredits: 5650 },
  { exp: 39600, tuners: 30, shellCredits: 9960 },
  { exp: 79100, tuners: 40, shellCredits: 15910 },
  { exp: 142600, tuners: 50, shellCredits: 24260 },
];

/** What an Echo tuned to a Tune Stage ends up costing, after the refund if it is discarded. */
export function tuningCost(tuneStage: number, discarded: boolean): TuningCost {
  if (!Number.isInteger(tuneStage) || tuneStage < 0 || tuneStage > MAX_TUNE_STAGE)
    throw new RangeError(
      `Tune Stage must be an integer from 0 to ${MAX_TUNE_STAGE}, not ${tuneStage}.`,
    );

  const cost = COST_TO_REACH[tuneStage]!;
  // A Discard refunds 75% of EXP and 30% of Tuners, but no Shell Credits; what is left is truncated as the source does.
  return discarded
    ? {
        exp: Math.trunc(cost.exp * 0.25),
        tuners: Math.trunc(cost.tuners * 0.7),
        shellCredits: cost.shellCredits,
      }
    : { ...cost };
}

/** A Tuning Cost multiplied by a factor, such as the share of Echoes that pay it. */
export function scaleTuningCost(cost: TuningCost, factor: number): TuningCost {
  return {
    exp: cost.exp * factor,
    tuners: cost.tuners * factor,
    shellCredits: cost.shellCredits * factor,
  };
}

export function addTuningCosts(a: TuningCost, b: TuningCost): TuningCost {
  return {
    exp: a.exp + b.exp,
    tuners: a.tuners + b.tuners,
    shellCredits: a.shellCredits + b.shellCredits,
  };
}
