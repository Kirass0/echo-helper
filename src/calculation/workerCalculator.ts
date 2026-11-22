import { createCalculator, type Calculator } from './newestInputWins';

/**
 * Starts the one dedicated calculation worker and returns the app's way of talking to it. The worker is started again
 * if it fails (spec §11, "Failure").
 */
export function startWorkerCalculator(): Calculator {
  return createCalculator(
    () =>
      new Worker(new URL('./calculation.worker.ts', import.meta.url), {
        type: 'module',
        name: 'calculation',
      }),
  );
}
