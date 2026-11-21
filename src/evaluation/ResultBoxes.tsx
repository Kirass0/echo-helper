import { useId } from 'react';
import type { EchoEvaluationResult } from '../calculation/protocol';
import { formatChance, formatEchoScore, formatTopPercent } from './format';
import styles from './ResultBoxes.module.css';
import { Term } from '../ui/Term';
import { TERM_TOOLTIPS } from './termTooltips';

const SET_TARGET = 'Set a Target Score below';
const SET_ER_TARGET = 'Set an ER Target Score below';
const NO_ENERGY_REGEN = 'No Energy Regen';

/** What a box shows: a figure, or "—" with the reason there is none. */
type BoxContent = { value: string; tone?: 'good' | 'bad' } | { reason: string };

const verdict = (reached: boolean): BoxContent =>
  reached ? { value: 'Reached', tone: 'good' } : { value: 'Not reached', tone: 'bad' };

const NOTHING_YET: BoxContent = { reason: '' };

/**
 * The eight result boxes for the table in focus, in three fixed rows. None ever disappears or changes size: a box
 * without a number shows "—" and why. Before the first result arrives, each box shows only "—".
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
      <Box wide label={fullyTuned ? 'Target Score' : 'Target Chance'} content={target()} />
      <Box
        wide
        er
        label={fullyTuned ? 'ER Target Score' : 'ER Target Chance'}
        content={erTarget()}
      />
      <Box label="Echo Score" content={score((r) => r.echoScore)} />
      <Box
        label="Top Percent"
        content={result ? { value: formatTopPercent(result.topPercent) } : NOTHING_YET}
      />
      <Box er label="ER Top Percent" content={erTopPercent()} />
      <Box label="Median Echo Score" content={score((r) => r.median)} />
      <Box label="Average Echo Score" content={score((r) => r.average)} />
      <Box label="Best Echo Score" content={score((r) => r.best)} />
    </div>
  );
}

function Box({
  label,
  content,
  wide,
  er,
}: {
  label: string;
  content: BoxContent;
  wide?: boolean;
  er?: boolean;
}) {
  const labelId = useId();
  const classes = [styles.box, wide && styles.wide, er && styles.er].filter(Boolean).join(' ');
  return (
    <div role="group" aria-labelledby={labelId} className={classes}>
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
        <>
          <span className={`${styles.value} ${styles.none}`}>—</span>
          <span className={styles.reason}>{content.reason}</span>
        </>
      )}
    </div>
  );
}
