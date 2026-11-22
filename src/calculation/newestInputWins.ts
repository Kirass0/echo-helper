// Newest input wins (spec §11): each edit sends a request that replaces any queued one of its kind, and the app only
// passes on the results of the newest request of each kind it sent. The worker runs one job per Weight Table for Echo
// Evaluation, one per strategy for Upgrade Strategy, and one for an example's Top x% Echo Scores, and posts each result
// as soon as it is ready; between jobs, the rest of an outdated request is dropped.
import type { EchoEvaluationJobs } from './echoEvaluationJob';
import type {
  CalculationRequest,
  CalculationResponse,
  EchoEvaluationInput,
  EchoEvaluationListInput,
  EchoEvaluationResult,
  TopEchoScoresInput,
  TopEchoScoresResult,
  UpgradeStrategyInput,
  UpgradeStrategyResult,
} from './protocol';
import type { TopEchoScoresJobs } from './topEchoScoresJob';
import type { UpgradeStrategyJobs } from './upgradeStrategyJob';

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
  /** Calculates one Upgrade Strategy. A later call replaces this one, as for `evaluate`. */
  calculateUpgradeStrategy(
    input: UpgradeStrategyInput,
    onResult: (result: UpgradeStrategyResult) => void,
  ): void;
  /** Works out the Echo Score of a Top x% Echo for each x, for an example. A later call replaces this one. */
  topEchoScores(input: TopEchoScoresInput, onResult: (result: TopEchoScoresResult) => void): void;
}

/** The app side: sends inputs to the worker and passes on only the newest one's results, per kind. */
export function createCalculator(port: MessagePortLike): Calculator {
  let nextId = 1;
  let newestEvaluation: { id: number; onResult: (result: EchoEvaluationResult) => void } | null =
    null;
  let newestStrategy: { id: number; onResult: (result: UpgradeStrategyResult) => void } | null =
    null;
  let newestTopScores: { id: number; onResult: (result: TopEchoScoresResult) => void } | null =
    null;
  port.onmessage = ({ data }: MessageEvent<CalculationResponse>) => {
    if (data.kind === 'echoEvaluation') {
      if (newestEvaluation?.id === data.id) newestEvaluation.onResult(data.result);
    } else if (data.kind === 'topEchoScores') {
      if (newestTopScores?.id === data.id) newestTopScores.onResult(data.result);
    } else if (newestStrategy?.id === data.id) newestStrategy.onResult(data.result);
  };
  function send(request: CalculationRequest) {
    port.postMessage(request);
  }
  return {
    evaluate(input, onResult) {
      const id = nextId++;
      newestEvaluation = { id, onResult };
      send({ kind: 'echoEvaluation', id, input });
    },
    calculateUpgradeStrategy(input, onResult) {
      const id = nextId++;
      newestStrategy = { id, onResult };
      send({ kind: 'upgradeStrategy', id, input });
    },
    topEchoScores(input, onResult) {
      const id = nextId++;
      newestTopScores = { id, onResult };
      send({ kind: 'topEchoScores', id, input });
    },
  };
}

/** The jobs in the order they run (spec §11): the focused table first, then the list top to bottom. */
function jobsOf({ substats, tables, focusedTableName }: EchoEvaluationListInput) {
  const focused = tables.filter(({ table }) => table.name === focusedTableName);
  const others = tables.filter(({ table }) => table.name !== focusedTableName);
  return [...focused, ...others].map((listed): EchoEvaluationInput => ({ substats, ...listed }));
}

/** What the worker runs: Echo Evaluation's jobs, Upgrade Strategy's and the examples' Top x% Echo Scores. */
export interface CalculationJobs {
  readonly echoEvaluation: Pick<EchoEvaluationJobs, 'run' | 'keepOnly'>;
  readonly upgradeStrategy: Pick<UpgradeStrategyJobs, 'run'>;
  readonly topEchoScores: Pick<TopEchoScoresJobs, 'run'>;
}

interface ServedEvaluation {
  readonly id: number;
  readonly listedNames: readonly string[];
  readonly left: EchoEvaluationInput[];
  started: boolean;
}

/**
 * The worker side: keeps only the newest request of each kind that arrived, and runs their jobs one per later task,
 * so that a request arriving meanwhile replaces what is left of the one before of its kind. A running job always
 * finishes.
 */
export function serveCalculations(
  port: MessagePortLike,
  jobs: CalculationJobs,
  schedule: (job: () => void) => void = (job) => setTimeout(job, 0),
): void {
  let evaluation: ServedEvaluation | null = null;
  let strategy: { readonly id: number; readonly input: UpgradeStrategyInput } | null = null;
  let topScores: { readonly id: number; readonly input: TopEchoScoresInput } | null = null;
  let scheduled = false;
  port.onmessage = ({ data }: MessageEvent<CalculationRequest>) => {
    if (data.kind === 'echoEvaluation')
      evaluation = {
        id: data.id,
        listedNames: data.input.tables.map(({ table }) => table.name),
        left: jobsOf(data.input),
        started: false,
      };
    else if (data.kind === 'topEchoScores') topScores = { id: data.id, input: data.input };
    else strategy = { id: data.id, input: data.input };
    scheduleNext();
  };

  const hasWork = () =>
    (evaluation !== null && evaluation.left.length > 0) || strategy !== null || topScores !== null;

  function scheduleNext() {
    if (scheduled || !hasWork()) return;
    scheduled = true;
    schedule(runNext);
  }

  function runNext() {
    scheduled = false;
    const request = evaluation;
    const job = request?.left.shift();
    if (request && job) {
      if (!request.started) {
        request.started = true;
        jobs.echoEvaluation.keepOnly(request.listedNames);
      }
      post({ kind: 'echoEvaluation', id: request.id, result: jobs.echoEvaluation.run(job) });
    } else if (topScores) {
      // Before the strategy, which waits for an example's Top x% Echo Scores.
      const { id, input } = topScores;
      topScores = null;
      post({ kind: 'topEchoScores', id, result: jobs.topEchoScores.run(input) });
    } else if (strategy) {
      const { id, input } = strategy;
      strategy = null;
      post({ kind: 'upgradeStrategy', id, result: jobs.upgradeStrategy.run(input) });
    }
    scheduleNext();
  }

  function post(response: CalculationResponse) {
    port.postMessage(response);
  }
}
