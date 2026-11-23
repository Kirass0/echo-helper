import { useEffect, useState } from 'react';
import styles from './LiveRegion.module.css';

/** How long results must stay settled before their line is spoken (spec §15, "Live region"). */
export const SETTLE_DELAY_MS = 1000;

/**
 * What a tab has to say: a `line` about its settled results, spoken once they have stayed so for about 1 s; or a
 * `message`, the unfinished-rule message or the calculation failure, spoken as soon as it appears. A tab says nothing
 * (null) while its results are pending: "Calculating…" is never spoken.
 */
export type Announcement = { readonly line: string } | { readonly message: string };

/**
 * A tab's one polite live region, visually hidden. It empties while there is nothing to say, so the same line settling
 * again is spoken again; emptying it speaks nothing.
 */
export function LiveRegion({ announcement }: { announcement: Announcement | null }) {
  const [spoken, setSpoken] = useState('');
  const line = announcement && 'line' in announcement ? announcement.line : null;
  const message = announcement && 'message' in announcement ? announcement.message : null;

  useEffect(() => {
    if (line === null) return;
    const timer = setTimeout(() => setSpoken(line), SETTLE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setSpoken('');
    };
  }, [line]);

  return (
    <div role="status" aria-live="polite" className={styles.region}>
      {message ?? spoken}
    </div>
  );
}
