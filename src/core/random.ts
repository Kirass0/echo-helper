/** A source of random integers, so tuning can be driven by a seeded generator. */
export interface RandomSource {
  /** A uniform integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}

/**
 * A seeded pseudo-random generator (mulberry32). The same seed always gives the same sequence; it does not reproduce
 * .NET's System.Random, so sampled results agree with the source only statistically.
 */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive) {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const unit = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      return Math.floor(unit * maxExclusive);
    },
  };
}
