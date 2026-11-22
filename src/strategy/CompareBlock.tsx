import type { UpgradeStrategyResult } from '../calculation/protocol';
import { formatRate } from '../evaluation/format';
import { fadedWhen } from '../ui/CalculationStatus';
import surfaces from '../ui/surfaces.module.css';
import { compareStrategies, type Change } from './comparison';
import styles from './Compare.module.css';

export interface CompareBlockProps {
  a: UpgradeStrategyResult | null;
  b: UpgradeStrategyResult | null;
  /** Whether either strategy's results are from before its last change, and so fade. */
  stale: boolean;
}

/** "B compared with A" below both strategies: the table of figures with pills, then the paired chart (spec §8). */
export function CompareBlock({ a, b, stale }: CompareBlockProps) {
  return (
    <section className={surfaces.panel} aria-label="B compared with A">
      <div className={fadedWhen(stale)}>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <td />
                <th scope="col">Strategy A</th>
                <th scope="col">Strategy B</th>
                <th scope="col">B compared with A</th>
              </tr>
            </thead>
            <tbody>
              {compareStrategies(a, b).map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.a}</td>
                  <td>{row.b}</td>
                  <td>{row.change && <Pill change={row.change} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PairedChart a={a} b={b} />
      </div>
    </section>
  );
}

/**
 * B's relative change: green when better, red when worse, with ▲ or ▼ before it and "better" or "worse" for screen
 * readers; grey with no arrow when equal. Colour is never the only carrier (spec §15).
 */
function Pill({ change: { text, verdict } }: { change: Change }) {
  if (verdict === 'equal') return <span className={`${styles.pill} ${styles.equal}`}>{text}</span>;
  return (
    <>
      <span className={`${styles.arrow} ${styles[verdict]}`} aria-hidden="true">
        {verdict === 'better' ? '▲' : '▼'}
      </span>
      <span className={`${styles.pill} ${styles[verdict]}`}>{text}</span>
      <span className={styles.visuallyHidden}> {verdict}</span>
    </>
  );
}

const GROUPS = ['1/5 (+5)', '2/5 (+10)', '3/5 (+15)', '4/5 (+20)', '5/5 (+25)', 'Successful'];

/** Where Echoes end, per Tune Stage then Successful: the Discard Rates and the Success Rate, 1/5 first. */
const shares = (result: UpgradeStrategyResult | null) =>
  result
    ? [...result.discards.map(({ discardRate }) => discardRate), result.successRate]
    : GROUPS.map(() => 0);

/**
 * The paired chart: per Tune Stage and for Successful, A's share in the accent and B's in grey, with an A/B legend
 * only. It has no heading and is hidden from screen readers: the same figures are on screen as text.
 */
function PairedChart({
  a,
  b,
}: {
  a: UpgradeStrategyResult | null;
  b: UpgradeStrategyResult | null;
}) {
  const sharesA = shares(a);
  const sharesB = shares(b);
  // The tallest bar fills the height, but small shares aren't blown up to fill it.
  const top = Math.max(0.05, ...sharesA, ...sharesB);
  const bar = (share: number, colour: string, name: string) => (
    <span
      style={{ height: `${(share / top) * 100}%`, background: colour }}
      title={`${name}: ${formatRate(share)}`}
    />
  );
  return (
    <div className={styles.chart} aria-hidden="true" data-testid="paired-chart">
      <div className={styles.legend}>
        <span>
          <i style={{ borderColor: 'var(--pa)' }} />A
        </span>
        <span>
          <i style={{ borderColor: 'var(--pb)' }} />B
        </span>
      </div>
      <div className={styles.pairs}>
        {GROUPS.map((group, index) => (
          <div key={group}>
            {bar(sharesA[index] ?? 0, 'var(--pa)', 'A')}
            {bar(sharesB[index] ?? 0, 'var(--pb)', 'B')}
          </div>
        ))}
      </div>
      <div className={styles.pairLabels}>
        {GROUPS.map((group) => (
          <span key={group}>{group}</span>
        ))}
      </div>
    </div>
  );
}
