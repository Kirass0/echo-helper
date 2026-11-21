// Newest input wins (spec §11): each edit sends a request that replaces any queued one, and the app only passes on
// the result of the newest request it sent.
import type {
  EchoEvaluationInput,
  EchoEvaluationRequest,
  EchoEvaluationResponse,
  EchoEvaluationResult,
} from './protocol';

/** The part of a Worker, or of the worker's own global scope, that the two sides talk through. */
export interface MessagePortLike {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent) => void) | null;
}

/** What the app calculates with. The real one sends the work to the calculation worker. */
export interface Calculator {
  /**
   * Calculates Echo Evaluation for one input. A later call replaces this one: once it is made, this one's result is
   * never passed on.
   */
  evaluate(input: EchoEvaluationInput, onResult: (result: EchoEvaluationResult) => void): void;
}

/** The app side: sends inputs to the worker and passes on only the newest one's result. */
export function createCalculator(port: MessagePortLike): Calculator {
  let nextId = 1;
  let newest: { id: number; onResult: (result: EchoEvaluationResult) => void } | null = null;
  port.onmessage = ({ data }: MessageEvent<EchoEvaluationResponse>) => {
    if (newest !== null && data.id === newest.id) newest.onResult(data.result);
  };
  return {
    evaluate(input, onResult) {
      const id = nextId++;
      newest = { id, onResult };
      const request: EchoEvaluationRequest = { kind: 'echoEvaluation', id, input };
      port.postMessage(request);
    },
  };
}

/**
 * The worker side: keeps only the newest request that arrived, and runs it as a later task so that requests arriving
 * meanwhile replace it. A running job always finishes.
 */
export function serveCalculations(
  port: MessagePortLike,
  run: (input: EchoEvaluationInput) => EchoEvaluationResult,
  schedule: (job: () => void) => void = (job) => setTimeout(job, 0),
): void {
  let queued: EchoEvaluationRequest | null = null;
  port.onmessage = ({ data }: MessageEvent<EchoEvaluationRequest>) => {
    const wasIdle = queued === null;
    queued = data;
    if (wasIdle) schedule(runQueued);
  };

  function runQueued() {
    const request = queued;
    queued = null;
    if (request === null) return;
    const response: EchoEvaluationResponse = {
      kind: 'echoEvaluation',
      id: request.id,
      result: run(request.input),
    };
    port.postMessage(response);
  }
}
