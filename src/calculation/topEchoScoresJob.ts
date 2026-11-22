// Runs inside the calculation worker: the only place the app calls Core.
import { echoScoreDistribution, substatWeightTable, type WholeTableDistribution } from '../core';
import type { TopEchoScoresInput, TopEchoScoresResult } from './protocol';

/** The examples' job: the Echo Score of a Top x% Echo for a Weight Table (spec §8, "Example strategies"). */
export interface TopEchoScoresJobs {
  run(input: TopEchoScoresInput): TopEchoScoresResult;
  /** How many whole-table distributions have been built so far. */
  readonly built: { readonly distributions: number };
}

/** Keeps the whole-table distribution of the latest Weight Table's weights, so loading again builds none. */
export function createTopEchoScoresJobs(): TopEchoScoresJobs {
  let kept: { weightsKey: string; distribution: WholeTableDistribution } | null = null;
  const built = { distributions: 0 };

  return {
    built,
    run({ table, topPercents }) {
      const weightsKey = JSON.stringify(Object.entries(table.weights).sort());
      if (kept?.weightsKey !== weightsKey) {
        built.distributions++;
        kept = {
          weightsKey,
          distribution: echoScoreDistribution(substatWeightTable(table.name, table.weights)),
        };
      }
      const { distribution } = kept;
      return {
        echoScores: topPercents.map((topPercent) => distribution.echoScoreOfTopPercent(topPercent)),
      };
    },
  };
}
