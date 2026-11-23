import { scaleLinear } from 'd3-scale';
import { area, line } from 'd3-shape';
import type { EchoEvaluationResult } from '../calculation/protocol';
import { CalculationStatus, fadedWhen, type CalculationState } from '../ui/CalculationStatus';
import { useTooltip } from '../ui/Tooltip';
import { usePhoneLayout } from '../ui/usePhoneLayout';
import {
  BAND_COUNT,
  distributionBands,
  type ChartedTable,
  type DistributionBands,
} from './distributionBands';
import styles from './EchoDistributionChart.module.css';

/** A listed table, its targets as entered, and its newest result, if any has arrived. */
export interface ChartedListedTable {
  readonly name: string;
  readonly targetScore: number | null;
  readonly erTargetScore: number | null;
  readonly result: EchoEvaluationResult | null;
}

export interface EchoDistributionChartProps {
  /** Every listed table, top to bottom. */
  readonly tables: readonly ChartedListedTable[];
  readonly focused: string;
  /** Whether any table's curve is calculating, or was given up; the chart then fades and says so. */
  readonly state?: CalculationState;
}

/** The drawing's own coordinates, which the SVG scales to the panel's width, and how many axis ticks it asks for. */
interface Drawing {
  readonly width: number;
  readonly height: number;
  readonly margin: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly ticks: number;
}

const DESKTOP: Drawing = {
  width: 720,
  height: 240,
  margin: { top: 12, right: 14, bottom: 42, left: 58 },
  ticks: 6,
};

// Narrower on a phone, so its text stays readable once scaled down (spec §14).
const PHONE: Drawing = {
  width: 360,
  height: 210,
  margin: { top: 12, right: 10, bottom: 40, left: 60 },
  ticks: 4,
};

/** The legend's names: the focused table's comes first, then these. */
const LEGEND_NAMES = {
  desktop: { others: 'Other tables', target: 'Target Score', erTarget: 'ER Target Score' },
  phone: { others: 'Others', target: 'Target', erTarget: 'ER' },
};

/**
 * "Echo distribution" (spec §7): how the Echo's final Echo Score could land for every listed table at once, in 60
 * equal bands over the range of them all. The table in focus is drawn in colour against its target lines, the others
 * as grey lines. The axis depends only on the listed tables and their targets, so switching focus never moves it.
 */
