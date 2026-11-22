// For component tests only: the calculation worker's code, run on the test's own thread over an in-memory channel.
// Messages are delivered as later tasks, as a real worker's are.
import { createEchoEvaluationJobs } from '../calculation/echoEvaluationJob';
import {
  createCalculator,
  serveCalculations,
  type Calculator,
  type MessagePortLike,
} from '../calculation/newestInputWins';

function portPair(): [MessagePortLike, MessagePortLike] {
  const a: MessagePortLike = { onmessage: null, postMessage: (data) => send(b, data) };
  const b: MessagePortLike = { onmessage: null, postMessage: (data) => send(a, data) };
  const send = (to: MessagePortLike, data: unknown) =>
    setTimeout(() => to.onmessage?.(new MessageEvent('message', { data: structuredClone(data) })));
  return [a, b];
}

export function inProcessCalculator(): Calculator {
  const [app, worker] = portPair();
  serveCalculations(worker, createEchoEvaluationJobs());
  return createCalculator(app);
}
