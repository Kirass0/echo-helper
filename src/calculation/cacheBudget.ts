// The one cache budget of the calculation worker (spec §11, "Cache budget"): what every kind of job keeps between
// runs (Echo Evaluation's tables, Upgrade Strategy's finishing tables, an example's Top x% distribution) is counted
// together, and evicted least recently used past it.
import type { WeightTableData } from '../catalogue/catalogue';

/** What a job's kept tables depend on in a Weight Table: its weights, whatever its name. */
export const weightsKeyOf = (table: WeightTableData) =>
  JSON.stringify(Object.entries(table.weights).sort());

/**
 * The most entries kept at once: about 10M, some 250–300 MB, since each entry is an Echo Score and three chances of 8
 * bytes each, plus what a distribution keeps beside them.
 */
export const CACHE_BUDGET = 10_000_000;

/** Something a job keeps between runs. */
export interface KeptCache {
  /** How many entries (Echo Scores, each with its chances) it holds now. */
  entries(): number;
  /** Whether it must never be evicted: the focused table's, or Upgrade Strategy's current table's. */
  pinned(): boolean;
  /** Forgets it, so it is rebuilt when next needed. */
  evict(): void;
}

export interface CacheBudget {
  /** Counts `kept` under `id` as just used, then evicts the least recently used past the budget, never `kept` itself. */
  use(id: string, kept: KeptCache): void;
  /** Stops counting what its job forgot by itself. */
  forget(id: string): void;
  /** How many entries are kept now, over every job. */
  readonly entries: number;
}

export function createCacheBudget(budget = CACHE_BUDGET): CacheBudget {
  // In order of use, least recent first.
  const kept = new Map<string, KeptCache>();
  const total = () => [...kept.values()].reduce((sum, cache) => sum + cache.entries(), 0);

  return {
    use(id, cache) {
      kept.delete(id);
      kept.set(id, cache);
      let entries = total();
      for (const [other, otherCache] of kept) {
        if (entries <= budget) return;
        if (other === id || otherCache.pinned()) continue;
        entries -= otherCache.entries();
        kept.delete(other);
        otherCache.evict();
      }
    },
    forget(id) {
      kept.delete(id);
    },
    get entries() {
      return total();
    },
  };
}
