import {
  Echo,
  MAX_TUNE_STAGE,
  SUBSTAT_TYPES,
  echoScore,
  finishingEchoScores,
  seededRandom,
  type FinishingEchoScores,
  type SubstatWeightTable,
  type UpgradeRule,
  type UpgradeStrategy,
} from '../index';

const TOLERANCE = 1e-9;

/**
 * The sampling the Upgrade Strategy used before it was calculated exactly, kept as an oracle so the forward pass and
 * Echo.tune can't silently disagree. Ported from the source's UpgradeStrategySimulator, with its own seeded generator.
 */
export function tuneFreshEchoes(
  strategy: UpgradeStrategy,
  table: SubstatWeightTable,
  iterations: number,
  seed: number,
): { successRate: number; discardRates: number[]; successfulEchoScores: number[] } {
  const random = seededRandom(seed);
  const finishingByTypes = new Map<string, { finishing: FinishingEchoScores; score: number }>();
  const discards = new Array<number>(MAX_TUNE_STAGE + 1).fill(0);
  const successfulEchoScores: number[] = [];

  // Read from the finishing tables rather than sampled, as the Echo Evaluation tests already check them against their
  // own oracle.
  const chanceToReach = (echo: Echo, targetScore: number) => {
    // Every Echo with the same Substat types adds the same Echo Scores, so one table per type set, shifted by the
    // Echo Score.
    const types = SUBSTAT_TYPES.filter((type) => echo.substats.has(type)).join(',');
    const score = echoScore(echo, table);
    let cached = finishingByTypes.get(types);
    if (!cached) {
      cached = { finishing: finishingEchoScores(echo, table), score };
      finishingByTypes.set(types, cached);
    }
    return cached.finishing.chanceAtOrAbove(targetScore - score + cached.score);
  };

  const passes = (rule: UpgradeRule, echo: Echo): boolean => {
    switch (rule.kind) {
      case 'substatCount':
        return rule.substatTypes.filter((type) => echo.substats.has(type)).length >= rule.count;
      case 'substatRoll': {
        const value = echo.substats.get(rule.substatType);
        return value !== undefined && value >= rule.minValue - TOLERANCE;
      }
      case 'echoScore':
        return echoScore(echo, table) >= rule.minEchoScore - TOLERANCE;
      case 'targetChance':
        return chanceToReach(echo, rule.targetScore) >= rule.minChancePercent / 100 - TOLERANCE;
    }
  };

  for (let i = 0; i < iterations; i++) {
    const echo = new Echo();
    let discard = false;
    while (!discard && echo.tuneStage < MAX_TUNE_STAGE) {
      echo.tune(random);
      const ruleGroups = strategy.ruleGroups.filter((group) => group.tuneStage === echo.tuneStage);
      discard =
        ruleGroups.length > 0 &&
        !ruleGroups.some((group) => group.rules.every((rule) => passes(rule, echo)));
    }

    if (discard) discards[echo.tuneStage]!++;
    else successfulEchoScores.push(echoScore(echo, table));
  }

  return {
    successRate: successfulEchoScores.length / iterations,
    discardRates: discards.slice(1).map((count) => count / iterations),
    successfulEchoScores,
  };
}
