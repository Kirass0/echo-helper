import { describe, expect, it } from 'vitest';
import { addTuningCosts, tuningCost } from './index';

// Ported from TuningCostTests.
describe('tuningCost', () => {
  it.each([
    [0, 0, 0, 0],
    [1, 4_400, 10, 2_440],
    [2, 16_500, 20, 5_650],
    [3, 39_600, 30, 9_960],
    [4, 79_100, 40, 15_910],
    [5, 142_600, 50, 24_260],
  ])(
    'an Echo tuned to Tune Stage %i and not discarded costs everything spent to tune it there',
    (stage, exp, tuners, shellCredits) => {
      expect(tuningCost(stage, false)).toEqual({ exp, tuners, shellCredits });
    },
  );

  // 75% of the EXP and 30% of the Tuners come back, rounded in the player's disfavour; Shell Credits don't.
  it.each([
    [0, 0, 0, 0],
    [1, 1_100, 7, 2_440],
    [2, 4_125, 14, 5_650],
    [3, 9_900, 21, 9_960],
    [4, 19_775, 28, 15_910],
    [5, 35_650, 35, 24_260],
  ])(
    'a discarded Echo at Tune Stage %i costs what the refund does not give back',
    (stage, exp, tuners, shellCredits) => {
      expect(tuningCost(stage, true)).toEqual({ exp, tuners, shellCredits });
    },
  );

  it.each([-1, 6, 2.5])('a Tune Stage outside 0 to 5 (%d) is rejected', (stage) => {
    expect(() => tuningCost(stage, false)).toThrow(RangeError);
  });

  it('costs add up field by field', () => {
    expect(
      addTuningCosts(
        { exp: 1, tuners: 2, shellCredits: 3 },
        { exp: 4, tuners: 5, shellCredits: 6 },
      ),
    ).toEqual({ exp: 5, tuners: 7, shellCredits: 9 });
  });
});
