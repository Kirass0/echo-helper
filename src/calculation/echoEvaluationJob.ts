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
  /** Forgets what is kept for tables other than these, the ones listed now. */
  keepOnly(tableNames: readonly string[]): void;
  /** How many whole-table distributions and finishing tables have been built so far. */
  readonly built: { readonly distributions: number; readonly finishingTables: number };
}

/**
 * What is kept for one listed Weight Table: the whole-table distribution, which depends only on the weights, and the
 * latest finishing table at Echo Score 0, which depends only on the weights and the Echo's Substat type set. Values
 * only shift it, so a target edit or a changed value of an existing Substat is a lookup.
 */
interface KeptTables {
  readonly weightsKey: string;
  readonly table: SubstatWeightTable;
  readonly distribution: WholeTableDistribution;
  finishing: { readonly typesKey: string; readonly atZero: SortedFinishingEchoScores } | null;
}

const weightsKeyOf = (table: WeightTableData) =>
  JSON.stringify(Object.entries(table.weights).sort());

export function createEchoEvaluationJobs(): EchoEvaluationJobs {
  const kept = new Map<string, KeptTables>();
  const built = { distributions: 0, finishingTables: 0 };

  function keptFor(data: WeightTableData): KeptTables {
    const weightsKey = weightsKeyOf(data);
    let tables = kept.get(data.name);
    if (tables?.weightsKey !== weightsKey) {
      const table = substatWeightTable(data.name, data.weights);
      built.distributions++;
      tables = { weightsKey, table, distribution: echoScoreDistribution(table), finishing: null };
      kept.set(data.name, tables);
    }
    return tables;
  }

  function finishingFor(tables: KeptTables, echo: Echo): SortedFinishingEchoScores {
    if (echo.tuneStage === 0) return tables.distribution.freshEchoFinishing;
    const types = SUBSTAT_TYPES.filter((type) => echo.substats.has(type));
    const typesKey = types.join(',');
    if (tables.finishing?.typesKey !== typesKey) {
      built.finishingTables++;
      tables.finishing = { typesKey, atZero: finishingEchoScoresFor(types, 0, tables.table) };
    }
    return shiftedFinishingEchoScores(tables.finishing.atZero, echoScore(echo, tables.table));
  }

  return {
    built,
    keepOnly(tableNames) {
      for (const name of kept.keys()) if (!tableNames.includes(name)) kept.delete(name);
    },
    run(input) {
      const tables = keptFor(input.table);
      const echo = new Echo();
      for (const { type, value } of input.substats) echo.addSubstat(type, value);

      const evaluation = evaluateEcho(echo, tables.table, input.targetScore, input.erTargetScore, {
        finishing: finishingFor(tables, echo),
      });
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
