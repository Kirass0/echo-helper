import { describe, expect, it } from 'vitest';
import { createStoredEntry, type StorageEnvironment } from '../storage/storedEntry';
import type { RuleDraft, StrategyDraft } from './strategyDraft';
import {
  UPGRADE_STRATEGY_KEY,
  upgradeStrategyDefinition,
  type UpgradeStrategyState,
} from './upgradeStrategyEntry';

function loadFrom(data: unknown) {
  const items = new Map([[UPGRADE_STRATEGY_KEY, JSON.stringify({ version: 1, data })]]);
  const env: StorageEnvironment = {
    storage: () => ({
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => void items.set(key, value),
      removeItem: (key) => void items.delete(key),
    }),
    events: new EventTarget(),
  };
  return createStoredEntry(upgradeStrategyDefinition, env).load();
}

/** A rule as stored: every kind's fields. */
const rule = (fields: Partial<RuleDraft> = {}): RuleDraft => ({
  id: 'rule-x',
  kind: 'substatCount',
  count: 1,
  substatTypes: ['Critical_Rate'],
  substatType: 'Critical_Rate',
  minValue: 6.3,
  echoScoreText: '',
  chanceText: '',
  targetScoreText: '',
  ...fields,
});

const strategy = (...stages: RuleDraft[][][]): StrategyDraft => ({
  stages: [0, 1, 2, 3, 4].map((i) => stages[i] ?? []),
});

/** What a rule holds apart from its id, which is only for telling rules apart while editing. */
const withoutIds = (draft: StrategyDraft | null) =>
  draft &&
  draft.stages.map((boxes) =>
    boxes.map((rules) => rules.map((rule) => ({ ...rule, id: undefined }))),
  );

const firstRule = (draft: StrategyDraft) => draft.stages[0]?.[0]?.[0];

describe('the Upgrade Strategy entry', () => {
  it('holds "Crit first" with no table and no Strategy B when nothing is stored', () => {
    const fallback = upgradeStrategyDefinition.fallback();
    expect(fallback.table).toBeNull();
    expect(fallback.b).toBeNull();
    expect(fallback.a.stages[1]?.[0]?.[0]).toMatchObject({
      kind: 'substatCount',
      substatTypes: ['Critical_Rate', 'Critical_Damage'],
    });
  });

  it('reads back what it stored: the table, Strategy A with its unfinished rules, and Strategy B', () => {
    const stored: UpgradeStrategyState = {
      table: 'Mornye',
      a: strategy(
        [[rule({ kind: 'echoScore', echoScoreText: '12.5', substatTypes: [] })]],
        [],
        [[rule(), rule({ kind: 'targetChance', chanceText: '30', targetScoreText: '' })]],
      ),
      b: strategy([], [[rule({ kind: 'substatRoll', substatType: 'Atk_Percent', minValue: 7.9 })]]),
    };
    const loaded = loadFrom(stored);
    expect(loaded.table).toBe('Mornye');
    expect(withoutIds(loaded.a)).toEqual(withoutIds(stored.a));
    expect(withoutIds(loaded.b)).toEqual(withoutIds(stored.b));
  });

  it('gives every rule read a new id of its own', () => {
    const loaded = loadFrom({ table: null, a: strategy([[rule(), rule()]]), b: null });
    const ids = loaded.a.stages[0]?.[0]?.map((read) => read.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids).not.toContain('rule-x');
  });

  it('removes an unknown Substat from its rule, which may leave it unfinished', () => {
    const loaded = loadFrom({
      table: null,
      a: strategy([
        [rule({ substatTypes: ['Luck', 'Critical_Damage'] as never })],
        [rule({ substatTypes: ['Luck'] as never })],
      ]),
      b: null,
    });
    expect(loaded.a.stages[0]?.[0]?.[0]?.substatTypes).toEqual(['Critical_Damage']);
    expect(loaded.a.stages[0]?.[1]?.[0]?.substatTypes).toEqual([]);
  });

  it('gives a Substat Roll rule with an unknown Substat, or a value that Substat never rolls, the new rule’s fields', () => {
    const unknown = loadFrom({
      table: null,
      a: strategy([[rule({ kind: 'substatRoll', substatType: 'Luck' as never, minValue: 9 })]]),
      b: null,
    });
    expect(firstRule(unknown.a)).toMatchObject({ substatType: 'Critical_Rate', minValue: 6.3 });
    const offTheSet = loadFrom({
      table: null,
      a: strategy([[rule({ kind: 'substatRoll', substatType: 'Atk_Percent', minValue: 7 })]]),
      b: null,
    });
    expect(firstRule(offTheSet.a)).toMatchObject({ substatType: 'Atk_Percent', minValue: 6.4 });
  });

  it('clears a field that is not a number', () => {
    const loaded = loadFrom({
      table: null,
      a: strategy([
        [
          {
            ...rule({ kind: 'targetChance' }),
            count: 'two' as never,
            echoScoreText: 'abc',
            chanceText: 25 as never,
            targetScoreText: '-1',
          },
        ],
      ]),
      b: null,
    });
    expect(firstRule(loaded.a)).toMatchObject({
      kind: 'targetChance',
      count: 1,
      echoScoreText: '',
      chanceText: '25',
      targetScoreText: '',
    });
  });

  it('drops a rule of no known kind, and a box left without rules', () => {
    const loaded = loadFrom({
      table: null,
      a: strategy([[rule({ kind: 'magic' as never })], [rule(), 'junk' as never]]),
      b: null,
    });
    expect(loaded.a.stages[0]).toHaveLength(1);
    expect(loaded.a.stages[0]?.[0]).toHaveLength(1);
  });

  it('keeps five Tune Stages, emptying one that is not a list', () => {
    const loaded = loadFrom({
      table: null,
      a: { stages: ['junk', [[rule()]]] },
      b: null,
    });
    expect(loaded.a.stages).toHaveLength(5);
    expect(loaded.a.stages[0]).toEqual([]);
    expect(loaded.a.stages[1]).toHaveLength(1);
  });

  it('drops a bad Strategy B, leaving compare mode', () => {
    const a = strategy([[rule()]]);
    expect(loadFrom({ table: 'Mornye', a, b: 'junk' }).b).toBeNull();
    expect(loadFrom({ table: 'Mornye', a, b: { stages: 3 } }).b).toBeNull();
    expect(withoutIds(loadFrom({ table: 'Mornye', a, b: 'junk' }).a)).toEqual(withoutIds(a));
  });

  it('holds an empty Strategy A, and no table, for what cannot be read as one', () => {
    const loaded = loadFrom({ table: 7, a: 'junk', b: null });
    expect(loaded.table).toBeNull();
    expect(loaded.a.stages).toEqual([[], [], [], [], []]);
  });
});
