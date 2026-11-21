/**
 * A versioned `localStorage` JSON entry (spec §12). Each stored part of the app (Custom tables,
 * Echo Evaluation, Upgrade Strategy, Theme) defines one entry with its own key, version,
 * migrations and validator; this module applies the shared rules:
 *
 * - stored as `{ "version": n, "data": ... }`;
 * - an older version runs the chained steps vN → vN+1 and writes the result back; a missing or
 *   failing step resets only this entry;
 * - broken JSON (or JSON that isn't an envelope) drops the entry;
 * - data the validator rejects (throws on) resets the entry; what it salvages is kept;
 * - an entry from a newer version is never read nor written: this tab works from memory until
 *   reload;
 * - blocked, full or throwing storage means nothing is remembered, silently;
 * - other tabs' changes arrive through the `storage` event and are read by the same rules.
 */

/** The slice of `localStorage` a stored entry uses. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageEnvironment {
  /** Returns the storage, or throws / returns null when it is blocked. */
  storage: () => StorageLike | null;
  /** Where `storage` events from other tabs arrive. */
  events: EventTarget;
}

export interface EntryDefinition<T> {
  /** The `localStorage` key. */
  key: string;
  /** The current version. */
  version: number;
  /** Used when nothing is stored, or what is stored can't be used. */
  fallback: () => T;
  /** Turns parsed data of the current version into a value, salvaging what it can. Throw to reset. */
  validate: (data: unknown) => T;
  /** `migrations[n]` turns version-n data into version-(n + 1) data. Throw to reset. */
  migrations?: Partial<Record<number, (data: unknown) => unknown>>;
}

export interface StoredEntry<T> {
  /** Reads the entry as on app load. */
  load(): T;
  /** Writes the value, unless storage is unavailable or the entry belongs to a newer version. */
  save(value: T): void;
  /** Calls `listener` with the new value whenever another tab changes the entry. */
  subscribe(listener: (value: T) => void): () => void;
}

/** The browser's `localStorage` and `window`. */
export const browserEnvironment: StorageEnvironment = {
  storage: () => window.localStorage,
  get events() {
    return window;
  },
};

interface Envelope {
  version: number;
  data: unknown;
}

/** The parsed envelope, or null when the text is not JSON of the envelope's shape. */
function parseEnvelope(raw: string): Envelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || !('version' in parsed)) return null;
  const { version } = parsed as { version: unknown };
  if (typeof version !== 'number' || !Number.isInteger(version)) return null;
  return { version, data: (parsed as { data?: unknown }).data };
}

const NEWER = Symbol('newer version');

export function createStoredEntry<T>(
  definition: EntryDefinition<T>,
  env: StorageEnvironment = browserEnvironment,
): StoredEntry<T> {
  const { key, version, fallback, validate, migrations = {} } = definition;

  /** Set once an entry from a newer version is seen: this tab then never touches it until reload. */
  let heldByNewerVersion = false;

  // Blocked, full or throwing storage: the app keeps working and remembers nothing, silently.
  function withStorage<R>(action: (storage: StorageLike) => R, otherwise: R): R {
    try {
      const storage = env.storage();
      return storage ? action(storage) : otherwise;
    } catch {
      return otherwise;
    }
  }

  function write(value: T) {
    if (heldByNewerVersion) return;
    const raw = JSON.stringify({ version, data: value } satisfies Envelope);
    withStorage((storage) => storage.setItem(key, raw), undefined);
  }

  function reset(): T {
    if (!heldByNewerVersion) withStorage((storage) => storage.removeItem(key), undefined);
    return fallback();
  }

  function read(raw: string | null): T | typeof NEWER {
    if (raw === null) return fallback();
    const envelope = parseEnvelope(raw);
    if (!envelope) return reset();
    if (envelope.version > version) {
      heldByNewerVersion = true;
      return NEWER;
    }

    let value: T;
    try {
      let data = envelope.data;
      for (let from = envelope.version; from < version; from++) {
        const step = migrations[from];
        if (!step) return reset();
        data = step(data);
      }
      value = validate(data);
    } catch {
      return reset();
    }
    if (envelope.version < version) write(value);
    return value;
  }

  return {
    load() {
      const value = read(withStorage((storage) => storage.getItem(key), null));
      return value === NEWER ? fallback() : value;
    },
    save: write,
    subscribe(listener) {
      const onStorage = (event: Event) => {
        const { key: changed, newValue } = event as StorageEvent;
        // A null key means another tab cleared all of storage.
        if (changed !== null && changed !== key) return;
        if (heldByNewerVersion) return;
        const value = read(changed === null ? null : newValue);
        if (value !== NEWER) listener(value);
      };
      env.events.addEventListener('storage', onStorage);
      return () => env.events.removeEventListener('storage', onStorage);
    },
  };
}
