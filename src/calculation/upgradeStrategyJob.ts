// Runs inside the calculation worker: the only place the app calls Core.
import {
  FinishingTableCache,
  calculateUpgradeStrategy,
  substatWeightTable,
  type SubstatWeightTable,
} from '../core';
import type { UpgradeStrategyInput, UpgradeStrategyResult } from './protocol';

/** Upgrade Strategy's job, with the finishing tables kept between runs (spec §3, "Caching"). */
export interface UpgradeStrategyJobs {
  run(input: UpgradeStrategyInput): UpgradeStrategyResult;
  /** How many finishing tables have been built so far. */
  readonly built: { readonly finishingTables: number };
}

/**
 * Keeps the finishing tables of the latest Weight Table's weights, so threshold and rule edits on an unchanged table
 * rebuild none of them; another table's weights start afresh.
 */
export function createUpgradeStrategyJobs(): UpgradeStrategyJobs {
  let kept: { weightsKey: string; table: SubstatWeightTable; cache: FinishingTableCache } | null =
    null;
  let builtBefore = 0;

  return {
    get built() {
      return { finishingTables: builtBefore + (kept?.cache.size ?? 0) };
    },
    run({ strategy, table }) {
      const weightsKey = JSON.stringify(Object.entries(table.weights).sort());
      if (kept?.weightsKey !== weightsKey) {
        builtBefore += kept?.cache.size ?? 0;
        kept = {
          weightsKey,
          table: substatWeightTable(table.name, table.weights),
          cache: new FinishingTableCache(),
        };
      }
      return calculateUpgradeStrategy(strategy, kept.table, { cache: kept.cache });
    },
  };
}
