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

/** A Success Rate or Discard Rate in [0, 1]: 1 decimal, and "<0.1%" above 0 but below that (the prototype's `pct1`). */
export function formatRate(rate: number): string {
  if (rate > 0 && rate < 0.001) return '<0.1%';
  return `${(rate * 100).toFixed(1)}%`;
}

/** Echo EXP, Tuners or Shell Credits: a whole number with thousands separators (the prototype's `int`). */
export const formatWhole = (amount: number) => Math.round(amount).toLocaleString('en-US');

/** Echoes started per Successful Echo: 2 decimals. */
export const formatEchoesStarted = (echoes: number) => echoes.toFixed(2);

/** A Substat value as the game shows it: 8.1%, 430. */
export const formatSubstatValue = (type: SubstatType, value: number) =>
  isPercentType(type) ? `${value}%` : String(value);
