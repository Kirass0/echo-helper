import { describe, expect, it } from 'vitest';
import {
  Echo,
  SUBSTAT_TYPES,
  echoScore,
  evaluateEcho,
  finishingEchoScores,
  substatWeightTable,
  type DistributionPoint,
  type EchoEvaluation,
  type EchoOutlook,
  type SubstatType,
  type SubstatWeightTable,
} from './index';
import { tuneCopiesToMax } from './testing/echoEvaluationSimulator';

// Ported from EchoEvaluationTests.

const critTable = substatWeightTable(
  'Crit',
  Object.fromEntries(
    SUBSTAT_TYPES.map((type) => [
      type,
      type === 'Critical_Rate' || type === 'Critical_Damage' ? 5.0 : 0.0,
    ]),
  ),
);

// Only Crit Rate is weighted: 6.0 per Reference Roll (7.5).
const critRateTable = substatWeightTable('Crit Rate', { Critical_Rate: 6.0 });

// Six Substat types weighted at their Reference Roll, so each adds its rolled value; Flat ATK 40 adds 1.
const rollValueTable = substatWeightTable('Roll value', {
  Atk_Percent: 8.6,
  Hp_Percent: 8.6,
  Basic_Attack: 8.6,
  Skill: 8.6,
  Heavy: 8.6,
  Liberation: 8.6,
  Atk_Flat: 1.0,
});

// Many Substat types weighted with uneven weights, as in a real Weight Table.
const resonatorTable = substatWeightTable('Resonator', {
  Atk_Percent: 3.56,
  Critical_Rate: 6.27,
  Critical_Damage: 4.86,
  Basic_Attack: 3.21,
  Heavy: 0.08,
  Skill: 0.28,
  Atk_Flat: 1.84,
});

// Every Echo Score stays below 1, even with every weighted Substat at its highest roll.
const belowOneTable = substatWeightTable('Below 1', {
  Atk_Percent: 0.1,
  Critical_Rate: 0.1,
  Critical_Damage: 0.1,
});

// The values the six rollValueTable types can roll (shared by ATK%, HP% and the DMG Bonuses), and their tier weights.
const percentRolls = [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6];
const percentRollWeights = [680, 777, 2039, 2428, 1748, 1457, 582, 291];
const percentRollTotal = 10002;

const oracleIterations = 100_000;
const oracleSeed = 1234;

function echoWith(...substats: [SubstatType, number][]): Echo {
  const echo = new Echo();
  for (const [type, value] of substats) echo.addSubstat(type, value);
  return echo;
}

// Echo Score 10.0 against critTable.
const fullyTuned = (withEnergyRegen: boolean) =>
  echoWith(
    ['Critical_Rate', 7.5],
    ['Critical_Damage', 15],
    ['Hp_Flat', 390],
    ['Def_Percent', 10.9],
    withEnergyRegen ? ['Energy_Regen', 9.2] : ['Skill', 7.9],
  );

const partlyTuned = () => echoWith(['Critical_Rate', 8.7], ['Hp_Flat', 390]);

// Echo Score 1 against rollValueTable. Of its 9 missing types, 6 add their rolled value and 3 (DEF%, Flat HP, ER) add nothing.
const fourOfFive = () =>
  echoWith(['Critical_Rate', 8.1], ['Critical_Damage', 16.2], ['Atk_Flat', 40], ['Def_Flat', 40]);

// The chance fourOfFive adds a weighted type and rolls at least the given value.
const chanceToAddAtLeast = (roll: number) =>
  ((6 / 9) *
    percentRolls.reduce(
      (total, value, i) => (value >= roll ? total + percentRollWeights[i]! : total),
      0,
    )) /
  percentRollTotal;

// Comparing all of about 500 points with every sample would take far longer than the rest of the tests.
const everyTwentieth = (distribution: readonly DistributionPoint[]) =>
  distribution.filter((_, i) => i % 20 === 0);

function evaluate(
  echo: Echo,
  {
    targetScore = null,
    erTargetScore = null,
    table = critTable,
    signal,
  }: {
    targetScore?: number | null;
    erTargetScore?: number | null;
    table?: SubstatWeightTable;
    signal?: AbortSignal;
  } = {},
): EchoEvaluation {
  return evaluateEcho(echo, table, targetScore, erTargetScore, { signal });
}

const outlookOf = (evaluation: EchoEvaluation): EchoOutlook => {
  expect(evaluation.outlook).not.toBeNull();
  return evaluation.outlook!;
};

