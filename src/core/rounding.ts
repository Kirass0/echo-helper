// .NET's Math.Round(x, digits) scales by 10^digits, rounds half to even, and scales back; values of 1e16 or more are
// returned as they are. JS has no built-in banker's rounding.
const ROUND_LIMIT = 1e16;
const POWER_10_12 = 1e12;

function roundHalfToEven(x: number): number {
  const floor = Math.floor(x);
  const fraction = x - floor; // exact for every double below 2^53
  if (fraction > 0.5) return floor + 1;
  if (fraction < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

/** Rounds to 12 decimals exactly as .NET's `Math.Round(x, 12)`, which is banker's rounding. */
export function roundTo12Decimals(x: number): number {
  if (!(Math.abs(x) < ROUND_LIMIT)) return x;
  return roundHalfToEven(x * POWER_10_12) / POWER_10_12;
}
