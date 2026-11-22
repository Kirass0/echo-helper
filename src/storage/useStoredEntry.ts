import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoredEntry } from './storedEntry';

/** A new value, or how to make it from the newest one. */
export type StoredEntryChange<T> = T | ((last: T) => T);

/**
 * React state backed by a stored entry: starts from what is stored, saves every change, and takes
 * on changes made in other tabs. When nothing can be saved, the state still works from memory.
 * A change given as a function builds on the newest value, even one not yet rendered.
 */
export function useStoredEntry<T>(
  entry: StoredEntry<T>,
): [T, (change: StoredEntryChange<T>) => void] {
  const [value, setValue] = useState(() => entry.load());
  // The newest value, ahead of the render when several changes come at once.
  const latest = useRef(value);

  useEffect(
    () =>
      entry.subscribe((next) => {
        latest.current = next;
        setValue(next);
      }),
    [entry],
  );

  const update = useCallback(
    (change: StoredEntryChange<T>) => {
      const next =
        typeof change === 'function' ? (change as (last: T) => T)(latest.current) : change;
      latest.current = next;
      setValue(next);
      entry.save(next);
    },
    [entry],
  );

  return [value, update];
}
