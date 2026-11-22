// Number formats (spec §17), after the ticket 11 prototype's `pct` and `sc` helpers.
import type { SubstatType } from '../core/gameData';
import { isPercentType } from './substats';

/** An Echo Score, or a Median / Average / Best Echo Score: 2 decimals. */
export const formatEchoScore = (score: number) => score.toFixed(2);

/** A chance in [0, 1] as a percentage with 2 decimals, "<0.01%" above 0 but below that, and "0%" for exactly 0. */
export function formatChance(chance: number): string {
  if (chance === 0) return '0%';
  if (chance < 0.0001) return '<0.01%';
  return `${(chance * 100).toFixed(2)}%`;
}

/** A Top Percent or ER Top Percent: "Top 5.00%". */
export const formatTopPercent = (share: number) => `Top ${formatChance(share)}`;

/** A Substat value as the game shows it: 8.1%, 430. */
export const formatSubstatValue = (type: SubstatType, value: number) =>
  isPercentType(type) ? `${value}%` : String(value);
