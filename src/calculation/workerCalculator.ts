import { createCalculator, type Calculator } from './newestInputWins';

/** Starts the one dedicated calculation worker and returns the app's way of talking to it. */
export function startWorkerCalculator(): Calculator {
  const worker = new Worker(new URL('./calculation.worker.ts', import.meta.url), {
    type: 'module',
    name: 'calculation',
  });
  return createCalculator(worker);
}
