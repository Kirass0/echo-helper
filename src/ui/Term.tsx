import type { ReactNode } from 'react';
import styles from './Term.module.css';
import { useTooltip } from './Tooltip';

/** A term the player may not know: a text-styled button with a dotted underline, explained by its tooltip. */
export function Term({ tooltip: text, children }: { tooltip: string; children: ReactNode }) {
  const { triggerProps, tooltip } = useTooltip({ text, describes: true, openOnTap: true });
  return (
    <>
      <button type="button" className={styles.term} {...triggerProps}>
        {children}
      </button>
      {tooltip}
    </>
  );
}
