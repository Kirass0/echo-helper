import type { ComponentProps } from 'react';
import styles from './FittedSelect.module.css';

/**
 * A select as wide as the option it shows (`shown`), in every browser: a hidden copy of it sets the width, and the
 * select fills it. `fitClassName` styles the box both sit in.
 */
export function FittedSelect({
  shown,
  fitClassName,
  className,
  ...select
}: ComponentProps<'select'> & { shown: string; fitClassName?: string }) {
  return (
    <span className={[styles.fit, fitClassName].filter(Boolean).join(' ')}>
      <span className={styles.sizer} aria-hidden="true">
        {shown}
      </span>
      <select className={[styles.select, className].filter(Boolean).join(' ')} {...select} />
    </span>
  );
}
