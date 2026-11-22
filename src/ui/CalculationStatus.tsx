import styles from './calculating.module.css';

export const CALCULATING = 'Calculating…';
export const CALCULATION_FAILED = "Couldn't calculate this. Reload the page to try again.";

/** Where a result's calculation is: done (or not yet slow), pending for a while, or given up. */
export type CalculationState = 'done' | 'calculating' | 'failed';

/** The pending fade's class, for a result calculating or given up; its last figures stay, faded. */
export const fadedWhen = (faded: boolean) => (faded ? styles.faded : undefined);

/**
 * The text of a result's slot: "Calculating…", never announced (spec §15), or that it couldn't be calculated. `inline`
 * is for a slot of one line, such as a row's.
 */
export function CalculationStatus({
  state,
  className,
  inline = false,
}: {
  state: CalculationState;
  className?: string;
  inline?: boolean;
}) {
  const classes = (own: string | undefined) => [own, className].filter(Boolean).join(' ');
  if (state === 'calculating')
    return (
      <span className={classes(styles.calculating)} aria-hidden="true">
        {CALCULATING}
      </span>
    );
  if (state === 'failed')
    return inline ? (
      <span className={classes(styles.failedLine)}>{CALCULATION_FAILED}</span>
    ) : (
      <p className={classes(styles.failed)}>{CALCULATION_FAILED}</p>
    );
  return null;
}
