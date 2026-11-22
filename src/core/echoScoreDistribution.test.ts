import { describe, expect, it } from 'vitest';
import {
  Echo,
  echoScore,
  echoScoreDistribution,
  substatWeightTable,
  type EchoScoreDistribution,
  type SubstatType,
  type SubstatWeightTable,
} from './index';
import { tuneCopiesToMax } from './testing/echoEvaluationSimulator';
import * as plain from './testing/plain';

// Ported from EchoValueDistributionTests. They run against the shipped Core and the plain reference it is checked
// against (fastVersusPlain.test.ts).

const implementations = [
  ['fast Core', echoScoreDistribution],
  ['plain reference', plain.echoScoreDistribution],
] as const;

// Only Crit Rate is weighted: 6.0 per Reference Roll (7.5), so the Echo Score is just the Crit Rate roll scaled.
const critRateTable = substatWeightTable('Crit Rate', { Critical_Rate: 6.0 });

// A fully tuned Echo has Crit Rate in 5 of the 13 Substat types' places, so 5/13 of them have it.
const chanceOfCritRate = 5 / 13;

// Crit Rate's tier weights sum to 9999; 9.9 and 10.5 are 300 each, and 8.7 and 9.3 are 800 each.
const critRateTierTotal = 9999;

// A fully tuned Echo has both Crit Rate and Energy Regen in 5/13 · 4/12 of cases.
const chanceOfCritRateAndEnergyRegen = (5 / 13) * (4 / 12);

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

function echoWith(...substats: [SubstatType, number][]): Echo {
  const echo = new Echo();
  for (const [type, value] of substats) echo.addSubstat(type, value);
  return echo;
}

const critRateScore = (critRate: number) =>
  echoScore(echoWith(['Critical_Rate', critRate]), critRateTable);

function expectAgreesWithASimulationOfAnEmptyEcho(
  echoScoreDistribution: (table: SubstatWeightTable) => EchoScoreDistribution,
  table: SubstatWeightTable,
  withErOnly: boolean,
  chanceAbove: (distribution: EchoScoreDistribution, threshold: number) => number,
) {
  const distribution = echoScoreDistribution(table);
  const { echoScores, hasEr } = tuneCopiesToMax(new Echo(), table, 100_000, 99);

  // At or above each whole number, which no Echo Score hits exactly here; 0.007 is about four standard deviations.
  const max = echoScores.reduce((a, b) => Math.max(a, b), -Infinity);
  const thresholds = Array.from({ length: Math.trunc(max) }, (_, i) => i + 1);
  expect(thresholds.length).toBeGreaterThanOrEqual(10);
  for (const threshold of thresholds) {
    let count = 0;
    echoScores.forEach((score, i) => {
      if (score >= threshold && (!withErOnly || hasEr[i])) count++;
    });
    const sampled = count / echoScores.length;
    expect(Math.abs(chanceAbove(distribution, threshold) - sampled)).toBeLessThanOrEqual(0.007);
  }
}

