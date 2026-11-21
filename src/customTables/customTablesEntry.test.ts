import { describe, expect, it } from 'vitest';
import { salvageCustomTables } from './customTablesEntry';

const table = (name: string, weights: Record<string, unknown> = { Critical_Rate: 2 }) => ({
  name,
  weights,
});

describe('salvaging stored Custom Weight Tables', () => {
  it('keeps every readable table as it was', () => {
    const stored = [table('Mine'), table('Other', { Atk_Percent: 0.5, Hp_Flat: 0 })];
    expect(salvageCustomTables(stored, [])).toEqual({ tables: stored, lost: 0, renamed: [] });
  });

  it('drops a table with a bad weight, an empty name or a name over 40 characters', () => {
    const stored = [
      table('Negative', { Critical_Rate: -1 }),
      table('Text', { Critical_Rate: '3' }),
      table('Unknown Substat', { Luck: 1 }),
      { name: 'No weights' },
      table('   '),
      table('x'.repeat(41)),
      'not a table',
      table('Kept'),
      table('y'.repeat(40)),
    ];
    const { tables, lost } = salvageCustomTables(stored, []);
    expect(tables.map((kept) => kept.name)).toEqual(['Kept', 'y'.repeat(40)]);
    expect(lost).toBe(7);
  });

  it('renames a duplicate name, ignoring case, by the "(custom)" rule, quietly', () => {
    const stored = [table('Mine'), table('mine'), table('MINE'), table('Mine (custom)')];
    const { tables, renamed } = salvageCustomTables(stored, []);
    expect(tables.map((kept) => kept.name)).toEqual([
      'Mine',
      'mine (custom 2)',
      'MINE (custom 3)',
      'Mine (custom)',
    ]);
    expect(renamed).toEqual([]);
  });

  it('gives a name a new built-in has taken to the built-in, and reports the rename', () => {
    const stored = [table('Carlotta'), table('Carlotta (custom)'), table('Mine')];
    const { tables, renamed } = salvageCustomTables(stored, ['Carlotta']);
    expect(tables.map((kept) => kept.name)).toEqual([
      'Carlotta (custom 2)',
      'Carlotta (custom)',
      'Mine',
    ]);
    expect(renamed).toEqual([{ builtIn: 'Carlotta', from: 'Carlotta', to: 'Carlotta (custom 2)' }]);
  });

  it('keeps a renamed name within 40 characters', () => {
    const long = 'z'.repeat(40);
    const { tables } = salvageCustomTables([table(long)], [long]);
    expect(tables[0]?.name).toBe(`${'z'.repeat(31)} (custom)`);
  });

  it('throws for data that is not a list of tables, so the entry resets', () => {
    expect(() => salvageCustomTables({ tables: [] }, [])).toThrow();
  });
});
