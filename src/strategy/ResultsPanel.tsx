import type { UpgradeStrategyResult } from '../calculation/protocol';
import {
  formatEchoesStarted,
  formatEchoScore,
  formatRate,
  formatWhole,
} from '../evaluation/format';
import { CalculationStatus, type CalculationState } from '../ui/CalculationStatus';
import surfaces from '../ui/surfaces.module.css';
import { Term } from '../ui/Term';
import { stageName } from './StageEditor';
import { STRATEGY_TOOLTIPS } from './termTooltips';
import styles from './ResultsPanel.module.css';

export interface ResultsPanelProps {
  /** The latest results; null before the first arrives. */
  result: UpgradeStrategyResult | null;
  /** Whether the results are from before the last change, and so fade. */
  stale: boolean;
  /** The first Tune Stage holding an unfinished rule, while there is one: the results are then from before. */
  unfinishedStage: number | null;
  /** Whether the results have been calculating for a while, or couldn't be calculated (spec §11). */
  state?: CalculationState;
}

/** The results panel beside the stages (spec §8): Success Rate, where Echoes end, cost and Echo Scores. */
export function ResultsPanel({
  result,
  stale,
  unfinishedStage,
  state = 'done',
}: ResultsPanelProps) {
  return (
    <section className={`${surfaces.panel} ${styles.panel}`} aria-label="Results">
      {/*
       * Laid over the panel's top right, beside the Success Rate, so it appearing moves nothing; before the first
       * results, in the empty panel itself.
       */}
      <span className={result ? styles.calculating : undefined}>
        {state === 'calculating' && <CalculationStatus state="calculating" />}
      </span>
      {state === 'failed' && <CalculationStatus state="failed" />}
      {unfinishedStage !== null && (
        <p className={styles.staleMessage}>
          Results are from before your last change. Finish the highlighted rule at{' '}
          {stageName(unfinishedStage)} to update them.
        </p>
      )}
      {result && (
        <div className={stale ? styles.stale : undefined}>
          <p className={styles.big}>{formatRate(result.successRate)}</p>
          <p className={styles.label}>
            <Term tooltip={STRATEGY_TOOLTIPS['Success Rate']}>Success Rate</Term>
          </p>
          <WhereEchoesEnd result={result} />
          <SuccessfulEchoes result={result} />
        </div>
      )}
    </section>
  );
}

/** The cost per Successful Echo and the Successful Echoes' Echo Scores; one line instead while there are none. */
function SuccessfulEchoes({
  result: {
    costPerSuccessfulEcho: cost,
    averageSuccessfulEchoScore: average,
    lowestSuccessfulEchoScore: lowest,
  },
}: {
  result: UpgradeStrategyResult;
}) {
  if (cost === null || average === null || lowest === null)
    return <p className={styles.none}>No Echo passes every Tune Stage.</p>;
  return (
    <>
      <h3 className={styles.heading}>
        <Term tooltip={STRATEGY_TOOLTIPS['Cost per Successful Echo']}>
          Average cost per Successful Echo
        </Term>
      </h3>
      <table className={styles.figures}>
        <tbody>
          <Row label="Echoes started" value={formatEchoesStarted(cost.echoes)} />
          <Row label="Echo EXP" value={formatWhole(cost.exp)} />
          <Row label="Tuners" value={formatWhole(cost.tuners)} />
          <Row label="Shell Credits" value={formatWhole(cost.shellCredits)} />
        </tbody>
      </table>
      <table className={styles.figures}>
        <tbody>
          <Row label="Average Echo Score of Successful Echoes" value={formatEchoScore(average)} />
          <Row label="Lowest Echo Score of a Successful Echo" value={formatEchoScore(lowest)} />
        </tbody>
      </table>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{value}</td>
    </tr>
  );
}

/**
 * The "where Echoes end" bar: a segment per Tune Stage that discards, in its stage colour, then gold for Successful,
 * with 2px gaps and a legend entry per segment. It has no label and is hidden from screen readers: its numbers are on
 * screen as text.
 */
function WhereEchoesEnd({ result }: { result: UpgradeStrategyResult }) {
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
    <div aria-hidden="true">
      <div className={styles.bar}>
        {segments.map(({ key, share, colour, title }) => (
          <span key={key} title={title} style={{ flexGrow: share, background: colour }} />
        ))}
      </div>
      <div className={styles.legend}>
        {segments.map(({ key, colour, legend }) => (
          <span key={key}>
            <i style={{ background: colour }} />
            {legend}
          </span>
        ))}
      </div>
    </div>
  );
}
