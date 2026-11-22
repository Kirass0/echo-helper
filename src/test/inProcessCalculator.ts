// For component tests only: the calculation worker's code, run on the test's own thread over an in-memory channel.
// Messages are delivered as later tasks, as a real worker's are.
import { createEchoEvaluationJobs } from '../calculation/echoEvaluationJob';
import {
  createCalculator,
  serveCalculations,
  type CalculationJobs,
  type Calculator,
  type MessagePortLike,
  type WorkerLike,
} from '../calculation/newestInputWins';
import { createTopEchoScoresJobs } from '../calculation/topEchoScoresJob';
import { createUpgradeStrategyJobs } from '../calculation/upgradeStrategyJob';

/** A worker started on this thread; once terminated, nothing more passes either way. */
function inProcessWorker(jobs: CalculationJobs): WorkerLike {
  let terminated = false;
  const send = (to: MessagePortLike, data: unknown) =>
    setTimeout(() => {
      if (!terminated) to.onmessage?.(new MessageEvent('message', { data: structuredClone(data) }));
    });
  const app: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage: (data) => send(inside, data),
    terminate: () => {
      terminated = true;
    },
  };
  const inside: MessagePortLike = { onmessage: null, postMessage: (data) => send(app, data) };
  serveCalculations(inside, jobs);
  return app;
}

/**
 * The calculator on the test's own thread. `jobs` replaces some of the worker's jobs, e.g. with one that throws; each
 * restarted worker gets fresh ones.
 */
export function inProcessCalculator(jobs: () => Partial<CalculationJobs> = () => ({})): Calculator {
  return createCalculator(() =>
    inProcessWorker({
      echoEvaluation: createEchoEvaluationJobs(),
      upgradeStrategy: createUpgradeStrategyJobs(),
      topEchoScores: createTopEchoScoresJobs(),
      ...jobs(),
    }),
  );
}
