import { describe, expect, it } from 'vitest';
import { UpgradeRule, upgradeStrategy } from '../core';
import { createCacheBudget } from './cacheBudget';
import { createEchoEvaluationJobs } from './echoEvaluationJob';
import type { EchoEvaluationInput } from './protocol';
import { createTopEchoScoresJobs } from './topEchoScoresJob';
import { createUpgradeStrategyJobs } from './upgradeStrategyJob';

const critRate = { name: 'Crit Rate', weights: { Critical_Rate: 6 } };
const atk = { name: 'Atk', weights: { Atk_Percent: 1 } };

const evaluation = (table: EchoEvaluationInput['table']): EchoEvaluationInput => ({
  substats: [],
  table,
  targetScore: null,
  erTargetScore: null,
});
const chanceAtSecondStage = {
  table: critRate,
  strategy: upgradeStrategy([{ tuneStage: 2, rules: [UpgradeRule.targetChance(10, 5)] }]),
};

/** How many entries this keeps, alone under an unbounded budget. */
function entriesOf(run: (cacheBudget: ReturnType<typeof createCacheBudget>) => void) {
  const cacheBudget = createCacheBudget(Infinity);
  run(cacheBudget);
  return cacheBudget.entries;
}

describe('one cache budget over every kind of job (spec §11, "Cache budget")', () => {
  it('counts Upgrade Strategy’s finishing tables, evicting Echo Evaluation’s least recently used table to make room', () => {
    const evaluated = (table: EchoEvaluationInput['table']) =>
      entriesOf((cacheBudget) => createEchoEvaluationJobs({ cacheBudget }).run(evaluation(table)));
    const strategy = entriesOf((cacheBudget) =>
      createUpgradeStrategyJobs({ cacheBudget }).run(chanceAtSecondStage),
    );
    expect(strategy).toBeGreaterThan(0);
    // Room for all but one entry of the three.
    const cacheBudget = createCacheBudget(evaluated(critRate) + evaluated(atk) + strategy - 1);
    const echoEvaluation = createEchoEvaluationJobs({ cacheBudget });
    echoEvaluation.run(evaluation(critRate));
    echoEvaluation.run(evaluation(atk));
    createUpgradeStrategyJobs({ cacheBudget }).run(chanceAtSecondStage);

    echoEvaluation.run(evaluation(atk));
    expect(echoEvaluation.built.distributions).toBe(2);
    echoEvaluation.run(evaluation(critRate));
    expect(echoEvaluation.built.distributions).toBe(3);
  });

  it('never evicts Upgrade Strategy’s current table', () => {
    const cacheBudget = createCacheBudget(1);
    const strategies = createUpgradeStrategyJobs({ cacheBudget });
    strategies.run(chanceAtSecondStage);
    const built = strategies.built.finishingTables;
    createEchoEvaluationJobs({ cacheBudget }).run(evaluation(atk));
    strategies.run(chanceAtSecondStage);
    expect(strategies.built.finishingTables).toBe(built);
  });

  it('evicts an example’s Top x% distribution past the budget, and rebuilds it on demand', () => {
    const cacheBudget = createCacheBudget(1);
    const topScores = createTopEchoScoresJobs({ cacheBudget });
    topScores.run({ table: critRate, topPercents: [0.05] });
    createEchoEvaluationJobs({ cacheBudget }).run(evaluation(atk));
    topScores.run({ table: critRate, topPercents: [0.05] });
    expect(topScores.built.distributions).toBe(2);
  });
});
