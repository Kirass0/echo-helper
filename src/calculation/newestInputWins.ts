// Newest input wins (spec §11): each edit sends a request that replaces any queued one, and the app only passes on
// the results of the newest request it sent. The worker runs one job per Weight Table and posts each result as soon
// as it is ready; between jobs, the rest of an outdated request is dropped.
import type { EchoEvaluationJobs } from './echoEvaluationJob';
import type {
  EchoEvaluationInput,
  EchoEvaluationListInput,
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
   * Calculates Echo Evaluation for every listed Weight Table, passing on each table's result as it arrives. A later
   * call replaces this one: once it is made, none of this one's results are passed on.
   */
  evaluate(input: EchoEvaluationListInput, onResult: (result: EchoEvaluationResult) => void): void;
}

/** The app side: sends inputs to the worker and passes on only the newest one's results. */
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

/** The jobs in the order they run (spec §11): the focused table first, then the list top to bottom. */
function jobsOf({ substats, tables, focusedTableName }: EchoEvaluationListInput) {
  const focused = tables.filter(({ table }) => table.name === focusedTableName);
  const others = tables.filter(({ table }) => table.name !== focusedTableName);
  return [...focused, ...others].map((listed): EchoEvaluationInput => ({ substats, ...listed }));
}

interface ServedRequest {
  readonly id: number;
  readonly listedNames: readonly string[];
  readonly left: EchoEvaluationInput[];
  started: boolean;
}

/**
 * The worker side: keeps only the newest request that arrived, and runs its jobs one per later task, so that a
 * request arriving meanwhile replaces what is left of the one before. A running job always finishes.
 */
export function serveCalculations(
  port: MessagePortLike,
  jobs: Pick<EchoEvaluationJobs, 'run' | 'keepOnly'>,
  schedule: (job: () => void) => void = (job) => setTimeout(job, 0),
): void {
  let current: ServedRequest | null = null;
  let scheduled = false;
  port.onmessage = ({ data }: MessageEvent<EchoEvaluationRequest>) => {
    current = {
      id: data.id,
      listedNames: data.input.tables.map(({ table }) => table.name),
      left: jobsOf(data.input),
      started: false,
    };
    scheduleNext();
  };

  function scheduleNext() {
    if (scheduled || current === null || current.left.length === 0) return;
    scheduled = true;
    schedule(runNext);
  }

  function runNext() {
    scheduled = false;
    const request = current;
    const job = request?.left.shift();
    if (!request || !job) return;
    if (!request.started) {
      request.started = true;
      jobs.keepOnly(request.listedNames);
    }
    const response: EchoEvaluationResponse = {
      kind: 'echoEvaluation',
      id: request.id,
      result: jobs.run(job),
    };
    port.postMessage(response);
    scheduleNext();
  }
}
