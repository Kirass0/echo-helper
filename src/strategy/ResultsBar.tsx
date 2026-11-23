import type { UpgradeStrategyResult } from '../calculation/protocol';
import { formatRate } from '../evaluation/format';
import { CalculationStatus, fadedWhen, type CalculationState } from '../ui/CalculationStatus';
import { WhereEchoesEnd } from './WhereEchoesEnd';
import styles from './ResultsBar.module.css';

export interface ResultsBarProps {
  result: UpgradeStrategyResult;
  /** Whether the results are from before the last change, and so fade. */
  stale: boolean;
  state: CalculationState;
  /** Called by the "Results" link, to bring the full results panel into view. */
  onShowResults(): void;
}

/**
 * The phone's sticky bar at the bottom of the screen (spec §14): the Success Rate, the "where Echoes end" bar and a
 * "Results" link to the full panel below the stages. It fades with "Calculating…" like the panel.
 */
export function ResultsBar({ result, stale, state, onShowResults }: ResultsBarProps) {
  return (
    <aside className={styles.resultsBar} aria-label="Results summary">
      <div className={`${styles.barFigures} ${fadedWhen(stale) ?? ''}`}>
        <p className={styles.barRate}>
          <b>{formatRate(result.successRate)}</b> <span className={styles.mute}>Success Rate</span>
        </p>
        <WhereEchoesEnd result={result} compact />
      </div>
      {state === 'calculating' && (
        <CalculationStatus state="calculating" className={styles.barCalculating} />
      )}
      <button type="button" className={styles.toResults} onClick={onShowResults}>
        Results
      </button>
    </aside>
  );
}
