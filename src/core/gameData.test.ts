import { describe, expect, it } from 'vitest';
import { possibleRolls, referenceRoll, SUBSTAT_TYPES, type SubstatType } from './index';

describe('referenceRoll', () => {
  // Spec §3: the 13 values the computation must give.
  it.each<[SubstatType, number]>([
    ['Critical_Rate', 7.5],
    ['Critical_Damage', 15],
    ['Def_Flat', 50],
    ['Atk_Percent', 8.6],
    ['Hp_Percent', 8.6],
    ['Basic_Attack', 8.6],
    ['Heavy', 8.6],
    ['Skill', 8.6],
    ['Liberation', 8.6],
    ['Def_Percent', 10.9],
    ['Energy_Regen', 9.2],
    ['Hp_Flat', 430],
    ['Atk_Flat', 40],
  ])('the Reference Roll of %s is %d', (type, expected) => {
    expect(referenceRoll(type)).toBe(expected);
  });

  it('covers all 13 Substat types', () => {
    expect(SUBSTAT_TYPES).toHaveLength(13);
  });
});

describe('possibleRolls', () => {
  // EchoTests.Possible_rolls_are_the_distinct_values_with_their_chances
  const critWeights = [2333, 2333, 2333, 800, 800, 800, 300, 300];
  const percentWeights = [680, 777, 2039, 2428, 1748, 1457, 582, 291];
  const flatWeights = [680 + 777, 2039 + 2428, 1748 + 1457, 582 + 291];
  it.each<[SubstatType, number[], number[]]>([
    ['Critical_Rate', [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5], critWeights],
    ['Atk_Percent', [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6], percentWeights],
    ['Atk_Flat', [30, 40, 50, 60], flatWeights],
    ['Def_Flat', [40, 50, 60, 70], flatWeights],
  ])('possible rolls of %s are the distinct values with their chances', (type, values, weights) => {
    const rolls = possibleRolls(type);
    const total = weights.reduce((a, b) => a + b, 0);

    expect(rolls.map((roll) => roll.value)).toEqual(values);
    rolls.forEach((roll, i) => expect(roll.chance).toBeCloseTo(weights[i]! / total, 12));
  });

  // EchoTests.Each_substat_type_has_ascending_possible_rolls_whose_chances_sum_to_one
  it('each Substat type has ascending possible rolls whose chances sum to one', () => {
    for (const type of SUBSTAT_TYPES) {
      const values = possibleRolls(type).map((roll) => roll.value);
      expect([...new Set(values)].sort((a, b) => a - b)).toEqual(values);
      const sum = possibleRolls(type).reduce((total, roll) => total + roll.chance, 0);
      expect(sum).toBeCloseTo(1, 12);
    }
  });
});
