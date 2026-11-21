// Runs inside the calculation worker: the only place the app calls Core.
import {
  Echo,
  echoScoreDistribution,
  evaluateEcho,
  substatWeightTable,
  type EchoScoreDistribution,
} from '../core';
import type { WeightTableData } from '../catalogue/catalogue';
import type { EchoEvaluationInput, EchoEvaluationResult } from './protocol';

// The whole-table distribution behind Top Percent depends only on the weights, so it is kept for the latest table;
// a Target Score keystroke or a new Substat then doesn't rebuild it.
let distributionCache: { key: string; distribution: EchoScoreDistribution } | null = null;

const weightsKey = (table: WeightTableData) => JSON.stringify(Object.entries(table.weights).sort());

function distributionFor(table: WeightTableData, build: () => EchoScoreDistribution) {
  const key = weightsKey(table);
  if (distributionCache?.key !== key) distributionCache = { key, distribution: build() };
  return distributionCache.distribution;
}

/** The figures behind Echo Evaluation's result boxes for one Weight Table. */
export function runEchoEvaluation(input: EchoEvaluationInput): EchoEvaluationResult {
  const table = substatWeightTable(input.table.name, input.table.weights);
  const echo = new Echo();
  for (const { type, value } of input.substats) echo.addSubstat(type, value);

  const evaluation = evaluateEcho(echo, table, input.targetScore, input.erTargetScore);
  const distribution = distributionFor(input.table, () => echoScoreDistribution(table));
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
  };
}
