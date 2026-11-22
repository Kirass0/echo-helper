// "B compared with A" (spec §8, "Comparing two strategies"): each figure of both strategies, and B's relative change
// against A, better or worse.
import type { UpgradeStrategyResult } from '../calculation/protocol';
import { formatEchoesStarted, formatEchoScore, formatWhole } from '../evaluation/format';

/** Whether a lower or a higher figure is the better one. */
export type Better = 'lower' | 'higher';

/** B's relative change against A, as its pill reads ("+12.3%", "−4.0%"), and what it means for B. */
export interface Change {
  readonly text: string;
  readonly verdict: 'better' | 'worse' | 'equal';
}

/**
 * B's relative change against A to 1 decimal, or null when either has no value, or when A is 0 and B isn't (there is
 * no relative change from 0). A change that rounds to 0.0% counts as equal.
 */
export function relativeChange(a: number | null, b: number | null, better: Better): Change | null {
  if (a === null || b === null) return null;
  if (a === b) return { text: '0.0%', verdict: 'equal' };
  if (a === 0) return null;
  const percent = Math.round(((b - a) / Math.abs(a)) * 1000) / 10;
  if (percent === 0) return { text: '0.0%', verdict: 'equal' };
  const sign = percent > 0 ? '+' : '−';
  const higher = percent > 0;
  return {
    text: `${sign}${Math.abs(percent).toFixed(1)}%`,
    verdict: higher === (better === 'higher') ? 'better' : 'worse',
  };
}

/** One row of the table: both strategies' figures as shown ("—" for none), and B's change against A. */
export interface ComparisonRow {
  readonly label: string;
  readonly a: string;
  readonly b: string;
  readonly change: Change | null;
}

const FIGURES: readonly {
  readonly label: string;
  readonly better: Better;
  readonly value: (result: UpgradeStrategyResult) => number | null;
  readonly format: (value: number) => string;
}[] = [
  {
    label: 'Echoes started per Successful Echo',
    better: 'lower',
    value: (result) => result.costPerSuccessfulEcho?.echoes ?? null,
    format: formatEchoesStarted,
  },
  {
    label: 'Echo EXP per Successful Echo',
    better: 'lower',
    value: (result) => result.costPerSuccessfulEcho?.exp ?? null,
    format: formatWhole,
  },
  {
    label: 'Tuners per Successful Echo',
    better: 'lower',
    value: (result) => result.costPerSuccessfulEcho?.tuners ?? null,
    format: formatWhole,
  },
  {
    label: 'Shell Credits per Successful Echo',
    better: 'lower',
    value: (result) => result.costPerSuccessfulEcho?.shellCredits ?? null,
    format: formatWhole,
  },
  {
    label: 'Average Echo Score of Successful Echoes',
    better: 'higher',
    value: (result) => result.averageSuccessfulEchoScore,
    format: formatEchoScore,
  },
  {
    label: 'Lowest Echo Score of a Successful Echo',
    better: 'higher',
    value: (result) => result.lowestSuccessfulEchoScore,
    format: formatEchoScore,
  },
];

/**
 * The rows of "B compared with A": the four cost rows, then the two Echo Score rows. There is no Success Rate row:
 * Echoes started per Successful Echo carries the same information. A strategy with no result yet has no figures.
 */
export function compareStrategies(
  a: UpgradeStrategyResult | null,
  b: UpgradeStrategyResult | null,
): ComparisonRow[] {
  return FIGURES.map(({ label, better, value, format }) => {
    const valueA = a && value(a);
    const valueB = b && value(b);
    return {
      label,
      a: valueA === null ? '—' : format(valueA),
      b: valueB === null ? '—' : format(valueB),
      change: relativeChange(valueA, valueB, better),
    };
  });
}
