import { describe, expect, it } from 'vitest';
import { UpgradeRule, upgradeStrategy } from '../core';
import { createUpgradeStrategyJobs } from './upgradeStrategyJob';

// Only Crit Rate is weighted: 6.0 per Reference Roll (7.5).
const critRate = { name: 'Crit Rate', weights: { Critical_Rate: 6 } };

const critAtFirstStage = upgradeStrategy([
  { tuneStage: 1, rules: [UpgradeRule.substatCount(1, 'Critical_Rate')] },
]);
const chanceAtSecondStage = (minChancePercent: number, targetScore: number) =>
  upgradeStrategy([
    { tuneStage: 2, rules: [UpgradeRule.targetChance(minChancePercent, targetScore)] },
  ]);

describe('an Upgrade Strategy job', () => {
  it('works out the Success Rate and where Echoes end', () => {
    const result = createUpgradeStrategyJobs().run({ strategy: critAtFirstStage, table: critRate });
    // The first Substat is Crit Rate 1 time in 13; every other Echo is discarded at 1/5.
    expect(result.successRate).toBeCloseTo(1 / 13, 12);
    expect(result.discards[0]).toEqual({ tuneStage: 1, discardRate: expect.closeTo(12 / 13, 12) });
    expect(result.costPerSuccessfulEcho?.echoes).toBeCloseTo(13, 9);
  });

  it('rebuilds no finishing tables for threshold and rule edits on an unchanged table', () => {
    const jobs = createUpgradeStrategyJobs();
    jobs.run({ strategy: chanceAtSecondStage(10, 5), table: critRate });
    const built = jobs.built.finishingTables;
    expect(built).toBeGreaterThan(0);

    jobs.run({ strategy: chanceAtSecondStage(25, 5), table: critRate });
    jobs.run({ strategy: chanceAtSecondStage(25, 7.5), table: critRate });
    expect(jobs.built.finishingTables).toBe(built);
  });

  it('builds them anew once the weights change', () => {
    const jobs = createUpgradeStrategyJobs();
    jobs.run({ strategy: chanceAtSecondStage(10, 5), table: critRate });
    const built = jobs.built.finishingTables;
    jobs.run({
      strategy: chanceAtSecondStage(10, 5),
      table: { ...critRate, weights: { Critical_Rate: 6, Critical_Damage: 3 } },
    });
    expect(jobs.built.finishingTables).toBeGreaterThan(built);
  });
});
