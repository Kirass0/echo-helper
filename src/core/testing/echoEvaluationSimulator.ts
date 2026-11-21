import { Echo, echoScore, seededRandom, type SubstatWeightTable } from '../index';

/**
 * The sampling the Echo Evaluation used before it was calculated exactly, kept as an oracle so the calculation and
 * Echo.tune can't silently disagree. Ported from the source's EchoEvaluationSimulator, with its own seeded generator.
 */
export function tuneCopiesToMax(
  template: Echo,
  table: SubstatWeightTable,
  iterations: number,
  seed: number,
): { echoScores: Float64Array; hasEr: boolean[] } {
  const random = seededRandom(seed);
  const echoScores = new Float64Array(iterations);
  const hasEr = new Array<boolean>(iterations);
  for (let i = 0; i < iterations; i++) {
    const echo = template.clone();
    echo.tuneToMax(random);
    echoScores[i] = echoScore(echo, table);
    hasEr[i] = echo.substats.has('Energy_Regen');
  }
  return { echoScores, hasEr };
}
