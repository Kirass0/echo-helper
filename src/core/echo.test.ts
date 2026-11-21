import { describe, expect, it } from 'vitest';
import {
  Echo,
  MAX_TUNE_STAGE,
  SUBSTAT_TYPES,
  echoScore,
  possibleRolls,
  seededRandom,
  substatWeightTable,
  type SubstatType,
} from './index';

// Ported from EchoTests. The possible-rolls tests live in gameData.test.ts.

// Lists every Substat type, at 0 unless given, so only the weight-0 test relies on unlisted types.
function tableWith(weights: Partial<Record<SubstatType, number>>) {
  const all = Object.fromEntries(SUBSTAT_TYPES.map((type) => [type, weights[type] ?? 0]));
  return substatWeightTable('Test', all);
}

// The first Substat of many fresh Echoes, rolled once and shared by the roll odds tests.
const firstSubstats: [SubstatType, number][] = (() => {
  const random = seededRandom(3);
  const substats: [SubstatType, number][] = [];
  for (let i = 0; i < 500_000; i++) {
    const echo = new Echo();
    echo.tune(random);
    substats.push([...echo.substats][0]!);
  }
  return substats;
})();

// Relative, so the 3% tiers are held as tightly as the 23% ones; 10% tells Atk%'s neighbouring 6.8% and 7.8% tiers apart.
function expectShare(expected: number, count: number, total: number) {
  const ratio = count / total / expected;
  expect(ratio).toBeGreaterThanOrEqual(0.9);
  expect(ratio).toBeLessThanOrEqual(1.1);
}

const sum = (numbers: readonly number[]) => numbers.reduce((total, n) => total + n, 0);

describe('Echo', () => {
  it('Echo Score sums weight times roll relative to the Reference Roll', () => {
    const table = tableWith({ Critical_Rate: 6.0, Critical_Damage: 5.0, Atk_Percent: 3.0 });
    const echo = new Echo();
    echo.addSubstat('Critical_Rate', 7.5); // Reference Roll: 6.0 * 1
    echo.addSubstat('Critical_Damage', 21.0); // 21 / 15 of it: 5.0 * 1.4 = 7.0
    echo.addSubstat('Atk_Percent', 6.4); // 6.4 / 8.6 of it: 3.0 * 0.744186 = 2.232558
    echo.addSubstat('Def_Flat', 70); // weight 0

    expect(echoScore(echo, table)).toBeCloseTo(15.23256, 5);
  });

  it('a Substat type the Weight Table does not list adds nothing to the Echo Score', () => {
    const table = substatWeightTable('Crit Rate only', { Critical_Rate: 6.0 });
    const echo = new Echo();
    echo.addSubstat('Critical_Rate', 7.5);
    echo.addSubstat('Energy_Regen', 12.4);

    expect(echoScore(echo, table)).toBeCloseTo(6.0, 5);
  });

  it('Tune Stage is the number of revealed Substats', () => {
    const echo = new Echo();
    expect(echo.tuneStage).toBe(0);

    echo.addSubstat('Critical_Rate', 8.1);
    echo.addSubstat('Skill', 7.9);
    echo.addSubstat('Hp_Flat', 390);

    expect(echo.tuneStage).toBe(3);
  });

  it('a sixth Substat is rejected', () => {
    const echo = new Echo();
    echo.addSubstat('Critical_Rate', 8.1);
    echo.addSubstat('Critical_Damage', 16.2);
    echo.addSubstat('Skill', 7.9);
    echo.addSubstat('Hp_Flat', 390);
    echo.addSubstat('Def_Percent', 10.9);

    expect(() => echo.addSubstat('Atk_Flat', 40)).toThrow(/Tune Stage/);
    expect(echo.tuneStage).toBe(5);
  });

  it('a Substat type added twice is rejected', () => {
    const echo = new Echo();
    echo.addSubstat('Critical_Rate', 8.1);

    expect(() => echo.addSubstat('Critical_Rate', 6.3)).toThrow();
    expect(echo.substats.get('Critical_Rate')).toBe(8.1);
  });

  it('the first Substat is equally likely to be any type', () => {
    const counts = new Map<SubstatType, number>();
    for (const [type] of firstSubstats) counts.set(type, (counts.get(type) ?? 0) + 1);

    for (const type of SUBSTAT_TYPES)
      expectShare(1 / SUBSTAT_TYPES.length, counts.get(type)!, firstSubstats.length);
  });

  const critWeights = [2333, 2333, 2333, 800, 800, 800, 300, 300];
  const percentWeights = [680, 777, 2039, 2428, 1748, 1457, 582, 291];
  const flatWeights = [680 + 777, 2039 + 2428, 1748 + 1457, 582 + 291];
  it.each<[SubstatType, number[], number[]]>([
    ['Critical_Rate', [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5], critWeights],
    ['Critical_Damage', [12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21], critWeights],
    ['Atk_Percent', [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6], percentWeights],
    ['Atk_Flat', [30, 40, 50, 60], flatWeights],
  ])(
    'the first Substat rolls each value of %s as often as its tier weights',
    (type, values, weights) => {
      const rolls = firstSubstats.filter(([rolled]) => rolled === type).map(([, value]) => value);

      values.forEach((value, i) =>
        expectShare(
          weights[i]! / sum(weights),
          rolls.filter((roll) => roll === value).length,
          rolls.length,
        ),
      );
    },
  );

  it('tuning with the same seed reveals the same Substats', () => {
    const first = new Echo();
    first.addSubstat('Critical_Rate', 8.1);
    const second = first.clone();

    first.tuneToMax(seededRandom(42));
    second.tuneToMax(seededRandom(42));

    expect(first.tuneStage).toBe(MAX_TUNE_STAGE);
    expect([...first.substats]).toEqual([...second.substats]);
  });

  it('tuning reveals distinct Substat types with valid rolls', () => {
    const random = seededRandom(7);
    for (let i = 0; i < 200; i++) {
      const echo = new Echo();
      echo.tuneToMax(random);

      expect(echo.substats.size).toBe(MAX_TUNE_STAGE);
      for (const [type, value] of echo.substats)
        expect(possibleRolls(type).map((roll) => roll.value)).toContain(value);
    }
  });
});
