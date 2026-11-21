import { useState } from 'react';
import { IconButton } from '../ui/IconButton';
import { CrossIcon } from '../ui/icons';
import styles from './Notices.module.css';

export interface NoticesProps {
  /** The notices of this load. Each is shown on this load only, so it never comes back, closed or not. */
  notices: readonly string[];
}

/** The one-time notices: a slim bar under the header, one line each, closed with ×. */
export function Notices({ notices }: NoticesProps) {
  const [open, setOpen] = useState(notices);
  if (open.length === 0) return null;
  return (
    <section className={styles.bar} aria-label="Notices">
      <ul className={styles.list}>
        {open.map((notice) => (
          <li key={notice} className={styles.notice}>
            <span className={styles.text}>{notice}</span>
            <IconButton
              label="Close notice"
              icon={<CrossIcon />}
              onClick={() => setOpen(open.filter((other) => other !== notice))}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
