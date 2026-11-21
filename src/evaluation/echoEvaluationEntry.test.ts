import { describe, expect, it } from 'vitest';
import { createStoredEntry, type StorageEnvironment } from '../storage/storedEntry';
import {
  ECHO_EVALUATION_KEY,
  echoEvaluationDefinition,
  type EchoEvaluationState,
  withoutVanishedTables,
} from './echoEvaluationEntry';

function loadFrom(data: unknown) {
  const items = new Map([[ECHO_EVALUATION_KEY, JSON.stringify({ version: 1, data })]]);
  const env: StorageEnvironment = {
    storage: () => ({
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => void items.set(key, value),
      removeItem: (key) => void items.delete(key),
    }),
    events: new EventTarget(),
  };
  return createStoredEntry(echoEvaluationDefinition, env).load();
}

const state: EchoEvaluationState = {
  substats: [
    { type: 'Critical_Rate', value: 8.1 },
    { type: 'Atk_Flat', value: 40 },
  ],
  listed: ['Mornye', 'Carlotta'],
  focused: 'Carlotta',
  targets: {
    Mornye: { targetText: '20', erTargetText: '' },
    'Gone table': { targetText: '12.5', erTargetText: '3' },
  },
};

describe('the Echo Evaluation entry', () => {
  it('starts empty when nothing is stored', () => {
    expect(echoEvaluationDefinition.fallback()).toEqual({
      substats: [],
      listed: [],
      focused: null,
      targets: {},
    });
  });

  it('reads back a valid state as it was, targets of unlisted tables included', () => {
    expect(loadFrom(state)).toEqual(state);
  });

  describe('salvage', () => {
    it('empties a slot with an unknown type or a value outside its set; later Substats move up', () => {
      const loaded = loadFrom({
        ...state,
        substats: [
          { type: 'Critical_Rate', value: 8.1 },
          { type: 'Luck', value: 8.1 },
          { type: 'Critical_Damage', value: 99 },
          { type: 'Critical_Damage', value: '16.2' },
          null,
          { type: 'Atk_Flat', value: 40 },
        ],
      });
      expect(loaded.substats).toEqual([
        { type: 'Critical_Rate', value: 8.1 },
        { type: 'Atk_Flat', value: 40 },
      ]);
    });

    it('empties a slot repeating a type already on the Echo, and keeps at most five', () => {
      const loaded = loadFrom({
        ...state,
        substats: [
          { type: 'Critical_Rate', value: 8.1 },
          { type: 'Critical_Rate', value: 6.3 },
          { type: 'Critical_Damage', value: 16.2 },
          { type: 'Atk_Flat', value: 40 },
          { type: 'Hp_Flat', value: 390 },
          { type: 'Def_Flat', value: 50 },
          { type: 'Energy_Regen', value: 8.4 },
        ],
      });
      expect(loaded.substats.map((substat) => substat.type)).toEqual([
        'Critical_Rate',
        'Critical_Damage',
        'Atk_Flat',
        'Hp_Flat',
        'Def_Flat',
      ]);
    });

    it('drops listed names that are not names, and repeats', () => {
      const loaded = loadFrom({ ...state, listed: ['Mornye', 7, '', 'Mornye', 'Carlotta'] });
      expect(loaded.listed).toEqual(['Mornye', 'Carlotta']);
    });

    it('clears bad targets and keeps the good one beside them', () => {
      const loaded = loadFrom({
        ...state,
        targets: {
          Mornye: { targetText: 'abc', erTargetText: '3' },
          Carlotta: { targetText: 20, erTargetText: '-1' },
          Broken: 'not targets',
        },
      });
      expect(loaded.targets).toEqual({
        Mornye: { targetText: '', erTargetText: '3' },
        Carlotta: { targetText: '', erTargetText: '' },
      });
    });

    it.each([
      ['missing', undefined],
      ['not a listed table', 'Nobody'],
      ['not a name', 3],
    ])('falls back to the first listed table when focus is %s', (_, focused) => {
      expect(loadFrom({ ...state, focused }).focused).toBe('Mornye');
    });

    it('has no focus when no table is listed', () => {
      expect(loadFrom({ ...state, listed: [], focused: 'Mornye' }).focused).toBeNull();
    });

    it('salvages each part on its own when others are missing', () => {
      expect(loadFrom({ listed: ['Mornye'] })).toEqual({
        substats: [],
        listed: ['Mornye'],
        focused: 'Mornye',
        targets: {},
      });
    });

    it('resets when the data is not an object', () => {
      expect(loadFrom('nonsense')).toEqual(echoEvaluationDefinition.fallback());
    });
  });
});

describe('a listed table that no longer exists', () => {
  const listed = (names: string[], focused: string | null): EchoEvaluationState => ({
    ...state,
    listed: names,
    focused,
  });
  const existing =
    (...names: string[]) =>
    (name: string) =>
      names.includes(name);

  it('leaves the state as it is when every listed table exists', () => {
    const before = listed(['A', 'B'], 'B');
    expect(withoutVanishedTables(before, existing('A', 'B'))).toBe(before);
  });

  it('loses its row; focus elsewhere stays, and its targets are kept', () => {
    const after = withoutVanishedTables(listed(['A', 'B', 'C'], 'C'), existing('A', 'C'));
    expect(after).toEqual({ ...listed(['A', 'C'], 'C'), targets: state.targets });
  });

  it('in focus, passes focus to the next row', () => {
    const after = withoutVanishedTables(listed(['A', 'B', 'C'], 'B'), existing('A', 'C'));
    expect(after.focused).toBe('C');
  });

  it('in focus and last, passes focus to the row above', () => {
    const after = withoutVanishedTables(listed(['A', 'B', 'C'], 'C'), existing('A', 'B'));
    expect(after.focused).toBe('B');
  });

  it('in focus beside other vanished rows, passes focus to the next row that is left', () => {
    const after = withoutVanishedTables(listed(['A', 'B', 'C', 'D'], 'B'), existing('A', 'D'));
    expect(after).toMatchObject({ listed: ['A', 'D'], focused: 'D' });
  });

  it('leaves no focus when no row is left', () => {
    const after = withoutVanishedTables(listed(['A', 'B'], 'A'), existing());
    expect(after).toMatchObject({ listed: [], focused: null });
  });
});
