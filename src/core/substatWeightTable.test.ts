import { describe, expect, it } from 'vitest';
import { substatWeightTable, type SubstatType } from './index';

// Ported from ValueTableTests.
describe('substatWeightTable', () => {
  it('a Substat type the table does not list has weight 0', () => {
    const table = substatWeightTable('Crit only', { Critical_Rate: 6.0 });

    expect(table.weightOf('Critical_Rate')).toBe(6.0);
    expect(table.weightOf('Energy_Regen')).toBe(0.0);
  });

  it('changing the weights it was built from does not change the table', () => {
    const weights: Partial<Record<SubstatType, number>> = { Critical_Rate: 6.0 };
    const table = substatWeightTable('Crit only', weights);

    weights.Critical_Rate = 1.0;
    weights.Skill = 2.0;

    expect(table.weightOf('Critical_Rate')).toBe(6.0);
    expect(table.weightOf('Skill')).toBe(0.0);
  });
});
