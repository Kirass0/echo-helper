import { describe, expect, it } from 'vitest';
import { createStoredEntry, type EntryDefinition, type StorageEnvironment } from './storedEntry';

/** An in-memory stand-in for `localStorage` plus the `storage` event target. */
function memoryEnvironment(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const events = new EventTarget();
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
  const env: StorageEnvironment = { storage: () => storage, events };
  /** Simulates another tab writing (or removing) `key`. */
  function otherTabWrites(key: string, newValue: string | null) {
    if (newValue === null) items.delete(key);
    else items.set(key, newValue);
    events.dispatchEvent(Object.assign(new Event('storage'), { key, newValue }));
  }
  return { items, env, otherTabWrites };
}

interface Counter {
  count: number;
}

const counterV1: EntryDefinition<Counter> = {
  key: 'test.counter',
  version: 1,
  fallback: () => ({ count: 0 }),
  validate: (data) => {
    if (typeof data !== 'object' || data === null) throw new Error('not an object');
    const count = (data as { count?: unknown }).count;
    return { count: typeof count === 'number' ? count : 0 };
  },
};

describe('stored entry', () => {
  it('starts from the fallback when nothing is stored', () => {
    const { env } = memoryEnvironment();
    expect(createStoredEntry(counterV1, env).load()).toEqual({ count: 0 });
  });

  it('reads back what it saved, as JSON tagged with its version', () => {
    const { env, items } = memoryEnvironment();
    createStoredEntry(counterV1, env).save({ count: 3 });
    expect(JSON.parse(items.get('test.counter') ?? '')).toEqual({ version: 1, data: { count: 3 } });
    expect(createStoredEntry(counterV1, env).load()).toEqual({ count: 3 });
  });

  describe('migration', () => {
    // v1 stored { n }, v2 renamed it to { count }, v3 doubled the count.
    const counterV3: EntryDefinition<Counter> = {
      ...counterV1,
      version: 3,
      migrations: {
        1: (old) => ({ count: (old as { n: number }).n }),
        2: (old) => ({ count: (old as Counter).count * 2 }),
      },
    };
    const stored = (version: number, data: unknown) => JSON.stringify({ version, data });

    it('runs the chained steps from an older version and writes the result back', () => {
      const { env, items } = memoryEnvironment({ 'test.counter': stored(1, { n: 5 }) });
      expect(createStoredEntry(counterV3, env).load()).toEqual({ count: 10 });
      expect(JSON.parse(items.get('test.counter') ?? '')).toEqual({
        version: 3,
        data: { count: 10 },
      });
    });

    it('starts a chain part-way when the stored version is in the middle', () => {
      const { env } = memoryEnvironment({ 'test.counter': stored(2, { count: 4 }) });
      expect(createStoredEntry(counterV3, env).load()).toEqual({ count: 8 });
    });

    it('resets the entry when a step is missing', () => {
      const noStepFromOne = { ...counterV3, migrations: { 2: counterV3.migrations?.[2] } };
      const { env, items } = memoryEnvironment({
        'test.counter': stored(1, { n: 5 }),
        'test.other': 'untouched',
      });
      expect(createStoredEntry(noStepFromOne, env).load()).toEqual({ count: 0 });
      expect(items.has('test.counter')).toBe(false);
      expect(items.get('test.other')).toBe('untouched');
    });

    it('resets the entry when a step fails', () => {
      const failing: EntryDefinition<Counter> = {
        ...counterV3,
        migrations: {
          ...counterV3.migrations,
          1: () => {
            throw new Error('cannot migrate');
          },
        },
      };
      const { env, items } = memoryEnvironment({ 'test.counter': stored(1, { n: 5 }) });
      expect(createStoredEntry(failing, env).load()).toEqual({ count: 0 });
      expect(items.has('test.counter')).toBe(false);
    });

    it('resets the entry when the version is not a known one', () => {
      const { env, items } = memoryEnvironment({ 'test.counter': stored(0, { n: 5 }) });
      expect(createStoredEntry(counterV3, env).load()).toEqual({ count: 0 });
      expect(items.has('test.counter')).toBe(false);
    });
  });

  describe('unreadable contents', () => {
    it.each([
      ['broken JSON', '{"version":1,"data":{'],
      ['JSON without a version', '{"count":3}'],
      ['a bare JSON value', '42'],
      ['JSON null', 'null'],
    ])('drops the entry holding %s', (_, raw) => {
      const { env, items } = memoryEnvironment({ 'test.counter': raw, 'test.other': 'untouched' });
      expect(createStoredEntry(counterV1, env).load()).toEqual({ count: 0 });
      expect(items.has('test.counter')).toBe(false);
      expect(items.get('test.other')).toBe('untouched');
    });

    it('resets the entry when the validator rejects its data', () => {
      const { env, items } = memoryEnvironment({
        'test.counter': JSON.stringify({ version: 1, data: 'not an object' }),
      });
      expect(createStoredEntry(counterV1, env).load()).toEqual({ count: 0 });
      expect(items.has('test.counter')).toBe(false);
    });

    it('keeps what the validator salvages', () => {
      const { env } = memoryEnvironment({
        'test.counter': JSON.stringify({ version: 1, data: { count: 'seven' } }),
      });
      expect(createStoredEntry(counterV1, env).load()).toEqual({ count: 0 });
    });
  });

  describe('an entry from a newer version', () => {
    const newer = JSON.stringify({ version: 2, data: { count: 99, extra: true } });

    it('is never read: the app starts from the fallback', () => {
      const { env } = memoryEnvironment({ 'test.counter': newer });
      expect(createStoredEntry(counterV1, env).load()).toEqual({ count: 0 });
    });

    it('is never written: saves until reload leave it as it is', () => {
      const { env, items } = memoryEnvironment({ 'test.counter': newer });
      const entry = createStoredEntry(counterV1, env);
      entry.load();
      entry.save({ count: 1 });
      expect(items.get('test.counter')).toBe(newer);
    });

    it('leaves other entries saving normally', () => {
      const { env, items } = memoryEnvironment({ 'test.counter': newer });
      createStoredEntry(counterV1, env).load();
      createStoredEntry({ ...counterV1, key: 'test.other' }, env).save({ count: 2 });
      expect(JSON.parse(items.get('test.other') ?? '')).toEqual({ version: 1, data: { count: 2 } });
    });
  });

  describe('unavailable storage', () => {
    const fail = () => {
      throw new DOMException('denied', 'SecurityError');
    };

    it('works and remembers nothing when reaching storage throws', () => {
      const env: StorageEnvironment = { storage: fail, events: new EventTarget() };
      const entry = createStoredEntry(counterV1, env);
      expect(entry.load()).toEqual({ count: 0 });
      expect(() => entry.save({ count: 1 })).not.toThrow();
    });

    it('works and remembers nothing when there is no storage', () => {
      const entry = createStoredEntry(counterV1, {
        storage: () => null,
        events: new EventTarget(),
      });
      expect(entry.load()).toEqual({ count: 0 });
      expect(() => entry.save({ count: 1 })).not.toThrow();
    });

    it('stays silent when every storage call throws (full or broken storage)', () => {
      const broken = { getItem: fail, setItem: fail, removeItem: fail };
      const entry = createStoredEntry(counterV1, {
        storage: () => broken,
        events: new EventTarget(),
      });
      expect(entry.load()).toEqual({ count: 0 });
      expect(() => entry.save({ count: 1 })).not.toThrow();
    });

    it('stays silent when a migration cannot write back', () => {
      const readOnly = {
        getItem: () => JSON.stringify({ version: 1, data: { n: 5 } }),
        setItem: fail,
        removeItem: fail,
      };
      const v2: EntryDefinition<Counter> = {
        ...counterV1,
        version: 2,
        migrations: { 1: (old) => ({ count: (old as { n: number }).n }) },
      };
      const entry = createStoredEntry(v2, { storage: () => readOnly, events: new EventTarget() });
      expect(entry.load()).toEqual({ count: 5 });
    });
  });

  describe('changes from other tabs', () => {
    function watch(env: StorageEnvironment, definition = counterV1) {
      const entry = createStoredEntry(definition, env);
      entry.load();
      const seen: Counter[] = [];
      const stop = entry.subscribe((value) => seen.push(value));
      return { entry, seen, stop };
    }

    it('takes on a value another tab saved', () => {
      const { env, otherTabWrites } = memoryEnvironment();
      const { seen } = watch(env);
      otherTabWrites('test.counter', JSON.stringify({ version: 1, data: { count: 7 } }));
      expect(seen).toEqual([{ count: 7 }]);
    });

    it('ignores changes to other keys', () => {
      const { env, otherTabWrites } = memoryEnvironment();
      const { seen } = watch(env);
      otherTabWrites('test.other', JSON.stringify({ version: 1, data: { count: 7 } }));
      expect(seen).toEqual([]);
    });

    it('reads the change by the same rules as on load', () => {
      const v2: EntryDefinition<Counter> = {
        ...counterV1,
        version: 2,
        migrations: { 1: (old) => ({ count: (old as { n: number }).n }) },
      };
      const { env, otherTabWrites } = memoryEnvironment();
      const { seen } = watch(env, v2);
      otherTabWrites('test.counter', JSON.stringify({ version: 1, data: { n: 4 } }));
      otherTabWrites('test.counter', '{broken');
      otherTabWrites('test.counter', null);
      expect(seen).toEqual([{ count: 4 }, { count: 0 }, { count: 0 }]);
    });

    it('treats a newer version from another tab as never read nor written', () => {
      const { env, items, otherTabWrites } = memoryEnvironment();
      const { entry, seen } = watch(env);
      const newer = JSON.stringify({ version: 2, data: { count: 9 } });
      otherTabWrites('test.counter', newer);
      entry.save({ count: 1 });
      expect(seen).toEqual([]);
      expect(items.get('test.counter')).toBe(newer);
    });

    it('stops listening when unsubscribed', () => {
      const { env, otherTabWrites } = memoryEnvironment();
      const { seen, stop } = watch(env);
      stop();
      otherTabWrites('test.counter', JSON.stringify({ version: 1, data: { count: 7 } }));
      expect(seen).toEqual([]);
    });
  });
});
