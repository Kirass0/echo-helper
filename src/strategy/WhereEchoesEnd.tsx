import type { UpgradeStrategyResult } from '../calculation/protocol';
import { formatRate } from '../evaluation/format';
import { stageName } from './StageEditor';
import styles from './WhereEchoesEnd.module.css';

/**
 * The "where Echoes end" bar: a segment per Tune Stage that discards, in its stage colour, then gold for Successful,
 * with 2px gaps and a legend entry per segment; `compact`, the phone's sticky bar's, is thinner and has no legend. It
 * has no label and is hidden from screen readers: its numbers are on screen as text.
 */
export function WhereEchoesEnd({
  result,
  compact = false,
}: {
  result: UpgradeStrategyResult;
  compact?: boolean;
}) {
  const segments = [
    ...result.discards
      .filter(({ discardRate }) => discardRate > 0)
      .map(({ tuneStage, discardRate }) => ({
        key: `stage-${tuneStage}`,
        share: discardRate,
        colour: `var(--st${tuneStage})`,
        legend: `${tuneStage}/5`,
        title: `Discarded at ${stageName(tuneStage)}: ${formatRate(discardRate)}`,
      })),
    ...(result.successRate > 0
      ? [
          {
            key: 'successful',
            share: result.successRate,
            colour: 'var(--succ)',
            legend: 'Successful',
            title: `Successful: ${formatRate(result.successRate)}`,
          },
        ]
      : []),
  ];
  return (
    <div aria-hidden="true" className={compact ? styles.compact : undefined}>
      <div className={styles.bar}>
        {segments.map(({ key, share, colour, title }) => (
          <span key={key} title={title} style={{ flexGrow: share, background: colour }} />
        ))}
      </div>
      {!compact && (
        <div className={styles.legend}>
          {segments.map(({ key, colour, legend }) => (
            <span key={key}>
              <i style={{ background: colour }} />
              {legend}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
