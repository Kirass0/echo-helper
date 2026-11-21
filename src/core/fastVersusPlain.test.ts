import { describe, expect, it } from 'vitest';
import {
  Echo,
  FinishingTableCache,
  MAX_TUNE_STAGE,
  SUBSTAT_TYPES,
  UpgradeRule,
  calculateUpgradeStrategy,
  echoScore,
  echoScoreDistribution,
  evaluateEcho,
  finishingEchoScores,
  possibleRolls,
  seededRandom,
  substatWeightTable,
  upgradeStrategy,
  type EchoScoreDistribution,
  type FinishingOutcome,
  type RandomSource,
  type RuleGroup,
  type SubstatWeightTable,
} from './index';
import { differencesFrom, upgradeStrategyDifferences } from './testing/goldenFixtures';
import * as plain from './testing/plain';

// Fast versus plain (spec §3): the shipped Core against the plain Map-based reference on generated inputs, within
// 1e-9. The plain reference is slow, so the generated Weight Tables weight only 2 to 4 Substat types.

const TOLERANCE = 1e-9;
const CASES = 12;

const pick = <T>(random: RandomSource, items: readonly T[]): T =>
  items[random.nextInt(items.length)]!;

function shuffled<T>(random: RandomSource, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = random.nextInt(i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * A random Weight Table: either catalogue-style (a few types, two-decimal weights) or Custom-style (any weight of 0
 * or more: whole numbers, one decimal, or full-precision doubles, sometimes large).
 */
function randomWeightTable(random: RandomSource, index: number): SubstatWeightTable {
  const style = pick(random, ['catalogue', 'whole', 'oneDecimal', 'precise'] as const);
  const weighted = shuffled(random, SUBSTAT_TYPES).slice(
    0,
    2 + random.nextInt(style === 'precise' ? 2 : 3),
  );
  const weightOf = () => {
    switch (style) {
      case 'catalogue':
        return random.nextInt(800) / 100;
      case 'whole':
        return random.nextInt(11);
      case 'oneDecimal':
        return random.nextInt(1000) / 10;
      case 'precise':
        return (random.nextInt(2 ** 30) / 2 ** 30) * 10 ** random.nextInt(3);
    }
  };
  return substatWeightTable(
    `generated ${index} (${style})`,
    Object.fromEntries(weighted.map((type) => [type, weightOf()])),
  );
}

function randomEcho(random: RandomSource, tuneStage: number): Echo {
  const echo = new Echo();
  echo.tune(random, tuneStage);
  return echo;
}

const tables = Array.from({ length: CASES }, (_, i) => randomWeightTable(seededRandom(700 + i), i));

describe('the fast Core agrees with the plain reference', () => {
  it.each(tables.map((table) => [table.name, table] as const))(
    'whole-table distribution on %s',
    (_, table) => {
      const random = seededRandom(1);
      const fast = echoScoreDistribution(table);
      const reference = plain.echoScoreDistribution(table);
      // Real fully tuned Echo Scores, which tie with others exactly, and points between them.
      const scores = Array.from({ length: 200 }, () =>
        echoScore(randomEcho(random, MAX_TUNE_STAGE), table),
      );
      scores.push(...scores.map((score) => score + 1e-3), 0, -1);
      const lookUps = (distribution: EchoScoreDistribution) =>
        scores.map((score) => [distribution.topPercent(score), distribution.erTopPercent(score)]);
      expect(differencesFrom(lookUps(fast), lookUps(reference), TOLERANCE)).toEqual([]);
    },
  );

  it.each(tables.map((table, i) => [table.name, table, i] as const))(
    'finishing tables and Echo Evaluation at every Tune Stage on %s',
    (_, table, i) => {
      const random = seededRandom(100 + i);
      for (let tuneStage = 0; tuneStage <= MAX_TUNE_STAGE; tuneStage++) {
        const echo = randomEcho(random, tuneStage);
        const fast = finishingEchoScores(echo, table);
        const reference = plain.finishingEchoScores(echo, table);
        expect(
          differencesFrom(byScore(fast.outcomes), byScore(reference.outcomes), TOLERANCE),
        ).toEqual([]);

        const current = echoScore(echo, table);
        const best = reference.outcomes.at(-1)!.score;
        const targets = [
          null,
          current,
          best,
          current + (best - current) * (random.nextInt(100) / 100),
        ];
        for (const target of targets) {
          const erTarget = pick(random, targets);
          expect(
            differencesFrom(
              evaluateEcho(echo, table, target, erTarget),
              plain.evaluateEcho(echo, table, target, erTarget),
              TOLERANCE,
            ),
          ).toEqual([]);
        }
      }
    },
  );

  // One test per strategy; the finishing table caches are shared by the strategies on one Weight Table.
  const strategyCases = tables.flatMap((table, i) => {
    const random = seededRandom(300 + i);
    const best = plain.finishingEchoScores(new Echo(), table).outcomes.at(-1)!.score;
    const caches = { fast: new FinishingTableCache(), plain: new plain.FinishingTableCache() };
    return randomStrategies(random, best, RULE_KINDS[i % RULE_KINDS.length]!).map(
      (strategy, j) => [`${table.name}, strategy ${j}`, table, strategy, caches] as const,
    );
  });
  it.each(strategyCases)('Upgrade Strategy on %s', (_, table, strategy, caches) => {
    expect(
      upgradeStrategyDifferences(
        calculateUpgradeStrategy(strategy, table, { cache: caches.fast }),
        plain.calculateUpgradeStrategy(strategy, table, { cache: caches.plain }),
        TOLERANCE,
      ),
    ).toEqual([]);
  });
});

/**
 * Outcomes with exactly equal Echo Scores combined. Two outcomes can share an Echo Score once the current one is added;
 * the plain reference keeps them in the order it built them, the fast Core in the order of the score added.
 */
function byScore(outcomes: readonly FinishingOutcome[]): FinishingOutcome[] {
  const combined: FinishingOutcome[] = [];
  for (const outcome of outcomes) {
    const last = combined.at(-1);
    if (last?.score !== outcome.score) combined.push(outcome);
    else
      combined[combined.length - 1] = {
        score: last.score,
        chanceWithEr: last.chanceWithEr + outcome.chanceWithEr,
        chanceWithoutEr: last.chanceWithoutEr + outcome.chanceWithoutEr,
        chance: last.chance + outcome.chance,
      };
  }
  return combined;
}

const RULE_KINDS = ['substatCount', 'substatRoll', 'echoScore', 'targetChance'] as const;

/**
 * The empty strategy, one with random rules of one kind only, one with Target Chance rules only (their thresholds are
 * the easiest to get subtly wrong), and one with random rules of any kind.
 */
function randomStrategies(random: RandomSource, bestScore: number, kind: UpgradeRule['kind']) {
  const ruleOfKind = (kind: UpgradeRule['kind'], tuneStage: number): UpgradeRule => {
    const share = (tuneStage / MAX_TUNE_STAGE) * (random.nextInt(100) / 100);
    switch (kind) {
      case 'substatCount': {
        const types = shuffled(random, SUBSTAT_TYPES).slice(0, 1 + random.nextInt(4));
        return UpgradeRule.substatCount(
          1 + random.nextInt(Math.min(types.length, tuneStage)),
          ...types,
        );
      }
      case 'substatRoll': {
        const type = pick(random, SUBSTAT_TYPES);
        return UpgradeRule.substatRoll(type, pick(random, possibleRolls(type)).value);
      }
      case 'echoScore':
        return UpgradeRule.echoScore(bestScore * share * 0.6);
      case 'targetChance':
        return UpgradeRule.targetChance(random.nextInt(60), bestScore * (0.3 + share * 0.4));
    }
  };
  const randomStrategy = (onlyKind?: UpgradeRule['kind']) => {
    const groups: RuleGroup[] = [];
    // One to two Rule Groups, of one or two rules, at each of some Tune Stages; at least one.
    for (let tuneStage = 1; tuneStage <= MAX_TUNE_STAGE; tuneStage++) {
      if (random.nextInt(2) === 0 && (groups.length > 0 || tuneStage < MAX_TUNE_STAGE)) continue;
      for (let group = 0; group <= random.nextInt(2); group++) {
        const rules = Array.from({ length: 1 + random.nextInt(2) }, () =>
          ruleOfKind(onlyKind ?? pick(random, RULE_KINDS), tuneStage),
        );
        groups.push({ tuneStage, rules });
      }
    }
    return upgradeStrategy(groups);
  };
  return [
    upgradeStrategy([]),
    randomStrategy(kind),
    randomStrategy('targetChance'),
    randomStrategy(),
  ];
}
