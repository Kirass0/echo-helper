import type { UpgradeStrategyResult } from '../calculation/protocol';
import { formatRate } from '../evaluation/format';
import { Term } from '../ui/Term';
import { stageName } from './StageEditor';
import { stageSummary, type StrategyDraft } from './strategyDraft';
import { STRATEGY_TOOLTIPS } from './termTooltips';
import styles from './Compare.module.css';

export interface StrategySummaryProps {
  draft: StrategyDraft;
  result: UpgradeStrategyResult | null;
  /** Whether the results are from before the last change, and so fade. */
  stale: boolean;
}

/**
 * A strategy in Done (spec §8, "Comparing two strategies"): one line per Tune Stage, its rules then its Discard Rate,
 * and a last line with the Success Rate.
 */
export function StrategySummary({ draft, result, stale }: StrategySummaryProps) {
  return (
    <>
      <ol className={styles.summary}>
        {draft.stages.map((boxes, index) => {
          const tuneStage = index + 1;
          const discardRate = result?.discards[index]?.discardRate ?? 0;
          return (
            <li key={tuneStage}>
              <b>{stageName(tuneStage)}</b>
              <span className={boxes.length ? undefined : styles.mute}>{stageSummary(boxes)}</span>
              <span className={`${styles.discarded} ${stale ? styles.stale : ''}`}>
                {discardRate > 0 ? (
                  <>
                    {formatRate(discardRate)}{' '}
                    <Term tooltip={STRATEGY_TOOLTIPS['Discard Rate']}>discarded here</Term>
                  </>
                ) : (
                  <span className={styles.mute}>nothing discarded</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {result && (
        <p className={`${styles.successRate} ${stale ? styles.stale : ''}`}>
          <Term tooltip={STRATEGY_TOOLTIPS['Success Rate']}>Success Rate</Term>{' '}
          <b>{formatRate(result.successRate)}</b>
        </p>
      )}
    </>
  );
}
