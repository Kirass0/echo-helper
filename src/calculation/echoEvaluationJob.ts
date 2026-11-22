// Runs inside the calculation worker: the only place the app calls Core.
import {
  Echo,
  SUBSTAT_TYPES,
  echoScore,
  echoScoreDistribution,
  evaluateEcho,
  finishingEchoScoresFor,
  shiftedFinishingEchoScores,
  substatWeightTable,
  type SortedFinishingEchoScores,
  type SubstatWeightTable,
  type WholeTableDistribution,
} from '../core';
import type { WeightTableData } from '../catalogue/catalogue';
import type { EchoEvaluationInput, EchoEvaluationResult } from './protocol';

/** Echo Evaluation's jobs, one per Weight Table, with what is kept between them (spec §3, "Caching"). */
export interface EchoEvaluationJobs {
  /** The figures behind Echo Evaluation's result boxes for one Weight Table. */
  run(input: EchoEvaluationInput): EchoEvaluationResult;
  /**
   * Forgets what is kept for tables other than these, the ones listed now. What is kept for the table in focus is never
   * evicted to stay within the budget.
   */
  keepOnly(tableNames: readonly string[], focusedTableName: string | null): void;
  /** How many whole-table distributions, finishing tables and shifted finishing tables have been built so far. */
  readonly built: {
    readonly distributions: number;
    readonly finishingTables: number;
    readonly shiftedTables: number;
  };
  /** How many entries (Echo Scores, each with its chances) are kept now, over every listed table. */
  readonly keptEntries: number;
}

/**
 * The most entries kept at once (spec §11, "Cache budget"): about 10M, some 250–300 MB, since each entry is an Echo
 * Score and three chances of 8 bytes each, plus what the distribution keeps beside them.
 */
export const CACHE_BUDGET = 10_000_000;

/**
 * What is kept for one listed Weight Table: the whole-table distribution, which depends only on the weights, and the
 * latest finishing table at Echo Score 0, which depends only on the weights and the Echo's Substat type set. Values
 * only shift it, so a changed value of an existing Substat needs no new finishing table. The table shifted to the
 * current Echo Score is kept too, so a target edit is a lookup in it.
 */
interface KeptTables {
  readonly weightsKey: string;
  readonly table: SubstatWeightTable;
  readonly distribution: WholeTableDistribution;
  finishing: {
    readonly typesKey: string;
    readonly atZero: SortedFinishingEchoScores;
    shifted: { readonly by: number; readonly table: SortedFinishingEchoScores } | null;
  } | null;
}

const weightsKeyOf = (table: WeightTableData) =>
  JSON.stringify(Object.entries(table.weights).sort());

/** The entries kept for one table: its distribution's fresh-Echo finishing table, and its finishing tables. */
const entriesOf = ({ distribution, finishing }: KeptTables) =>
  distribution.freshEchoFinishing.scores.length +
  (finishing?.atZero.scores.length ?? 0) +
  (finishing?.shifted?.table.scores.length ?? 0);

/**
 * Keeps what each listed table needs, least recently used first; past the budget, the least recently used tables are
 * forgotten, except the one in focus and the one just calculated. A forgotten table is rebuilt when next calculated.
 */
export function createEchoEvaluationJobs({ budget = CACHE_BUDGET } = {}): EchoEvaluationJobs {
  // In order of use, least recent first.
  const kept = new Map<string, KeptTables>();
  const built = { distributions: 0, finishingTables: 0, shiftedTables: 0 };
  let focused: string | null = null;

  function keptFor(data: WeightTableData): KeptTables {
    const weightsKey = weightsKeyOf(data);
    let tables = kept.get(data.name);
    kept.delete(data.name);
    if (tables?.weightsKey !== weightsKey) {
      const table = substatWeightTable(data.name, data.weights);
      built.distributions++;
      tables = { weightsKey, table, distribution: echoScoreDistribution(table), finishing: null };
    }
    kept.set(data.name, tables);
    return tables;
  }

  const keptEntries = () => [...kept.values()].reduce((sum, tables) => sum + entriesOf(tables), 0);

  function evictPastBudget(justCalculated: string) {
    let entries = keptEntries();
    for (const [name, tables] of kept) {
      if (entries <= budget) return;
      if (name === focused || name === justCalculated) continue;
      kept.delete(name);
      entries -= entriesOf(tables);
    }
  }

  function finishingFor(tables: KeptTables, echo: Echo): SortedFinishingEchoScores {
    if (echo.tuneStage === 0) return tables.distribution.freshEchoFinishing;
    const types = SUBSTAT_TYPES.filter((type) => echo.substats.has(type));
    const typesKey = types.join(',');
    if (tables.finishing?.typesKey !== typesKey) {
      built.finishingTables++;
      tables.finishing = {
        typesKey,
        atZero: finishingEchoScoresFor(types, 0, tables.table),
        shifted: null,
      };
    }
    const by = echoScore(echo, tables.table);
    if (tables.finishing.shifted?.by !== by) {
      built.shiftedTables++;
      tables.finishing.shifted = {
        by,
        table: shiftedFinishingEchoScores(tables.finishing.atZero, by),
      };
    }
    return tables.finishing.shifted.table;
  }

  return {
    built,
    get keptEntries() {
      return keptEntries();
    },
    keepOnly(tableNames, focusedTableName) {
      focused = focusedTableName;
      for (const name of kept.keys()) if (!tableNames.includes(name)) kept.delete(name);
    },
    run(input) {
      const tables = keptFor(input.table);
      const echo = new Echo();
      for (const { type, value } of input.substats) echo.addSubstat(type, value);

      const evaluation = evaluateEcho(echo, tables.table, input.targetScore, input.erTargetScore, {
        finishing: finishingFor(tables, echo),
      });
      evictPastBudget(input.table.name);
      const { distribution } = tables;
      const score = evaluation.echoScore;
      const { outlook, verdict } = evaluation;
      const hasEnergyRegen = echo.substats.has('Energy_Regen');

      return {
        tableName: input.table.name,
        fullyTuned: verdict !== null,
        hasEnergyRegen,
        echoScore: score,
        topPercent: distribution.topPercent(score),
        erTopPercent: hasEnergyRegen ? distribution.erTopPercent(score) : null,
        targetChance: outlook?.targetChance ?? null,
        erTargetChance: outlook?.erTargetChance ?? null,
        reachesTarget: verdict?.reachesTarget ?? null,
        reachesErTarget: verdict?.reachesErTarget ?? null,
        median: outlook?.median ?? score,
        average: outlook?.average ?? score,
        best: outlook?.best ?? score,
        distribution: outlook?.distribution ?? [{ threshold: score, chance: 1 }],
      };
    },
  };
}
