import { describe, expect, it } from 'vitest';
import { createEchoEvaluationJobs } from './echoEvaluationJob';
import type { EchoEvaluationInput } from './protocol';

// Only Crit Rate is weighted: 6.0 per Reference Roll (7.5), so a Crit Rate of 7.5 scores exactly 6.
const critRate = { name: 'Crit Rate', weights: { Critical_Rate: 6 } };

const input = (overrides: Partial<EchoEvaluationInput>): EchoEvaluationInput => ({
  substats: [],
  table: critRate,
  targetScore: null,
  erTargetScore: null,
  ...overrides,
});

const runEchoEvaluation = (job: EchoEvaluationInput) => createEchoEvaluationJobs().run(job);

describe('an Echo Evaluation job', () => {
  it('scores a partly tuned Echo and says where it can still finish', () => {
    const result = runEchoEvaluation(input({ substats: [{ type: 'Critical_Rate', value: 7.5 }] }));
    expect(result.tableName).toBe('Crit Rate');
    expect(result.echoScore).toBe(6);
    expect(result.fullyTuned).toBe(false);
    // No more Crit Rate can come, so the Echo finishes at 6 whatever it rolls.
    expect(result.best).toBe(6);
    expect(result.median).toBe(6);
    expect(result.average).toBe(6);
    // Fully tuned Echoes with Crit Rate 8.1 or more are better: 5/13 have Crit Rate, and 3000 of its 9999 tier weight
    // is above 7.5.
    expect(result.topPercent).toBeCloseTo((5 / 13) * (3000 / 9999), 12);
  });

  it('gives no chances without targets, and the chances with them', () => {
    const empty = runEchoEvaluation(input({}));
    expect(empty.targetChance).toBeNull();
    expect(empty.erTargetChance).toBeNull();

    const withTargets = runEchoEvaluation(input({ targetScore: 0, erTargetScore: 0 }));
    expect(withTargets.targetChance).toBeCloseTo(1, 12);
    // The share of all outcomes that have Energy Regen: 5 of the 13 types.
    expect(withTargets.erTargetChance).toBeCloseTo(5 / 13, 12);
  });

  it('has no ER Top Percent while the Echo has no Energy Regen', () => {
    const withoutEr = runEchoEvaluation(input({}));
    expect(withoutEr.hasEnergyRegen).toBe(false);
    expect(withoutEr.erTopPercent).toBeNull();
    const withEr = runEchoEvaluation(input({ substats: [{ type: 'Energy_Regen', value: 9.2 }] }));
    expect(withEr.hasEnergyRegen).toBe(true);
    expect(withEr.erTopPercent).toBeGreaterThan(0);
    expect(withEr.erTopPercent).toBeLessThanOrEqual(withEr.topPercent);
  });

  it('says where a partly tuned Echo can finish, from Worst to Best', () => {
    const result = runEchoEvaluation(input({ substats: [{ type: 'Atk_Flat', value: 40 }] }));
    // Without Crit Rate the Echo finishes at 0; the best Crit Rate roll, 10.5, gives 6 × 10.5 / 7.5 = 8.4.
    const [worst] = result.distribution;
    expect(worst?.threshold).toBe(0);
    expect(worst?.chance).toBeCloseTo(1, 12);
    const best = result.distribution.at(-1);
    expect(best?.threshold).toBeCloseTo(8.4, 12);
    expect(best?.chance).toBeGreaterThan(0);
    expect(best?.chance).toBeLessThan(1);
  });

  it('puts a 5/5 Echo at its final Echo Score for sure', () => {
    const substats = [
      { type: 'Critical_Rate', value: 7.5 },
      { type: 'Atk_Flat', value: 40 },
      { type: 'Hp_Flat', value: 430 },
      { type: 'Def_Flat', value: 50 },
      { type: 'Energy_Regen', value: 9.2 },
    ] as const;
    const result = runEchoEvaluation(input({ substats: [...substats] }));
    expect(result.distribution).toEqual([{ threshold: 6, chance: 1 }]);
  });

  it('gives a 5/5 Echo verdicts and its final Echo Score', () => {
    const substats = [
      { type: 'Critical_Rate', value: 7.5 },
      { type: 'Atk_Flat', value: 40 },
      { type: 'Hp_Flat', value: 430 },
      { type: 'Def_Flat', value: 50 },
      { type: 'Energy_Regen', value: 9.2 },
    ] as const;
    const result = runEchoEvaluation(
      input({ substats: [...substats], targetScore: 6, erTargetScore: 6.01 }),
    );
    expect(result.fullyTuned).toBe(true);
    expect(result.reachesTarget).toBe(true);
    expect(result.reachesErTarget).toBe(false);
    expect([result.median, result.average, result.best]).toEqual([6, 6, 6]);
    expect(result.targetChance).toBeNull();
  });
});

