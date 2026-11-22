import { useEffect, useRef, useState } from 'react';

/** How long a result may be pending before it shows so (spec §11, "Pending display"). */
export const PENDING_DELAY_MS = 300;

/**
 * Of the pending keys, those pending for about 300 ms or more without a break: nothing changes before that. A key
 * pending again for a newer input, before its result came, keeps its time.
 */
export function useLongPending(pending: readonly string[]): ReadonlySet<string> {
  const [long, setLong] = useState<ReadonlySet<string>>(() => new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const key = JSON.stringify([...pending].sort());

  useEffect(() => {
    const now: readonly string[] = JSON.parse(key);
    const running = timers.current;
    for (const [name, timer] of running)
      if (!now.includes(name)) {
        clearTimeout(timer);
        running.delete(name);
      }
    for (const name of now)
      if (!running.has(name))
        running.set(
          name,
          setTimeout(() => setLong((was) => new Set(was).add(name)), PENDING_DELAY_MS),
        );
    // A key that stopped pending starts afresh next time. It already stopped showing (see below), so this changes
    // nothing on screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLong((was) => {
      const kept = [...was].filter((name) => now.includes(name));
      return kept.length === was.size ? was : new Set(kept);
    });
  }, [key]);

  useEffect(() => {
    const running = timers.current;
    return () => {
      for (const timer of running.values()) clearTimeout(timer);
      running.clear();
    };
  }, []);

  // A key no longer pending stops showing at once, with no wait for an effect.
  return new Set(pending.filter((name) => long.has(name)));
}