export function EchoDistributionChart({
  tables,
  focused,
  state = 'done',
}: EchoDistributionChartProps) {
  const phone = usePhoneLayout();
  const drawing = phone ? PHONE : DESKTOP;
  const { width, height, margin } = drawing;
  // Every listed table's targets set the axis; only tables with a result have a curve.
  const charted = tables.map(({ name, targetScore, erTargetScore, result }): ChartedTable => ({
    name,
    distribution: result?.distribution ?? null,
    targetScore,
    erTargetScore,
  }));
  const focusedTable = tables.find((table) => table.name === focused) ?? null;
  const bands = charted.some((table) => table.distribution !== null)
    ? distributionBands(charted)
    : null;

  return (
    <section className={styles.chart} aria-labelledby="echo-distribution-heading">
      <div className={styles.head}>
        <h2 id="echo-distribution-heading" className={styles.heading}>
          Echo distribution
        </h2>
        <Legend focused={focused} names={LEGEND_NAMES[phone ? 'phone' : 'desktop']} />
      </div>
      {/* Laid over the plot's top, so it appearing moves nothing. */}
      <div className={styles.status}>
        <CalculationStatus state={state} />
      </div>
      <svg
        className={`${styles.svg} ${fadedWhen(state !== 'done') ?? ''}`}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={labelOf(focused, focusedTable)}
      >
        {bands && (
          <Plot drawing={drawing} bands={bands} focused={focused} focusedTable={focusedTable} />
        )}
        <text
          className={styles.axisTitle}
          x={(margin.left + width - margin.right) / 2}
          y={height - 4}
          textAnchor="middle"
        >
          Final Echo Score
        </text>
        <text
          className={styles.axisTitle}
          transform={`translate(12 ${(margin.top + height - margin.bottom) / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Chance
        </text>
      </svg>
    </section>
  );
}

function Plot({
  drawing: { width, height, margin, ticks },
  bands,
  focused,
  focusedTable,
}: {
  drawing: Drawing;
  bands: DistributionBands;
  focused: string;
  focusedTable: ChartedListedTable | null;
}) {
  const plotBottom = height - margin.bottom;
  const x = scaleLinear()
    .domain([bands.from, bands.to])
    .range([margin.left, width - margin.right]);
  const y = scaleLinear()
    .domain([0, bands.highestChance || 1])
    .range([plotBottom, margin.top]);
  const middle = (band: number) =>
    x(bands.from + ((band + 0.5) * (bands.to - bands.from)) / BAND_COUNT);
  const toLine = line<number>()
    .x((_, band) => middle(band))
    .y((chance) => y(chance));
  const toArea = area<number>()
    .x((_, band) => middle(band))
    .y0(plotBottom)
    .y1((chance) => y(chance));

  const others = [...bands.chances].filter(([name]) => name !== focused);
  const focusedChances = bands.chances.get(focused);
  const yTicks = [0, 0.5, 1].map((share) => share * (bands.highestChance || 1));
  const targetLine = (score: number | null, className: string | undefined) =>
    score === null ? null : (
      <line className={className} x1={x(score)} x2={x(score)} y1={margin.top - 6} y2={plotBottom} />
    );

  return (
    <>
      <g data-axis="y">
        {yTicks.map((chance) => (
          <g key={chance}>
            <line
              className={styles.grid}
              x1={margin.left}
              x2={width - margin.right}
              y1={y(chance)}
              y2={y(chance)}
            />
            <text className={styles.tick} x={margin.left - 6} y={y(chance) + 4} textAnchor="end">
              {`${(chance * 100).toFixed(1)}%`}
            </text>
          </g>
        ))}
      </g>
      <g data-axis="x" data-from={bands.from} data-to={bands.to}>
        {x.ticks(ticks).map((score) => (
          <text
            key={score}
            className={styles.tick}
            x={x(score)}
            y={plotBottom + 16}
            textAnchor="middle"
          >
            {String(+score.toFixed(2))}
          </text>
        ))}
      </g>
      {others.map(([name, chances]) => (
        <path key={name} className={styles.other} d={toLine(chances) ?? undefined} />
      ))}
      {focusedChances && (
        <>
          <path className={styles.fill} d={toArea(focusedChances) ?? undefined} />
          <path className={styles.focus} d={toLine(focusedChances) ?? undefined} />
        </>
      )}
      <line
        className={styles.baseline}
        x1={margin.left}
        x2={width - margin.right}
        y1={plotBottom}
        y2={plotBottom}
      />
      {targetLine(focusedTable?.targetScore ?? null, styles.target)}
      {targetLine(focusedTable?.erTargetScore ?? null, styles.erTarget)}
    </>
  );
}

/** The fixed single-line legend: the focused table (truncated, its full name in a tooltip), the others, the targets. */
function Legend({ focused, names }: { focused: string; names: (typeof LEGEND_NAMES)['desktop'] }) {
  const { triggerProps, tooltip } = useTooltip({
    text: focused,
    describes: false,
    openOnTap: true,
  });
  return (
    <ul className={styles.legend} aria-label="Legend">
      <li className={styles.focusedEntry}>
        <i className={`${styles.key} ${styles.focusKey}`} aria-hidden="true" />
        <span className={styles.name} tabIndex={0} {...triggerProps}>
          {focused}
        </span>
        {tooltip}
      </li>
      <li>
        <i className={`${styles.key} ${styles.otherKey}`} aria-hidden="true" />
        {names.others}
      </li>
      <li>
        <i className={`${styles.key} ${styles.targetKey}`} aria-hidden="true" />
        {names.target}
      </li>
      <li>
        <i className={`${styles.key} ${styles.erTargetKey}`} aria-hidden="true" />
        {names.erTarget}
      </li>
    </ul>
  );
}

/**
 * The one-sentence label (spec §15), e.g. "Echo distribution for Cantarella: final Echo Score from 8.2 to 31.5,
 * Target Score 20 at 34% chance."
 */
function labelOf(focused: string, table: ChartedListedTable | null): string {
  let label = `Echo distribution for ${focused}`;
  const result = table?.result;
  // The focused table's own range, Worst to Best, not the axis shared with the other tables; one score at 5/5.
  const worst = result?.distribution[0]?.threshold;
  if (result && worst !== undefined)
    label +=
      worst === result.best
        ? `: final Echo Score ${worst.toFixed(1)}`
        : `: final Echo Score from ${worst.toFixed(1)} to ${result.best.toFixed(1)}`;
  if (table?.targetScore != null && result) {
    const target = `Target Score ${String(+table.targetScore.toFixed(2))}`;
    if (result.fullyTuned && result.reachesTarget !== null)
      label += `, ${target} ${result.reachesTarget ? 'reached' : 'not reached'}`;
    else if (result.targetChance !== null)
      label += `, ${target} at ${wholePercent(result.targetChance)} chance`;
  }
  return `${label}.`;
}

/** A chance as a whole percentage, never rounding a small chance to 0% or a near-certain one to 100%. */
function wholePercent(chance: number): string {
  if (chance > 0 && chance < 0.005) return 'under 1%';
  if (chance < 1 && chance >= 0.995) return 'over 99%';
  return `${Math.round(chance * 100)}%`;
}
