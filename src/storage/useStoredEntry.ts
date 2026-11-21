import { useCallback, useEffect, useState } from 'react';
import type { StoredEntry } from './storedEntry';

/**
 * React state backed by a stored entry: starts from what is stored, saves every change, and takes
 * on changes made in other tabs. When nothing can be saved, the state still works from memory.
 */
export function useStoredEntry<T>(entry: StoredEntry<T>): [T, (value: T) => void] {
  const [value, setValue] = useState(() => entry.load());

  useEffect(() => entry.subscribe(setValue), [entry]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      entry.save(next);
    },
    [entry],
  );

  return [value, update];
}
