import { describe, expect, it } from 'vitest';
import raw from './builtInWeightTables.json';
import { BUILT_IN_TABLES, catalogueProblems } from './catalogue';

// The catalogue check (spec §4). It blocks the deploy, so a bad edit to the JSON file never ships.
describe('the built-in catalogue', () => {
  it('passes the catalogue check', () => {
    expect(catalogueProblems(raw)).toEqual([]);
  });

  it('starts as the 61 tables of the owner’s file', () => {
    expect(BUILT_IN_TABLES).toHaveLength(61);
  });

  it('is sorted alphabetically for the pickers', () => {
    const names = BUILT_IN_TABLES.map((table) => table.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('the catalogue check', () => {
  const good = { name: 'Aemeath', weights: { Critical_Rate: 6, Critical_Damage: 5.5 } };

  it('rejects an empty catalogue', () => {
    expect(catalogueProblems([])).toEqual(['The catalogue is empty.']);
  });

  it('rejects anything but an array of tables', () => {
    expect(catalogueProblems({ tables: [good] })).toEqual(['The catalogue is not an array.']);
    expect(catalogueProblems([good, 'Aemeath'])).toEqual(['Table 2 is not an object.']);
  });

  it('rejects an unknown property', () => {
    expect(catalogueProblems([{ ...good, source: 'ChemX32' }])).toEqual([
      "'Aemeath' has an unknown property 'source'.",
    ]);
  });

  it('rejects an unknown Substat type', () => {
    expect(catalogueProblems([{ name: 'Aemeath', weights: { Crit_Rate: 6 } }])).toEqual([
      "'Aemeath' has an unknown Substat type 'Crit_Rate'.",
    ]);
  });

  it('rejects a weight that is negative, not finite or not a number', () => {
    expect(
      catalogueProblems([
        { name: 'A', weights: { Critical_Rate: -1 } },
        { name: 'B', weights: { Critical_Rate: '6' } },
        { name: 'C', weights: { Critical_Rate: null } },
      ]),
    ).toEqual([
      "'A' has a Critical_Rate weight that is not a number of 0 or more.",
      "'B' has a Critical_Rate weight that is not a number of 0 or more.",
      "'C' has a Critical_Rate weight that is not a number of 0 or more.",
    ]);
  });

  it('rejects a missing weights object', () => {
    expect(catalogueProblems([{ name: 'Aemeath' }])).toEqual(["'Aemeath' has no weights."]);
  });

  it('rejects an empty, too long or missing name', () => {
    expect(
      catalogueProblems([
        { name: '  ', weights: {} },
        { name: 'x'.repeat(41), weights: {} },
        { weights: {} },
      ]),
    ).toEqual([
      'Table 1 has an empty name.',
      `'${'x'.repeat(41)}' has a name longer than 40 characters.`,
      'Table 3 has no name.',
    ]);
  });

  it('accepts a name of exactly 40 characters', () => {
    expect(catalogueProblems([{ name: 'x'.repeat(40), weights: {} }])).toEqual([]);
  });

  it('rejects names that are equal ignoring case', () => {
    expect(
      catalogueProblems([good, { ...good, name: 'AEMEATH' }, { ...good, name: 'Aemeath (FB)' }]),
    ).toEqual(["'AEMEATH' has the same name as another table, ignoring case."]);
  });
});
