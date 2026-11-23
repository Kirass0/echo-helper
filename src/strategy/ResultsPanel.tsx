import type { Ref } from 'react';
import type { UpgradeStrategyResult } from '../calculation/protocol';
import {
  formatEchoesStarted,
  formatEchoScore,
  formatRate,
  formatWhole,
} from '../evaluation/format';
import { CalculationStatus, fadedWhen, type CalculationState } from '../ui/CalculationStatus';
import surfaces from '../ui/surfaces.module.css';
import { Term } from '../ui/Term';
import { STRATEGY_TOOLTIPS } from './termTooltips';
import { unfinishedMessage } from './unfinishedMessage';
import { WhereEchoesEnd } from './WhereEchoesEnd';
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
  /** The panel, for the phone's "Results" link to move focus to. */
  ref?: Ref<HTMLElement>;
}

/** The results panel beside the stages (spec §8): Success Rate, where Echoes end, cost and Echo Scores. */
export function ResultsPanel({
  result,
  stale,
  unfinishedStage,
  state = 'done',
  ref,
}: ResultsPanelProps) {
  return (
    <section
      ref={ref}
      className={`${surfaces.panel} ${styles.panel}`}
      aria-label="Results"
      tabIndex={-1}
    >
      {/*
       * Laid over the panel's top right, beside the Success Rate, so it appearing moves nothing; before the first
       * results, in the empty panel itself.
       */}
      <span className={result ? styles.calculating : undefined}>
        {state === 'calculating' && <CalculationStatus state="calculating" />}
      </span>
      {state === 'failed' && <CalculationStatus state="failed" />}
      {unfinishedStage !== null && (
        <p className={styles.staleMessage}>{unfinishedMessage(unfinishedStage)}</p>
      )}
      {result && (
        <div className={fadedWhen(stale)}>
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
