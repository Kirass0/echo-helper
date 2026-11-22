import { useId } from 'react';
import type { EchoEvaluationResult } from '../calculation/protocol';
import { formatChance, formatEchoScore, formatTopPercent } from './format';
import styles from './ResultBoxes.module.css';
import { Term } from '../ui/Term';
import { TERM_TOOLTIPS } from './termTooltips';

const SET_TARGET = 'Set a Target Score below';
const SET_ER_TARGET = 'Set an ER Target Score below';
const NO_ENERGY_REGEN = 'No Energy Regen';

// A wide box's label before 5/5, then at 5/5.
const TARGET_LABELS = ['Target Chance', 'Target Score'] as const;
const ER_TARGET_LABELS = ['ER Target Chance', 'ER Target Score'] as const;

/** What a box shows: a figure, or "—" with the reason there is none. */
type BoxContent = { value: string; tone?: 'good' | 'bad' } | { reason: string };

const verdict = (reached: boolean): BoxContent =>
  reached ? { value: 'Reached', tone: 'good' } : { value: 'Not reached', tone: 'bad' };

const NOTHING_YET: BoxContent = { reason: '' };

/**
 * The eight result boxes for the table in focus, in three fixed rows. None ever disappears or changes size: a box
 * without a number shows "—" and why. Before the first result arrives, each box shows only "—". Each box is as tall
 * as the tallest content it can show at the current width, and no taller (ticket 26).
 */
export function ResultBoxes({ result }: { result: EchoEvaluationResult | null }) {
  const fullyTuned = result?.fullyTuned ?? false;
  const score = (pick: (r: EchoEvaluationResult) => number): BoxContent =>
    result ? { value: formatEchoScore(pick(result)) } : NOTHING_YET;

  function target(): BoxContent {
    if (!result) return NOTHING_YET;
    if (result.fullyTuned)
      return result.reachesTarget === null ? { reason: SET_TARGET } : verdict(result.reachesTarget);
    return result.targetChance === null
      ? { reason: SET_TARGET }
      : { value: formatChance(result.targetChance) };
  }

  function erTarget(): BoxContent {
    if (!result) return NOTHING_YET;
    if (result.fullyTuned) {
      if (!result.hasEnergyRegen) return { reason: NO_ENERGY_REGEN };
      return result.reachesErTarget === null
        ? { reason: SET_ER_TARGET }
        : verdict(result.reachesErTarget);
    }
    return result.erTargetChance === null
      ? { reason: SET_ER_TARGET }
      : { value: formatChance(result.erTargetChance) };
  }

  function erTopPercent(): BoxContent {
    if (!result) return NOTHING_YET;
    return result.erTopPercent === null
      ? { reason: NO_ENERGY_REGEN }
      : { value: formatTopPercent(result.erTopPercent) };
  }

  return (
    <div className={styles.boxes}>
      <Box
        wide
        label={TARGET_LABELS[fullyTuned ? 1 : 0]}
        content={target()}
        sizes={{ labels: TARGET_LABELS, reasons: [SET_TARGET] }}
      />
      <Box
        wide
        er
        label={ER_TARGET_LABELS[fullyTuned ? 1 : 0]}
        content={erTarget()}
        sizes={{ labels: ER_TARGET_LABELS, reasons: [SET_ER_TARGET, NO_ENERGY_REGEN] }}
      />
      <Box label="Echo Score" content={score((r) => r.echoScore)} />
      <Box
        label="Top Percent"
        content={result ? { value: formatTopPercent(result.topPercent) } : NOTHING_YET}
      />
      <Box
        er
        label="ER Top Percent"
        content={erTopPercent()}
        sizes={{ reasons: [NO_ENERGY_REGEN] }}
      />
      <Box label="Median Echo Score" content={score((r) => r.median)} />
      <Box label="Average Echo Score" content={score((r) => r.average)} />
      <Box label="Best Echo Score" content={score((r) => r.best)} />
    </div>
  );
}

/**
 * A box. `sizes` names every reason it can show, and every label when it can have more than one; hidden copies of
 * each label with each reason, stacked under what it shows, give the box the height of the tallest, so it never
 * resizes as its content changes. A box with no `sizes` only ever shows its label and a one-line value.
 */
function Box({
  label,
  content,
  wide,
  er,
  sizes,
}: {
  label: string;
  content: BoxContent;
  wide?: boolean;
  er?: boolean;
  sizes?: { labels?: readonly string[]; reasons: readonly string[] };
}) {
  const labelId = useId();
  const classes = [styles.box, wide && styles.wide, er && styles.er].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {sizes &&
        (sizes.labels ?? [label]).flatMap((sizeLabel) =>
          sizes.reasons.map((reason) => (
            <span key={`${sizeLabel}|${reason}`} className={styles.sizer} aria-hidden="true">
              <span className={styles.label}>{sizeLabel}</span>
              <NoFigure reason={reason} />
            </span>
          )),
        )}
      <div role="group" aria-labelledby={labelId} className={styles.shown}>
        <span id={labelId} className={styles.label}>
          {label in TERM_TOOLTIPS ? (
            <Term tooltip={TERM_TOOLTIPS[label as keyof typeof TERM_TOOLTIPS]}>{label}</Term>
          ) : (
            label
          )}
        </span>
        {'value' in content ? (
          <span className={[styles.value, content.tone && styles[content.tone]].join(' ')}>
            {content.value}
          </span>
        ) : (
          <NoFigure reason={content.reason} />
        )}
      </div>
    </div>
  );
}

/** "—" in place of a figure, and why there is none. */
const NoFigure = ({ reason }: { reason: string }) => (
  <>
    <span className={`${styles.value} ${styles.none}`}>—</span>
    <span className={styles.reason}>{reason}</span>
  </>
);
