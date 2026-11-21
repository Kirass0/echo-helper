import { describe, expect, it } from 'vitest';
import {
  differencesFrom,
  loadEchoEvaluationFixtures,
  loadTopPercentFixtures,
  loadUpgradeStrategyFixtures,
  readGoldenFixture,
  upgradeStrategyDifferences,
} from '../testing/goldenFixtures';
import {
  ECHO_EVALUATION_TABLES,
  GOLDEN_TOLERANCE,
  UPGRADE_STRATEGY_TABLES,
} from '../testing/goldenSuites';

describe('golden fixture loader', () => {
  it('fails, rather than skips, when a fixture file is missing', () => {
    expect(() => readGoldenFixture('no-such-fixture.json')).toThrow(/no-such-fixture\.json/);
  });

  it('finds a difference beyond the tolerance and none within it', () => {
    const expected = { chance: 0.5, points: [{ threshold: 1 }], verdict: null };
    const withChance = (chance: number) => ({ chance, points: [{ threshold: 1 }], verdict: null });
    expect(differencesFrom(withChance(0.5 + 2e-9), expected, GOLDEN_TOLERANCE)).toHaveLength(1);
    expect(differencesFrom(withChance(0.5 + 5e-10), expected, GOLDEN_TOLERANCE)).toEqual([]);
    expect(differencesFrom({ ...expected, points: [] }, expected, GOLDEN_TOLERANCE)).toHaveLength(
      1,
    );
    expect(differencesFrom({ ...expected, verdict: {} }, expected, GOLDEN_TOLERANCE)).toHaveLength(
      1,
    );
    expect(differencesFrom({ ...expected, chance: null }, expected, GOLDEN_TOLERANCE)).toHaveLength(
      1,
    );
  });

  it('compares the Cost per Successful Echo relative to its size, and the rest absolutely', () => {
    const [fixture] = loadUpgradeStrategyFixtures().filter(
      (f) => f.result.costPerSuccessfulEcho !== null,
    );
    const expected = fixture!.result;
    const cost = expected.costPerSuccessfulEcho!;
    const withExp = (exp: number) => ({
      ...expected,
      costPerSuccessfulEcho: { ...cost, exp },
    });
    expect(cost.exp).toBeGreaterThan(1000);
    expect(
      upgradeStrategyDifferences(withExp(cost.exp * (1 + 5e-10)), expected, GOLDEN_TOLERANCE),
    ).toEqual([]);
    expect(
      upgradeStrategyDifferences(withExp(cost.exp * (1 + 2e-9)), expected, GOLDEN_TOLERANCE),
    ).toHaveLength(1);
    expect(
      upgradeStrategyDifferences(
        { ...expected, successRate: expected.successRate + 2e-9 },
        expected,
        GOLDEN_TOLERANCE,
      ),
    ).toHaveLength(1);
    expect(
      upgradeStrategyDifferences(
        { ...expected, costPerSuccessfulEcho: null },
        expected,
        GOLDEN_TOLERANCE,
      ),
    ).toHaveLength(1);
  });

  it('maps the C# names to the glossary names', () => {
    const [mornyeAtTwo] = loadEchoEvaluationFixtures().filter(
      (fixture) => fixture.weightTable.name === 'Mornye' && fixture.echo.tuneStage === 2,
    );
    expect(mornyeAtTwo!.weightTable.weightOf('Def_Flat')).toBe(1.16);
    expect([...mornyeAtTwo!.echo.substats]).toEqual([
      ['Def_Flat', 50],
      ['Liberation', 9.4],
    ]);
    expect(mornyeAtTwo!.evaluation.echoScore).toBe(5.4009302325581405);
    expect(mornyeAtTwo!.evaluation.outlook!.targetChance).toBeNull();

    const owners = loadUpgradeStrategyFixtures()[0]!;
    expect(owners.name).toBe("Owner's saved strategy on Cartethyia");
    expect(owners.strategy.ruleGroups.at(-1)).toEqual({
      tuneStage: 5,
      rules: [{ kind: 'echoScore', minEchoScore: 12.7 }],
    });
    expect(owners.strategy.ruleGroups[0]!.rules).toEqual([
      { kind: 'targetChance', minChancePercent: 1, targetScore: 12.7 },
    ]);
    expect(owners.result.lowestSuccessfulEchoScore).toBe(12.699999999999998);
  });
});

describe('golden fixture coverage', () => {
  it('has the 28 Weight Tables of Top Percent', () => {
    expect(loadTopPercentFixtures()).toHaveLength(28);
  });

  it('has a test file for every Echo Evaluation case, 72 in all', () => {
    const fixtures = loadEchoEvaluationFixtures();
    expect(fixtures).toHaveLength(72);
    expect(new Set(fixtures.map((fixture) => fixture.weightTable.name))).toEqual(
      new Set(ECHO_EVALUATION_TABLES),
    );
  });

  it('has a test file for every Upgrade Strategy case, 40 in all', () => {
    const fixtures = loadUpgradeStrategyFixtures();
    expect(fixtures).toHaveLength(40);
    expect(new Set(fixtures.map((fixture) => fixture.weightTable.name))).toEqual(
      new Set(UPGRADE_STRATEGY_TABLES),
    );
  });
});