describe.each(implementations)('echoScoreDistribution, %s', (_, echoScoreDistribution) => {
  it('with only Crit Rate weighted, every Echo with Crit Rate is above an Echo Score of zero', () => {
    const distribution = echoScoreDistribution(critRateTable);

    expect(distribution.topPercent(0)).toBeCloseTo(chanceOfCritRate, 12);
  });

  it('the highest possible Echo Score has no Echo above it', () => {
    const distribution = echoScoreDistribution(critRateTable);

    expect(distribution.topPercent(critRateScore(10.5))).toBe(0);
    expect(distribution.topPercent(critRateScore(9.9))).toBeCloseTo(
      (chanceOfCritRate * 300) / critRateTierTotal,
      12,
    );
  });

  it('Echoes with the same Echo Score do not count as better', () => {
    const distribution = echoScoreDistribution(critRateTable);

    // Every Echo with Crit Rate 8.1 ties; only 8.7, 9.3, 9.9 and 10.5 are higher.
    expect(distribution.topPercent(critRateScore(8.1))).toBeCloseTo(
      (chanceOfCritRate * (800 + 800 + 300 + 300)) / critRateTierTotal,
      12,
    );
  });

  it('with only Crit Rate weighted, every Echo with Crit Rate and Energy Regen is above an Echo Score of zero', () => {
    const distribution = echoScoreDistribution(critRateTable);

    expect(distribution.erTopPercent(0)).toBeCloseTo(chanceOfCritRateAndEnergyRegen, 12);
  });

  it('Echoes with Energy Regen and the same Echo Score do not count as better', () => {
    const distribution = echoScoreDistribution(critRateTable);

    expect(distribution.erTopPercent(critRateScore(10.5))).toBe(0);
    expect(distribution.erTopPercent(critRateScore(8.1))).toBeCloseTo(
      (chanceOfCritRateAndEnergyRegen * (800 + 800 + 300 + 300)) / critRateTierTotal,
      12,
    );
  });

  it('the ER Top Percent is never above the Top Percent', () => {
    const distribution = echoScoreDistribution(resonatorTable);

    for (let step = 0; step < 60; step++) {
      const score = step * 0.5;
      expect(distribution.erTopPercent(score)).toBeGreaterThanOrEqual(0);
      expect(distribution.erTopPercent(score)).toBeLessThanOrEqual(distribution.topPercent(score));
    }
  });

  it('the ER Top Percent agrees with a simulation of an empty Echo where Energy Regen is weighted', () => {
    const table = substatWeightTable('Resonator with ER', {
      Atk_Percent: 3.56,
      Critical_Rate: 6.27,
      Critical_Damage: 4.86,
      Basic_Attack: 3.21,
      Energy_Regen: 1.5,
    });

    expectAgreesWithASimulationOfAnEmptyEcho(
      echoScoreDistribution,
      table,
      true,
      (distribution, threshold) => distribution.erTopPercent(threshold),
    );
  });

  it('the same Substats in a different order give the same Top Percent', () => {
    const distribution = echoScoreDistribution(resonatorTable);
    const substats: [SubstatType, number][] = [
      ['Critical_Rate', 7.5],
      ['Critical_Damage', 13.8],
      ['Atk_Percent', 9.4],
      ['Basic_Attack', 7.1],
      ['Skill', 10.9],
    ];
    const forwards = echoScore(echoWith(...substats), resonatorTable);
    const backwards = echoScore(echoWith(...[...substats].reverse()), resonatorTable);

    expect(forwards).not.toBe(backwards); // summed in a different order, so they differ in the last bit
    expect(distribution.topPercent(forwards)).toBeGreaterThanOrEqual(0.001);
    expect(distribution.topPercent(forwards)).toBeLessThanOrEqual(0.999);
    expect(distribution.topPercent(backwards)).toBe(distribution.topPercent(forwards));
  });

  it('the Top Percent agrees with a simulation of an empty Echo', () => {
    expectAgreesWithASimulationOfAnEmptyEcho(
      echoScoreDistribution,
      resonatorTable,
      false,
      (distribution, threshold) => distribution.topPercent(threshold),
    );
  });
});

describe('the Echo Score of a Top x% Echo', () => {
  // With only Crit Rate weighted, 5.4% of Echoes are above Crit Rate 8.7 but only 2.3% above 9.3, so a Top 5% Echo
  // scores what Crit Rate 9.3 does. 8.5% are above 8.1 but 11.5% above 7.5; 1.2% are above 9.9, none above 10.5.
  it.each([
    [0.05, 9.3],
    [0.1, 8.1],
    [0.01, 10.5],
  ])('is the lowest Echo Score whose Top Percent is at most %d', (topPercent, critRate) => {
    const distribution = echoScoreDistribution(critRateTable);

    expect(distribution.echoScoreOfTopPercent(topPercent)).toBe(critRateScore(critRate));
  });

  it('is 0 when fewer than that many Echoes score anything', () => {
    // 38.5% of Echoes have Crit Rate.
    expect(echoScoreDistribution(critRateTable).echoScoreOfTopPercent(0.5)).toBe(0);
  });

  it('has a Top Percent of at most x, and anything lower one above x, on a real table', () => {
    const distribution = echoScoreDistribution(resonatorTable);
    const score = distribution.echoScoreOfTopPercent(0.05);

    expect(distribution.topPercent(score)).toBeLessThanOrEqual(0.05);
    expect(distribution.topPercent(score - 0.01)).toBeGreaterThan(0.05);
  });
});
