// Newest input wins (spec §11): each edit sends a request that replaces any queued one of its kind (for Upgrade
// Strategy and Top x% Echo Scores, of its kind and strategy), and the app only passes on the results of the newest
// request of each it sent. The worker runs one job per Weight Table for Echo Evaluation, one per strategy for Upgrade
// Strategy (A before B), and one for an example's Top x% Echo Scores, and posts each result as soon as it is ready;
// between jobs, the rest of an outdated request is dropped.
import type { EchoEvaluationJobs } from './echoEvaluationJob';
import type {
  CalculationRequest,
  CalculationResponse,
  EchoEvaluationInput,
  EchoEvaluationListInput,
  EchoEvaluationResult,
  StrategyName,
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
  /**
   * Calculates Strategy A or B. A later call for the same strategy replaces this one, as for `evaluate`; one for the
   * other strategy doesn't.
   */
  calculateUpgradeStrategy(
    strategy: StrategyName,
    input: UpgradeStrategyInput,
    onResult: (result: UpgradeStrategyResult) => void,
  ): void;
  /**
   * Works out the Echo Score of a Top x% Echo for each x, for an example loaded into Strategy A or B. A later call for
   * the same strategy replaces this one.
   */
  topEchoScores(
    strategy: StrategyName,
    input: TopEchoScoresInput,
    onResult: (result: TopEchoScoresResult) => void,
  ): void;
}

interface Newest<Result> {
  readonly id: number;
  readonly onResult: (result: Result) => void;
}

/** The app side: sends inputs to the worker and passes on only the newest one's results, per kind and strategy. */
export function createCalculator(port: MessagePortLike): Calculator {
  let nextId = 1;
  let newestEvaluation: Newest<EchoEvaluationResult> | null = null;
  const newestStrategy: Partial<Record<StrategyName, Newest<UpgradeStrategyResult>>> = {};
  const newestTopScores: Partial<Record<StrategyName, Newest<TopEchoScoresResult>>> = {};
  port.onmessage = ({ data }: MessageEvent<CalculationResponse>) => {
    if (data.kind === 'echoEvaluation') {
      if (newestEvaluation?.id === data.id) newestEvaluation.onResult(data.result);
    } else if (data.kind === 'topEchoScores') {
      const newest = newestTopScores[data.strategy];
      if (newest?.id === data.id) newest.onResult(data.result);
    } else {
      const newest = newestStrategy[data.strategy];
      if (newest?.id === data.id) newest.onResult(data.result);
    }
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
    calculateUpgradeStrategy(strategy, input, onResult) {
      const id = nextId++;
      newestStrategy[strategy] = { id, onResult };
      send({ kind: 'upgradeStrategy', id, strategy, input });
    },
    topEchoScores(strategy, input, onResult) {
      const id = nextId++;
      newestTopScores[strategy] = { id, onResult };
      send({ kind: 'topEchoScores', id, strategy, input });
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

/** A queued request of one strategy. */
interface Queued<Input> {
  readonly id: number;
  readonly input: Input;
}

/** Takes the first queued request off a non-empty queue: Strategy A's, or else B's (spec §11, "Job order"). */
function takeFirst<Input>(queue: Map<StrategyName, Queued<Input>>) {
  const strategy: StrategyName = queue.has('A') ? 'A' : 'B';
  const queued = queue.get(strategy);
  if (!queued) throw new Error('Nothing queued');
  queue.delete(strategy);
  return { strategy, ...queued };
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
  // The queued request of each strategy; A's runs before B's.
  const strategies = new Map<StrategyName, Queued<UpgradeStrategyInput>>();
  const topScores = new Map<StrategyName, Queued<TopEchoScoresInput>>();
  let scheduled = false;
  port.onmessage = ({ data }: MessageEvent<CalculationRequest>) => {
    if (data.kind === 'echoEvaluation')
      evaluation = {
        id: data.id,
        listedNames: data.input.tables.map(({ table }) => table.name),
        left: jobsOf(data.input),
        started: false,
      };
    else if (data.kind === 'topEchoScores')
      topScores.set(data.strategy, { id: data.id, input: data.input });
    else strategies.set(data.strategy, { id: data.id, input: data.input });
    scheduleNext();
  };

  const hasWork = () =>
    (evaluation !== null && evaluation.left.length > 0) ||
    strategies.size > 0 ||
    topScores.size > 0;

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
    } else if (topScores.size > 0) {
      // Before the strategies, which wait for an example's Top x% Echo Scores.
      const { id, strategy, input } = takeFirst(topScores);
      post({ kind: 'topEchoScores', id, strategy, result: jobs.topEchoScores.run(input) });
    } else if (strategies.size > 0) {
      const { id, strategy, input } = takeFirst(strategies);
      post({ kind: 'upgradeStrategy', id, strategy, result: jobs.upgradeStrategy.run(input) });
    }
    scheduleNext();
  }

  function post(response: CalculationResponse) {
    port.postMessage(response);
  }
}