describe('evaluateEcho', () => {
  it('a fully tuned Echo is checked against the Target Score without an outlook', () => {
    const above = evaluate(fullyTuned(false), { targetScore: 9.5 });
    const below = evaluate(fullyTuned(false), { targetScore: 10.5 });

    expect(above.echoScore).toBeCloseTo(10.0, 5);
    expect(above.outlook).toBeNull();
    expect(above.verdict!.reachesTarget).toBe(true);
    expect(below.verdict!.reachesTarget).toBe(false);
  });

  it('a fully tuned Echo reaches a Target Score equal to its Echo Score', () => {
    const score = evaluate(fullyTuned(true)).echoScore;

    const verdict = evaluate(fullyTuned(true), {
      targetScore: score,
      erTargetScore: score,
    }).verdict!;

    expect(verdict.reachesTarget).toBe(true);
    expect(verdict.reachesErTarget).toBe(true);
  });

  it('a fully tuned Echo gets an ER verdict only when it has Energy Regen and an ER Target Score is given', () => {
    const withEr = evaluate(fullyTuned(true), { targetScore: 12, erTargetScore: 9.5 });
    const withErBelow = evaluate(fullyTuned(true), { targetScore: 12, erTargetScore: 10.5 });
    const withoutEr = evaluate(fullyTuned(false), { targetScore: 12, erTargetScore: 9.5 });
    const noErTarget = evaluate(fullyTuned(true), { targetScore: 12 });

    expect(withEr.verdict!.reachesTarget).toBe(false);
    expect(withEr.verdict!.reachesErTarget).toBe(true);
    expect(withErBelow.verdict!.reachesErTarget).toBe(false);
    expect(withoutEr.verdict!.reachesErTarget).toBeNull();
    expect(noErTarget.verdict!.reachesErTarget).toBeNull();
  });

  it('an untuned Echo finishes with Crit Rate 5 times in 13', () => {
    const lowestCritRate = echoScore(echoWith(['Critical_Rate', 6.3]), critRateTable);

    const outlook = outlookOf(
      evaluate(new Echo(), { targetScore: lowestCritRate, table: critRateTable }),
    );

    expect(outlook.targetChance!).toBeCloseTo(5 / 13, 9);
    expect(outlook.worst).toBe(0);
    expect(outlook.best).toBeCloseTo((6.0 * 10.5) / 7.5, 9);
  });

  it('a 4/5 Echo finishes between its Echo Score plus its worst and best rolls', () => {
    const evaluation = evaluate(fourOfFive(), { table: rollValueTable });

    expect(evaluation.echoScore).toBeCloseTo(1.0, 9);
    expect(outlookOf(evaluation).best).toBeCloseTo(1.0 + 11.6, 9);
    expect(outlookOf(evaluation).worst).toBeCloseTo(1.0, 9);
  });

  it('a 4/5 Echo has the Average and Median worked out by hand', () => {
    const outlook = outlookOf(evaluate(fourOfFive(), { table: rollValueTable }));

    const averageRoll =
      percentRolls.reduce((total, value, i) => total + value * percentRollWeights[i]!, 0) /
      percentRollTotal;
    expect(outlook.average).toBeCloseTo(1.0 + (6 / 9) * averageRoll, 9);
    // It stays at 1 a third of the time, and 7.1 or less adds 2/3 * 1457/10002 more; 7.9 takes it past half.
    expect(outlook.median).toBeCloseTo(1.0 + 7.9, 9);
  });

  it('a 4/5 Echo gets exact chances to reach its targets', () => {
    // 8.9 is 1 + 7.9, so an Echo Score off by rounding still counts as reaching it.
    const outlook = outlookOf(
      evaluate(fourOfFive(), { targetScore: 8.9, erTargetScore: 1.0, table: rollValueTable }),
    );
    const erOutOfReach = outlookOf(
      evaluate(fourOfFive(), { targetScore: 8.9, erTargetScore: 1.5, table: rollValueTable }),
    );

    expect(outlook.targetChance!).toBeCloseTo(chanceToAddAtLeast(7.9), 9);
    // ER is the fifth Substat 1/9 of the time, and adds nothing.
    expect(outlook.erTargetChance!).toBeCloseTo(1 / 9, 9);
    expect(erOutOfReach.erTargetChance!).toBeCloseTo(0, 9);
  });

  it('a 4/5 Echo gets an exact step at every Echo Score it can finish with', () => {
    const outlook = outlookOf(
      evaluate(fourOfFive(), { erTargetScore: 1.0, table: rollValueTable }),
    );

    // It stays at 1, or adds one of the 8 rolls. They are all wider apart than 1/500 of the range, so none is merged.
    const expected = [1, 7.4, 8.1, 8.9, 9.6, 10.4, 11.1, 11.9, 12.6];
    expect(outlook.distribution).toHaveLength(expected.length);
    expected.forEach((threshold, i) =>
      expect(outlook.distribution[i]!.threshold).toBeCloseTo(threshold, 9),
    );
    expect(outlook.distribution[0]!.chance).toBeCloseTo(1, 9);
    expect(outlook.distribution[1]!.chance).toBeCloseTo(6 / 9, 9); // every weighted roll, the lowest being 1 + 6.4
    expect(outlook.distribution[2]!.chance).toBeCloseTo(chanceToAddAtLeast(7.1), 9);
    expect(outlook.distribution[8]!.chance).toBeCloseTo(chanceToAddAtLeast(11.6), 9);
    expect(outlook.distributionWithEr![0]!.chance).toBeCloseTo(1 / 9, 9);
    for (const point of outlook.distributionWithEr!.slice(1))
      expect(point.chance).toBeCloseTo(0, 9);
  });

  it('a partly tuned Echo with a Target Score gets a chance and a distribution', () => {
    const evaluation = evaluate(partlyTuned(), { targetScore: 13 });

    expect(evaluation.verdict).toBeNull();
    // 13 needs Crit Damage above 21, its highest roll.
    expect(outlookOf(evaluation).targetChance!).toBeCloseTo(0, 9);
    expect(outlookOf(evaluation).distribution).toEqual(
      outlookOf(evaluate(partlyTuned())).distribution,
    );
  });

  it('a Weight Table with Echo Scores below 1 still gets a distribution', () => {
    const outlook = outlookOf(evaluate(new Echo(), { table: belowOneTable }));

    expect(outlook.best).toBeLessThan(1);
    expect(outlook.distribution.length).toBeGreaterThan(0);
  });

  it('a fresh Echo has about 500 real steps from Worst to Best', () => {
    const finishing = finishingEchoScores(new Echo(), resonatorTable);
    const outlook = outlookOf(evaluate(new Echo(), { table: resonatorTable }));
    const distribution = outlook.distribution;

    expect(distribution.length).toBeGreaterThanOrEqual(100);
    expect(distribution.length).toBeLessThanOrEqual(502);
    expect(distribution[0]!.threshold).toBe(outlook.worst);
    expect(distribution.at(-1)!.threshold).toBe(outlook.best);
    expect(distribution[0]!.chance).toBeCloseTo(1, 9);
    const scores = new Set(finishing.outcomes.map((outcome) => outcome.score));
    for (const point of distribution) expect(scores.has(point.threshold)).toBe(true);
    const steps = distribution.slice(1).map((second, i) => [distribution[i]!, second] as const);
    for (const [first, second] of steps) {
      expect(first.threshold).toBeLessThan(second.threshold);
      expect(first.chance).toBeGreaterThanOrEqual(second.chance);
    }
    // Only the last step, which keeps Best, can be narrower than the merge gap.
    const mergeGap = (outlook.best - outlook.worst) / 500;
    for (const [first, second] of steps.slice(0, -1))
      expect(second.threshold - first.threshold).toBeGreaterThanOrEqual(mergeGap);
  });

  it('an Echo that can finish with one Echo Score has one point with a chance of 1', () => {
    const echo = echoWith(
      ['Critical_Rate', 8.1],
      ['Hp_Flat', 390],
      ['Skill', 7.9],
      ['Def_Flat', 50],
    );

    const outlook = outlookOf(evaluate(echo, { table: critRateTable }));

    expect(outlook.distribution).toHaveLength(1);
    expect(outlook.distribution[0]!.threshold).toBe(outlook.best);
    expect(outlook.distribution[0]!.chance).toBeCloseTo(1, 9);
  });

  it('a partly tuned Echo always reaches a Target Score equal to its Echo Score', () => {
    // No critTable weight is negative, so tuning never lowers the Echo Score; often no Crit Damage is rolled and it stays the same.
    const score = evaluate(partlyTuned()).echoScore;

    const outlook = outlookOf(evaluate(partlyTuned(), { targetScore: score }));

    expect(outlook.worst).toBeCloseTo(score, 9);
    expect(outlook.targetChance!).toBeCloseTo(1, 9);
  });

  it('a partly tuned Echo without a Target Score gets a falling distribution and no chance', () => {
    const outlook = outlookOf(evaluate(partlyTuned()));

    expect(outlook.targetChance).toBeNull();
    const chances = outlook.distribution.map((point) => point.chance);
    expect(chances).toEqual([...chances].sort((a, b) => b - a));
    // Every Echo reaches its Worst; the next step up needs Crit Damage, one of the 3 Substats to come 3/11 of the time.
    expect(chances[0]!).toBeCloseTo(1, 9);
    expect(chances[1]!).toBeCloseTo(3 / 11, 9);
  });

  it('with-ER results appear only when an ER Target Score is given', () => {
    const withTarget = outlookOf(evaluate(partlyTuned(), { targetScore: 12 }));
    const withTargets = outlookOf(evaluate(partlyTuned(), { targetScore: 12, erTargetScore: 8 }));
    const noTarget = outlookOf(evaluate(partlyTuned()));
    const erTargetOnly = outlookOf(evaluate(partlyTuned(), { erTargetScore: 8 }));

    expect(withTarget.erTargetChance).toBeNull();
    expect(withTarget.distributionWithEr).toBeNull();
    expect(noTarget.erTargetChance).toBeNull();
    expect(noTarget.distributionWithEr).toBeNull();

    // 8 needs Crit Damage, so both ER and Crit Damage are among the 3 Substats to come: 9 of the C(11, 3) = 165 sets.
    expect(withTargets.erTargetChance!).toBeCloseTo(9 / 165, 9);
    expect(erTargetOnly.erTargetChance!).toBeCloseTo(9 / 165, 9);

    for (const outlook of [withTargets, erTargetOnly]) {
      const distributionWithEr = outlook.distributionWithEr!;
      expect(distributionWithEr.map((point) => point.threshold)).toEqual(
        outlook.distribution.map((point) => point.threshold),
      );
      outlook.distribution.forEach((point, i) => {
        expect(distributionWithEr[i]!.chance).toBeGreaterThanOrEqual(0);
        expect(distributionWithEr[i]!.chance).toBeLessThanOrEqual(point.chance);
      });
    }
  });

  const oracleCases: Record<string, () => [Echo, SubstatWeightTable, number, number]> = {
    'Crit, 2/5': () => [partlyTuned(), critTable, 12, 8],
    'Resonator, 0/5': () => [new Echo(), resonatorTable, 10, 5],
    'Resonator, 1/5': () => [echoWith(['Critical_Damage', 15]), resonatorTable, 15, 10],
    'Resonator, 3/5 with ER': () => [
      echoWith(['Energy_Regen', 10], ['Atk_Percent', 9.4], ['Hp_Flat', 430]),
      resonatorTable,
      12,
      8,
    ],
  };

  it.each(Object.keys(oracleCases))('the outlook agrees with tuning random copies (%s)', (name) => {
    const [echo, table, targetScore, erTargetScore] = oracleCases[name]!();
    const { echoScores, hasEr } = tuneCopiesToMax(echo, table, oracleIterations, oracleSeed);
    // Thresholds are real Echo Scores here, so a sampled one can sit just below its threshold by rounding.
    const sampledChance = (threshold: number, withErOnly = false) => {
      let count = 0;
      echoScores.forEach((score, i) => {
        if (score >= threshold - 1e-9 && (!withErOnly || hasEr[i])) count++;
      });
      return count / oracleIterations;
    };
    const expectWithin = (actual: number, expected: number, tolerance: number) =>
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);

    const withTargets = outlookOf(evaluateEcho(echo, table, targetScore, erTargetScore));
    const withErTargetOnly = outlookOf(evaluateEcho(echo, table, null, erTargetScore));

    // Chances within about five standard errors of 100,000 samples.
    const chanceError = 0.008;
    expectWithin(withTargets.targetChance!, sampledChance(targetScore), chanceError);
    expectWithin(withTargets.erTargetChance!, sampledChance(erTargetScore, true), chanceError);
    for (const point of everyTwentieth(withErTargetOnly.distribution))
      expectWithin(point.chance, sampledChance(point.threshold), chanceError);
    for (const point of everyTwentieth(withErTargetOnly.distributionWithEr!))
      expectWithin(point.chance, sampledChance(point.threshold, true), chanceError);
    const sampledAverage =
      echoScores.reduce((total, score) => total + score, 0) / echoScores.length;
    expectWithin(withTargets.average, sampledAverage, 0.05);
    const sampledMax = echoScores.reduce((a, b) => Math.max(a, b), -Infinity);
    const sampledMin = echoScores.reduce((a, b) => Math.min(a, b), Infinity);
    for (const sampled of [sampledMax, sampledMin]) {
      expect(sampled).toBeGreaterThanOrEqual(withTargets.worst);
      expect(sampled).toBeLessThanOrEqual(withTargets.best);
    }
  });

  it('an aborted signal stops the evaluation', () => {
    const controller = new AbortController();
    controller.abort();

    expect(() => evaluate(partlyTuned(), { targetScore: 12, signal: controller.signal })).toThrow(
      expect.objectContaining({ name: 'AbortError' }),
    );
  });
});
