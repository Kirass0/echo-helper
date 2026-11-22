// Runs inside the calculation worker: the only place the app calls Core.
import {
  FinishingTableCache,
  calculateUpgradeStrategy,
  substatWeightTable,
  type SubstatWeightTable,
} from '../core';
import { createCacheBudget, weightsKeyOf, type CacheBudget } from './cacheBudget';
import type { UpgradeStrategyInput, UpgradeStrategyResult } from './protocol';

/** Upgrade Strategy's job, with the finishing tables kept between runs (spec §3, "Caching"). */
export interface UpgradeStrategyJobs {
  run(input: UpgradeStrategyInput): UpgradeStrategyResult;
  /** How many finishing tables have been built so far. */
  readonly built: { readonly finishingTables: number };
}

/**
 * Keeps the finishing tables of the latest Weight Table's weights, so threshold and rule edits on an unchanged table
 * rebuild none of them; another table's weights start afresh. They count toward the worker's cache budget, and as the
 * current table's they are never evicted.
 */
export function createUpgradeStrategyJobs({
  cacheBudget = createCacheBudget(),
}: { cacheBudget?: CacheBudget } = {}): UpgradeStrategyJobs {
  let kept: { weightsKey: string; table: SubstatWeightTable; cache: FinishingTableCache } | null =
    null;
  let builtBefore = 0;

  return {
    get built() {
      return { finishingTables: builtBefore + (kept?.cache.size ?? 0) };
    },
    run({ strategy, table }) {
      const weightsKey = weightsKeyOf(table);
      if (kept?.weightsKey !== weightsKey) {
        builtBefore += kept?.cache.size ?? 0;
        kept = {
          weightsKey,
          table: substatWeightTable(table.name, table.weights),
          cache: new FinishingTableCache(),
        };
      }
      const { cache } = kept;
      const result = calculateUpgradeStrategy(strategy, kept.table, { cache });
      cacheBudget.use('upgradeStrategy', {
        entries: () => cache.entries,
        pinned: () => true,
        evict: () => {},
      });
      return result;
    },
  };
}
