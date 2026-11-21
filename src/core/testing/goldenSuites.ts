// The golden suites: the TypeScript Core reproduces every value the C# Core recorded in the golden fixtures within
// 1e-9 (spec §3, "Golden fixtures"). A fixture value that can't be met is raised to the owner, never loosened or
// skipped. The suites are split by Weight Table into several test files, so Vitest runs them in parallel.

import { describe, expect, it } from 'vitest';
import {
  FinishingTableCache,
  calculateUpgradeStrategy,
  echoScoreDistribution,
  evaluateEcho,
} from '../index';
import {
  differencesFrom,
  loadEchoEvaluationFixtures,
  loadTopPercentFixtures,
  loadUpgradeStrategyFixtures,
  upgradeStrategyDifferences,
} from './goldenFixtures';

export const GOLDEN_TOLERANCE = 1e-9;

/** The Weight Tables with a test file each; the loader test checks they are exactly the fixtures' tables. */
export const ECHO_EVALUATION_TABLES = [
  'Mornye',
  'Cantarella',
  'Shorekeeper',
  'Hsin (Unison)',
  'Sigrika',
] as const;
export const UPGRADE_STRATEGY_TABLES = [
  'Cartethyia',
  'Mornye',
  'Cantarella',
  'Shorekeeper',
  'Hsin (Unison)',
] as const;

// A generous ceiling for the heaviest cases when four test files run at once.
const SLOW_CASE_TIMEOUT = 60_000;

/**
 * Top Percent and ER Top Percent at every sampled Echo Score, for the first or second half of the Weight Tables, in
 * fixture order. The halves together cover every table, however many the fixture holds.
 */
export function goldenTopPercentSuite(half: 'first' | 'second'): void {
  const all = loadTopPercentFixtures();
  const middle = Math.ceil(all.length / 2);
  const fixtures = half === 'first' ? all.slice(0, middle) : all.slice(middle);
  describe('golden Top Percent and ER Top Percent', () => {
    it.each(fixtures.map((fixture) => [fixture.weightTable.name, fixture] as const))(
      '%s',
      (_, { weightTable, points }) => {
        const distribution = echoScoreDistribution(weightTable);
        const actual = points.map(({ echoScore }) => ({
          echoScore,
          topPercent: distribution.topPercent(echoScore),
          erTopPercent: distribution.erTopPercent(echoScore),
        }));
        expect(differencesFrom(actual, points, GOLDEN_TOLERANCE)).toEqual([]);
      },
      SLOW_CASE_TIMEOUT,
    );
  });
}

/** Every Echo Evaluation case on one Weight Table, with its Top Percent and ER Top Percent. */
export function goldenEchoEvaluationSuite(
  tableName: (typeof ECHO_EVALUATION_TABLES)[number],
): void {
  const fixtures = loadEchoEvaluationFixtures().filter(
    (fixture) => fixture.weightTable.name === tableName,
  );
  describe(`golden Echo Evaluation on ${tableName}`, () => {
    const distribution = echoScoreDistribution(fixtures[0]!.weightTable);

    it.each(fixtures.map((fixture) => [fixture.name, fixture] as const))(
      '%s',
      (_, fixture) => {
        const { weightTable, echo, targetScore, erTargetScore } = fixture;
        const evaluation = evaluateEcho(echo, weightTable, targetScore, erTargetScore);
        const actual = {
          topPercent: distribution.topPercent(evaluation.echoScore),
          erTopPercent: distribution.erTopPercent(evaluation.echoScore),
          evaluation,
        };
        const expected = {
          topPercent: fixture.topPercent,
          erTopPercent: fixture.erTopPercent,
          evaluation: fixture.evaluation,
        };
        expect(differencesFrom(actual, expected, GOLDEN_TOLERANCE)).toEqual([]);
      },
      SLOW_CASE_TIMEOUT,
    );
  });
}

/**
 * The first or second half of the Upgrade Strategies on one Weight Table, in fixture order. A table's cases take
 * several seconds together, so each half has its own test file.
 */
export function goldenUpgradeStrategySuite(
  tableName: (typeof UPGRADE_STRATEGY_TABLES)[number],
  half: 'first' | 'second',
): void {
  const onTable = loadUpgradeStrategyFixtures().filter(
    (fixture) => fixture.weightTable.name === tableName,
  );
  const middle = Math.ceil(onTable.length / 2);
  const fixtures = half === 'first' ? onTable.slice(0, middle) : onTable.slice(middle);
  describe(`golden Upgrade Strategy on ${tableName}, ${half} half`, () => {
    const cache = new FinishingTableCache();

    it.each(fixtures.map((fixture) => [fixture.name, fixture] as const))(
      '%s',
      (_, { weightTable, strategy, result }) => {
        const actual = calculateUpgradeStrategy(strategy, weightTable, { cache });
        expect(upgradeStrategyDifferences(actual, result, GOLDEN_TOLERANCE)).toEqual([]);
      },
      SLOW_CASE_TIMEOUT,
    );
  });
}