const atk = { name: 'Atk', weights: { Atk_Percent: 1, Critical_Rate: 1 } };
const critRateAt = (value: number) => ({ type: 'Critical_Rate', value }) as const;

describe('the tables kept per listed Weight Table', () => {
  it('makes a target edit a lookup in the table shifted to the current Echo Score', () => {
    const jobs = createEchoEvaluationJobs();
    jobs.run(input({ substats: [critRateAt(6.3)] }));
    expect(jobs.built).toEqual({ distributions: 1, finishingTables: 1, shiftedTables: 1 });

    for (const [targetScore, erTargetScore] of [
      [7, null],
      [7, 3],
      [8, 3],
      [null, null],
    ] as const)
      jobs.run(input({ substats: [critRateAt(6.3)], targetScore, erTargetScore }));
    expect(jobs.built).toEqual({ distributions: 1, finishingTables: 1, shiftedTables: 1 });
  });

  it('makes a changed value of an existing Substat a shift of the kept table', () => {
    const jobs = createEchoEvaluationJobs();
    jobs.run(input({ substats: [critRateAt(6.3)], targetScore: 7 }));
    const changed = jobs.run(input({ substats: [critRateAt(7.5)], targetScore: 7 }));
    expect(jobs.built).toEqual({ distributions: 1, finishingTables: 1, shiftedTables: 2 });
    // The kept table, shifted by the new value: Crit Rate 7.5 scores 6, and nothing more can come.
    expect(changed.echoScore).toBe(6);
    expect(changed.best).toBe(6);
    expect(changed.targetChance).toBe(0);
  });

  it('builds a new finishing table when the Substat types change', () => {
    const jobs = createEchoEvaluationJobs();
    jobs.run(input({ substats: [critRateAt(6.3)] }));
    jobs.run(input({ substats: [critRateAt(6.3), { type: 'Hp_Flat', value: 430 }] }));
    expect(jobs.built.finishingTables).toBe(2);
  });

  it('reuses the whole-table distribution for a fresh Echo', () => {
    const jobs = createEchoEvaluationJobs();
    const fresh = jobs.run(input({ targetScore: 6 }));
    expect(jobs.built).toEqual({ distributions: 1, finishingTables: 0, shiftedTables: 0 });
    // 5/13 of fully tuned Echoes have Crit Rate, and 5333 of its 9999 tier weight is 7.5 or more.
    expect(fresh.targetChance).toBeCloseTo((5 / 13) * (5333 / 9999), 12);
  });

  it('keeps one finishing table for each listed table', () => {
    const jobs = createEchoEvaluationJobs();
    const substats = [critRateAt(6.3)];
    for (const targetScore of [1, 2, 3]) {
      jobs.run(input({ substats, targetScore }));
      jobs.run(input({ substats, targetScore, table: atk }));
    }
    expect(jobs.built).toEqual({ distributions: 2, finishingTables: 2, shiftedTables: 2 });
  });

  it('rebuilds when a table’s weights change under the same name', () => {
    const jobs = createEchoEvaluationJobs();
    jobs.run(input({ substats: [critRateAt(6.3)] }));
    jobs.run(
      input({ substats: [critRateAt(6.3)], table: { ...critRate, weights: { Critical_Rate: 3 } } }),
    );
    expect(jobs.built).toEqual({ distributions: 2, finishingTables: 2, shiftedTables: 2 });
  });

  it('forgets the tables that are no longer listed', () => {
    const jobs = createEchoEvaluationJobs();
    jobs.run(input({ substats: [critRateAt(6.3)] }));
    jobs.run(input({ substats: [critRateAt(6.3)], table: atk }));
    jobs.keepOnly(['Atk']);
    jobs.run(input({ substats: [critRateAt(6.3)], table: atk }));
    jobs.run(input({ substats: [critRateAt(6.3)] }));
    expect(jobs.built).toEqual({ distributions: 3, finishingTables: 3, shiftedTables: 3 });
  });
});
