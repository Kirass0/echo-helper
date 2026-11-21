import { describe, expect, it } from 'vitest';
import {
  Echo,
  echoScore,
  finishingEchoScores,
  substatWeightTable,
  type SubstatType,
} from './index';
import * as plain from './testing/plain';

// Ported from FinishingEchoValuesTests. They run against the shipped Core and the plain reference it is checked
// against (fastVersusPlain.test.ts).

const implementations = [
  ['fast Core', finishingEchoScores],
  ['plain reference', plain.finishingEchoScores],
] as const;

// Only Crit Rate is weighted: 6.0 per Reference Roll (7.5), so the Echo Score is just the Crit Rate roll scaled.
const critRateTable = substatWeightTable('Crit Rate', { Critical_Rate: 6.0 });

function echoWith(...substats: [SubstatType, number][]): Echo {
  const echo = new Echo();
  for (const [type, value] of substats) echo.addSubstat(type, value);
  return echo;
}

const critRateScore = (critRate: number) =>
  echoScore(echoWith(['Critical_Rate', critRate]), critRateTable);

describe.each(implementations)('finishingEchoScores, %s', (_, finishingEchoScores) => {
  it('an untuned Echo finishes with Crit Rate 5 times in 13', () => {
    const finishing = finishingEchoScores(new Echo(), critRateTable);

    expect(finishing.chanceAtOrAbove(critRateScore(6.3))).toBeCloseTo(5 / 13, 12);
    expect(finishing.outcomes.reduce((total, outcome) => total + outcome.chance, 0)).toBeCloseTo(
      1,
      12,
    );
  });

  it('a 4/5 Echo without Energy Regen adds it as one of its 9 missing types', () => {
    const echo = echoWith(
      ['Critical_Rate', 8.1],
      ['Hp_Flat', 390],
      ['Skill', 7.9],
      ['Def_Flat', 50],
    );

    const finishing = finishingEchoScores(echo, critRateTable);

    // Nothing it can add is weighted, so it finishes at its Echo Score.
    expect(finishing.outcomes).toHaveLength(1);
    const outcome = finishing.outcomes[0]!;
    expect(outcome.score).toBeCloseTo(critRateScore(8.1), 12);
    expect(outcome.chanceWithEr).toBeCloseTo(1 / 9, 12);
    expect(outcome.chanceWithoutEr).toBeCloseTo(8 / 9, 12);
    expect(finishing.chanceWithErAtOrAbove(outcome.score)).toBeCloseTo(1 / 9, 12);
    expect(finishing.chanceWithErAtOrAbove(outcome.score + 0.01)).toBe(0);
  });

  it('an Echo with Energy Regen always finishes with it', () => {
    const finishing = finishingEchoScores(echoWith(['Energy_Regen', 9.2]), critRateTable);

    for (const outcome of finishing.outcomes) expect(outcome.chanceWithoutEr).toBe(0);
    expect(finishing.chanceWithErAtOrAbove(0)).toBeCloseTo(1, 12);
    // 4 of the 12 missing types are added, so Crit Rate is one of them 1/3 of the time.
    expect(finishing.chanceWithErAtOrAbove(critRateScore(6.3))).toBeCloseTo(1 / 3, 12);
  });

  it('Echo Scores within rounding of a threshold count as reaching it', () => {
    const finishing = finishingEchoScores(echoWith(['Critical_Rate', 8.1]), critRateTable);

    expect(finishing.chanceAtOrAbove(6.0 + 1e-10)).toBe(1);
    expect(finishing.chanceAtOrAbove(critRateScore(8.1) + 1e-8)).toBe(0);
  });
});
