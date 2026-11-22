// Newest input wins (spec §11): each edit sends a request that replaces any queued one of its kind (for Upgrade
// Strategy and Top x% Echo Scores, of its kind and strategy), and the app only passes on the results of the newest
// request of each it sent. The worker runs one job per Weight Table for Echo Evaluation, one per strategy for Upgrade
// Strategy (A before B), and one for an example's Top x% Echo Scores, and posts each result as soon as it is ready;
// between jobs, the rest of an outdated request is dropped.
import type { EchoEvaluationJobs } from './echoEvaluationJob';
import type {
  CalculatingTab,
  CalculationRequest,
  CalculationResponse,
  EchoEvaluationInput,
  EchoEvaluationListInput,
  EchoEvaluationResult,
  FailedResponse,
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

/** The app's side of the calculation worker: a Worker, which can be restarted after it fails. */
export interface WorkerLike extends MessagePortLike {
  onerror: ((event: ErrorEvent) => void) | null;
  terminate(): void;
}

/** What the app calculates with. The real one sends the work to the calculation worker. */
export interface Calculator {
  /** Says which tab is visible: its jobs run before the hidden tab's (spec §11, "Job order"). */
  showTab(tab: CalculatingTab): void;
  /**
   * Calculates Echo Evaluation for every listed Weight Table, passing on each table's result as it arrives, or that the
   * table couldn't be calculated. A later call replaces this one: once it is made, none of this one's results are
   * passed on.
   */
  evaluate(
    input: EchoEvaluationListInput,
    onResult: (result: EchoEvaluationResult) => void,
    onFailed?: (tableName: string) => void,
  ): void;
  /**
   * Calculates Strategy A or B. A later call for the same strategy replaces this one, as for `evaluate`; one for the
   * other strategy doesn't.
   */
  calculateUpgradeStrategy(
    strategy: StrategyName,
    input: UpgradeStrategyInput,
    onResult: (result: UpgradeStrategyResult) => void,
    onFailed?: () => void,
  ): void;
  /**
   * Works out the Echo Score of a Top x% Echo for each x, for an example loaded into Strategy A or B. A later call for
   * the same strategy replaces this one.
   */
  topEchoScores(
    strategy: StrategyName,
    input: TopEchoScoresInput,
    onResult: (result: TopEchoScoresResult) => void,
    onFailed?: () => void,
  ): void;
}

type CalculationJobRequest = Exclude<CalculationRequest, { kind: 'visibleTab' }>;

/** The part name of a request that is a single job: Upgrade Strategy's, or Top x% Echo Scores'. */
const SINGLE_JOB = '';

/** The newest request of its kind and strategy, the one whose results the app still passes on. */
interface AwaitedRequest {
  readonly request: CalculationJobRequest;
  /** The jobs whose results are still to come, by part: an Echo Evaluation table's name, or `SINGLE_JOB`. */
  readonly waiting: Set<string>;
  readonly onResult: (result: never) => void;
  readonly onFailed: (part: string) => void;
}

const slotOf = (request: CalculationJobRequest) =>
  request.kind === 'echoEvaluation' ? request.kind : `${request.kind} ${request.strategy}`;

/** The request again, for only the jobs still to come. */
function remainderOf({ request, waiting }: AwaitedRequest): CalculationJobRequest {
  if (request.kind !== 'echoEvaluation') return request;
  const tables = request.input.tables.filter(({ table }) => waiting.has(table.name));
  return { ...request, input: { ...request.input, tables } };
}

/**
 * The app side: sends inputs to the worker and passes on only the newest one's results, per kind and strategy.
 *
 * The first time a job throws, or the worker crashes, the worker is restarted, once per page load, and is sent again
 * what is still to come (spec §11, "Failure"). A job that fails after that is given up: its `onFailed` is called, and
 * the rest go on. Once the restarted worker has crashed too, nothing more can be calculated: every job still to come,
 * and every later request, is given up until the page is reloaded.
 */
export function createCalculator(start: () => WorkerLike): Calculator {
  let nextId = 1;
  let visibleTab: CalculatingTab | null = null;
  const awaitedBySlot = new Map<string, AwaitedRequest>();
  let restarted = false;
  let worker: WorkerLike | null = connect(start());

  function connect(started: WorkerLike) {
    // What a worker still sends once it has been replaced is dropped.
    started.onmessage = ({ data }: MessageEvent<CalculationResponse>) => {
      if (started === worker) receive(data);
    };
    started.onerror = (event) => {
      // Handled here, so the browser reports it nowhere (spec §11).
      event.preventDefault();
      if (started === worker) workerCrashed();
    };
    return started;
  }

  const awaitedWith = (id: number) =>
    [...awaitedBySlot.values()].find((awaited) => awaited.request.id === id);

  function receive(data: CalculationResponse) {
    const awaited = awaitedWith(data.id);
    // What an outdated request sends, a failure included, is dropped.
    if (!awaited) return;
    if (data.kind === 'failed') {
      jobFailed(awaited, data.tableName ?? SINGLE_JOB);
      return;
    }
    awaited.waiting.delete(data.kind === 'echoEvaluation' ? data.result.tableName : SINGLE_JOB);
    // A request's id is its own, so the result is of the kind its `onResult` takes.
    (awaited.onResult as (result: unknown) => void)(data.result);
  }

  function giveUp(awaited: AwaitedRequest, part: string) {
    if (awaited.waiting.delete(part)) awaited.onFailed(part);
  }

  /** A job threw: the first time, the worker is restarted and the job retried; after that, the job is given up. */
  function jobFailed(awaited: AwaitedRequest, part: string) {
    if (!awaited.waiting.has(part)) return;
    if (restarted) giveUp(awaited, part);
    else restart();
  }

  /** The worker crashed, which says nothing of which job it was: every job still to come is retried, or given up. */
  function workerCrashed() {
    if (!restarted) {
      restart();
      return;
    }
    stop();
    worker = null;
    for (const awaited of awaitedBySlot.values())
      for (const part of [...awaited.waiting]) giveUp(awaited, part);
  }

  function stop() {
    if (!worker) return;
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
  }

  /** Starts the one new worker, and sends it the visible tab and every job still to come. */
  function restart() {
    restarted = true;
    stop();
    worker = connect(start());
    if (visibleTab) send({ kind: 'visibleTab', tab: visibleTab });
    for (const awaited of awaitedBySlot.values())
      if (awaited.waiting.size > 0) send(remainderOf(awaited));
  }

  function send(request: CalculationRequest) {
    worker?.postMessage(request);
  }

  function sendAwaited(
    request: CalculationJobRequest,
    parts: readonly string[],
    onResult: AwaitedRequest['onResult'],
    onFailed: AwaitedRequest['onFailed'],
  ) {
    const awaited: AwaitedRequest = { request, waiting: new Set(parts), onResult, onFailed };
    awaitedBySlot.set(slotOf(request), awaited);
    if (worker) send(request);
    // With no worker left, the request fails as soon as a worker's answer could have come, unless replaced by then.
    else
      queueMicrotask(() => {
        if (awaitedBySlot.get(slotOf(request)) === awaited)
          parts.forEach((part) => giveUp(awaited, part));
      });
  }

  return {
    showTab(tab) {
      visibleTab = tab;
      send({ kind: 'visibleTab', tab });
    },
    evaluate(input, onResult, onFailed = () => {}) {
      const parts = input.tables.map(({ table }) => table.name);
      sendAwaited({ kind: 'echoEvaluation', id: nextId++, input }, parts, onResult, onFailed);
    },
    calculateUpgradeStrategy(strategy, input, onResult, onFailed = () => {}) {
      const request = { kind: 'upgradeStrategy', id: nextId++, strategy, input } as const;
      sendAwaited(request, [SINGLE_JOB], onResult, onFailed);
    },
    topEchoScores(strategy, input, onResult, onFailed = () => {}) {
      const request = { kind: 'topEchoScores', id: nextId++, strategy, input } as const;
      sendAwaited(request, [SINGLE_JOB], onResult, onFailed);
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

const STRATEGY_ORDER: readonly StrategyName[] = ['A', 'B'];

interface ServedEvaluation {
  readonly id: number;
  readonly listedNames: readonly string[];
  readonly focusedTableName: string | null;
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
  // The queued request of each strategy; A's jobs run before B's.
  const strategies = new Map<StrategyName, Queued<UpgradeStrategyInput>>();
  const topScores = new Map<StrategyName, Queued<TopEchoScoresInput>>();
  // Echo Evaluation is visible until the app says otherwise: it is the tab an empty hash opens.
  let visibleTab: CalculatingTab = 'evaluation';
  let scheduled = false;
  port.onmessage = ({ data }: MessageEvent<CalculationRequest>) => {
    if (data.kind === 'visibleTab') visibleTab = data.tab;
    else if (data.kind === 'echoEvaluation')
      evaluation = {
        id: data.id,
        listedNames: data.input.tables.map(({ table }) => table.name),
        focusedTableName: data.input.focusedTableName,
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

  /** Runs the next job of the visible tab, or else of the hidden one, which still calculates. */
  function runNext() {
    scheduled = false;
    const order =
      visibleTab === 'evaluation'
        ? [runEchoEvaluationJob, runUpgradeStrategyJob]
        : [runUpgradeStrategyJob, runEchoEvaluationJob];
    order.some((run) => run());
    scheduleNext();
  }

  /** Runs Echo Evaluation's next job, if one is queued. */
  function runEchoEvaluationJob() {
    const request = evaluation;
    const job = request?.left.shift();
    if (!request || !job) return false;
    if (!request.started) {
      request.started = true;
      jobs.echoEvaluation.keepOnly(request.listedNames, request.focusedTableName);
    }
    attempt({ kind: 'failed', id: request.id, tableName: job.table.name }, () => ({
      kind: 'echoEvaluation',
      id: request.id,
      result: jobs.echoEvaluation.run(job),
    }));
    return true;
  }

  /**
   * Runs Upgrade Strategy's next job, if one is queued: Strategy A's before B's (spec §11, "Job order"), and a
   * strategy's Top x% Echo Scores before the strategy itself, which waits for them.
   */
  function runUpgradeStrategyJob() {
    const strategy = STRATEGY_ORDER.find((name) => topScores.has(name) || strategies.has(name));
    if (!strategy) return false;
    const top = topScores.get(strategy);
    if (top) {
      topScores.delete(strategy);
      attempt({ kind: 'failed', id: top.id }, () => ({
        kind: 'topEchoScores',
        id: top.id,
        strategy,
        result: jobs.topEchoScores.run(top.input),
      }));
      return true;
    }
    const queued = strategies.get(strategy);
    if (!queued) return false;
    strategies.delete(strategy);
    attempt({ kind: 'failed', id: queued.id }, () => ({
      kind: 'upgradeStrategy',
      id: queued.id,
      strategy,
      result: jobs.upgradeStrategy.run(queued.input),
    }));
    return true;
  }

  /** Posts a job's result or, if it throws, that it failed; either way the jobs after it still run. */
  function attempt(failed: FailedResponse, run: () => CalculationResponse) {
    let response: CalculationResponse;
    try {
      response = run();
    } catch {
      response = failed;
    }
    post(response);
  }

  function post(response: CalculationResponse) {
    port.postMessage(response);
  }
}
