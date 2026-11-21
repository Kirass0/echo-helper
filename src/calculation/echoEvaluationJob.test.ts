import { describe, expect, it } from 'vitest';
import { runEchoEvaluation } from './echoEvaluationJob';
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
