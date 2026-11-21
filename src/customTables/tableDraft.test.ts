import { describe, expect, it } from 'vitest';
import { blankDraft, checkDraft, copyDraft, defaultCopyName, defaultNewName } from './tableDraft';

describe('default names', () => {
  it('names a copy "X (copy)", then "X (copy 2)" and so on, ignoring case', () => {
    expect(defaultCopyName('Aemeath', ['Aemeath'])).toBe('Aemeath (copy)');
    expect(defaultCopyName('Aemeath', ['Aemeath', 'aemeath (COPY)'])).toBe('Aemeath (copy 2)');
    expect(defaultCopyName('Aemeath', ['Aemeath', 'Aemeath (copy)', 'Aemeath (copy 2)'])).toBe(
      'Aemeath (copy 3)',
    );
  });

  it('names a blank table "New Weight Table", then "New Weight Table 2"', () => {
    expect(defaultNewName(['Aemeath'])).toBe('New Weight Table');
    expect(defaultNewName(['new weight table'])).toBe('New Weight Table 2');
    expect(defaultNewName(['New Weight Table', 'New Weight Table 2'])).toBe('New Weight Table 3');
  });

  it('keeps a default name within 40 characters by shortening the copied name', () => {
    const long = 'A'.repeat(38);
    const name = defaultCopyName(long, [long]);
    expect(name).toBe(`${'A'.repeat(33)} (copy)`);
    expect(name).toHaveLength(40);
  });
});

describe('a draft', () => {
  const ALL = ['Aemeath', 'Mornye', 'My table'];

  it('starts from a copy with every weight, 0 for those the table leaves out', () => {
    const draft = copyDraft(
      { name: 'Aemeath', weights: { Critical_Rate: 2, Atk_Flat: 0.25 } },
      ALL,
    );
    expect(draft.name).toBe('Aemeath (copy)');
    expect(Object.keys(draft.weights)).toHaveLength(13);
    expect(draft.weights.Critical_Rate).toBe('2');
    expect(draft.weights.Atk_Flat).toBe('0.25');
    expect(draft.weights.Liberation).toBe('0');
  });

  it('saves as a table of numbers, an empty weight meaning 0, all zeros allowed', () => {
    const draft = blankDraft(ALL);
    const result = checkDraft(
      { ...draft, weights: { ...draft.weights, Critical_Rate: ' 1.5 ', Heavy: '', Skill: '1000' } },
      ALL,
      null,
    );
    expect(result.table?.name).toBe('New Weight Table');
    expect(result.table?.weights.Critical_Rate).toBe(1.5);
    expect(result.table?.weights.Heavy).toBe(0);
    expect(result.table?.weights.Skill).toBe(1000);
    expect(checkDraft(blankDraft(ALL), ALL, null).table).not.toBeNull();
  });

  it('rejects a weight that is not a number of 0 or more, at that weight', () => {
    const draft = blankDraft(ALL);
    for (const text of ['-1', 'abc', 'Infinity', '1,5']) {
      const result = checkDraft(
        { ...draft, weights: { ...draft.weights, Hp_Flat: text } },
        ALL,
        null,
      );
      expect(result.table).toBeNull();
      expect(result.weightErrors).toEqual({ Hp_Flat: 'Enter a number of 0 or more.' });
    }
  });

  it('trims the name and rejects an empty one', () => {
    const draft = blankDraft(ALL);
    expect(checkDraft({ ...draft, name: '  Spaced  ' }, ALL, null).table?.name).toBe('Spaced');
    const empty = checkDraft({ ...draft, name: '   ' }, ALL, null);
    expect(empty.table).toBeNull();
    expect(empty.nameError).toBe('Enter a name.');
  });

  it('rejects a name another table has, ignoring case, but not the edited table’s own', () => {
    const draft = blankDraft(ALL);
    const taken = checkDraft({ ...draft, name: 'mornye ' }, ALL, null);
    expect(taken.table).toBeNull();
    expect(taken.nameError).toBe("'mornye' is already taken.");
    expect(checkDraft({ ...draft, name: 'MY TABLE' }, ALL, 'My table').table?.name).toBe(
      'MY TABLE',
    );
  });
});
