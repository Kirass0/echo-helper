import { describe, expect, it } from 'vitest';
import {
  Echo,
  echoScore,
  echoScoreDistribution,
  evaluateEcho,
  finishingEchoScores,
  finishingEchoScoresFor,
  shiftedFinishingEchoScores,
  substatWeightTable,
  type EchoEvaluation,
  type SubstatType,
} from './index';

// Reusing finishing tables (spec §3, "Caching"): values only shift a finishing table, and a fresh Echo's finishing
// table is the whole-table distribution.

const table = substatWeightTable('Mixed', {
  Critical_Rate: 2,
  Critical_Damage: 1,
  Atk_Percent: 0.75,
  Energy_Regen: 0.5,
  Atk_Flat: 0.25,
});

function echoWith(...substats: [SubstatType, number][]): Echo {
  const echo = new Echo();
  for (const [type, value] of substats) echo.addSubstat(type, value);
  return echo;
}

function expectSameEvaluation(actual: EchoEvaluation, expected: EchoEvaluation) {
  const { outlook, ...rest } = actual;
  const { outlook: expectedOutlook, ...expectedRest } = expected;
  expect(rest).toEqual(expectedRest);
  expect(outlook === null).toBe(expectedOutlook === null);
  if (!outlook || !expectedOutlook) return;
  for (const key of [
    'best',
    'worst',
    'average',
    'median',
    'targetChance',
    'erTargetChance',
  ] as const)
    expect(outlook[key] ?? NaN).toBeCloseTo(expectedOutlook[key] ?? NaN, 9);
  expect(outlook.distribution.length).toBe(expectedOutlook.distribution.length);
  outlook.distribution.forEach((point, i) => {
    expect(point.threshold).toBeCloseTo(expectedOutlook.distribution[i]!.threshold, 9);
    expect(point.chance).toBeCloseTo(expectedOutlook.distribution[i]!.chance, 9);
  });
}

describe('shiftedFinishingEchoScores', () => {
  it('turns the finishing table of one value into that of another value of the same types, exactly', () => {
    const before = echoWith(['Critical_Rate', 6.3], ['Energy_Regen', 6.8]);
    const after = echoWith(['Critical_Rate', 9.9], ['Energy_Regen', 12.4]);
    const shifted = shiftedFinishingEchoScores(
      finishingEchoScoresFor(['Critical_Rate', 'Energy_Regen'], 0, table),
      echoScore(after, table),
    );
    const built = finishingEchoScores(after, table);

    expect(shifted.scores).toEqual(built.scores);
    expect(shifted.chances).toEqual(built.chances);
    expect(shifted.chancesWithEr).toEqual(built.chancesWithEr);
    expect(shifted.outcomes).toEqual(built.outcomes);
    for (const score of [8, 10, 12.5, 20])
      expect([shifted.chanceAtOrAbove(score), shifted.chanceWithErAtOrAbove(score)]).toEqual([
        built.chanceAtOrAbove(score),
        built.chanceWithErAtOrAbove(score),
      ]);
    expect(finishingEchoScores(before, table).scores).not.toEqual(built.scores);
  });
});

describe('the whole-table distribution', () => {
  // Not bit-identical: the whole-table distribution sums each outcome's contributions with Energy Regen last
  // (`TYPES_ER_LAST`, as C#'s EchoValueDistribution), while a finishing table sums them in `SUBSTAT_TYPES` order (as
  // C#'s finishing table). Both orders come from the C# source and stay (spec §3 bit-exact parity), so Echo Scores can
  // differ by about 1e-15, well within the 1e-9 tolerance results are compared at.
  const TOLERANCE = 1e-12;
  const expectNear = (actual: number | undefined, expected: number | undefined) =>
    expect(Math.abs(actual! - expected!)).toBeLessThanOrEqual(TOLERANCE);

  it('is the finishing table of a fresh Echo', () => {
    const fresh = echoScoreDistribution(table).freshEchoFinishing;
    const built = finishingEchoScoresFor([], 0, table);
    for (const score of [0, 1, 2.5, 5, 7.5, 10]) {
      expectNear(fresh.chanceAtOrAbove(score), built.chanceAtOrAbove(score));
      expectNear(fresh.chanceWithErAtOrAbove(score), built.chanceWithErAtOrAbove(score));
    }
    expectNear(fresh.scores[0], built.scores[0]);
    expectNear(fresh.scores.at(-1), built.scores.at(-1));
  });
});

describe('evaluateEcho with a finishing table already built', () => {
  it.each([
    ['a fresh Echo', echoWith()],
    ['a partly tuned Echo', echoWith(['Critical_Rate', 8.1], ['Atk_Flat', 40])],
    [
      'a 5/5 Echo',
      echoWith(
        ['Critical_Rate', 8.1],
        ['Atk_Flat', 40],
        ['Energy_Regen', 9.2],
        ['Hp_Flat', 430],
        ['Def_Flat', 50],
      ),
    ],
  ])('gives the same evaluation for %s', (_, echo) => {
    const finishing =
      echo.tuneStage === 0
        ? echoScoreDistribution(table).freshEchoFinishing
        : shiftedFinishingEchoScores(
            finishingEchoScoresFor([...echo.substats.keys()], 0, table),
            echoScore(echo, table),
          );
    expectSameEvaluation(
      evaluateEcho(echo, table, 3, 2, { finishing }),
      evaluateEcho(echo, table, 3, 2),
    );
  });
});
