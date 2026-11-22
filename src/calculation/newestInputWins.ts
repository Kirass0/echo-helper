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

/** The part of a request whose result is one job's: an Echo Evaluation table, or the one job of the other kinds. */
const ONLY_JOB = '';

/** The newest request of its kind and strategy, and what of it the app still waits for. */
interface Newest {
  readonly request: CalculationJobRequest;
  /** The jobs whose results are still to come, by part. */
  readonly waiting: Set<string>;
  /** The jobs that already failed once, and were retried in a restarted worker. */
  readonly retried: Set<string>;
  readonly onResult: (result: never) => void;
  readonly onFailed: (part: string) => void;
}

const slotOf = (request: CalculationJobRequest) =>
  request.kind === 'echoEvaluation' ? request.kind : `${request.kind} ${request.strategy}`;

/** The request again, for only the jobs still to come. */
function remainderOf({ request, waiting }: Newest): CalculationJobRequest {
  if (request.kind !== 'echoEvaluation') return request;
  const tables = request.input.tables.filter(({ table }) => waiting.has(table.name));
  return { ...request, input: { ...request.input, tables } };
}

/**
 * The app side: sends inputs to the worker and passes on only the newest one's results, per kind and strategy.
 *
 * When a job throws, or the worker crashes, the worker is restarted and is sent again what is still to come (spec
 * §11, "Failure"). A job that fails again after that is given up: its `onFailed` is called, and the rest go on.
 */
export function createCalculator(start: () => WorkerLike): Calculator {
  let nextId = 1;
  let visibleTab: CalculatingTab | null = null;
  const newest = new Map<string, Newest>();
  let worker = connect(start());

  function connect(started: WorkerLike) {
    // What a worker still sends once it has been replaced is dropped.
    started.onmessage = ({ data }: MessageEvent<CalculationResponse>) => {
      if (started === worker) receive(data);
    };
    started.onerror = (event) => {
      // Handled here, so the browser reports it nowhere (spec §11).
      event.preventDefault();
      if (started !== worker) return;
      // A crash says nothing of which job it was: every job still to come is retried, or given up.
      fail(
        [...newest.values()].flatMap((held) =>
          [...held.waiting].map((part) => [held, part] as const),
        ),
      );
    };
    return started;
  }

  const holding = (id: number) => [...newest.values()].find((held) => held.request.id === id);

  function receive(data: CalculationResponse) {
    const held = holding(data.id);
    if (data.kind === 'failed') {
      fail(held ? [[held, data.tableName ?? ONLY_JOB]] : []);
      return;
    }
    if (!held) return;
    held.waiting.delete(data.kind === 'echoEvaluation' ? data.result.tableName : ONLY_JOB);
    // A request's id is its own, so the result is of the kind its `onResult` takes.
    (held.onResult as (result: unknown) => void)(data.result);
  }

  /** Gives up the jobs that failed before, retries the others, and restarts the worker either way. */
  function fail(failures: readonly (readonly [Newest, string])[]) {
    for (const [held, part] of failures) {
      if (!held.waiting.has(part)) continue;
      if (held.retried.has(part)) {
        held.waiting.delete(part);
        held.onFailed(part);
      } else held.retried.add(part);
    }
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    worker = connect(start());
    if (visibleTab) worker.postMessage({ kind: 'visibleTab', tab: visibleTab });
    for (const held of newest.values()) if (held.waiting.size > 0) send(remainderOf(held));
  }

  function send(request: CalculationRequest) {
    worker.postMessage(request);
  }

  function hold(
    request: CalculationJobRequest,
    parts: readonly string[],
    onResult: Newest['onResult'],
    onFailed: Newest['onFailed'],
  ) {
    newest.set(slotOf(request), {
      request,
      waiting: new Set(parts),
      retried: new Set(),
      onResult,
      onFailed,
    });
    send(request);
  }

  return {
    showTab(tab) {
      visibleTab = tab;
      send({ kind: 'visibleTab', tab });
    },
    evaluate(input, onResult, onFailed = () => {}) {
      const parts = input.tables.map(({ table }) => table.name);
      hold({ kind: 'echoEvaluation', id: nextId++, input }, parts, onResult, onFailed);
    },
    calculateUpgradeStrategy(strategy, input, onResult, onFailed = () => {}) {
      const request = { kind: 'upgradeStrategy', id: nextId++, strategy, input } as const;
      hold(request, [ONLY_JOB], onResult, onFailed);
    },
    topEchoScores(strategy, input, onResult, onFailed = () => {}) {
      const request = { kind: 'topEchoScores', id: nextId++, strategy, input } as const;
      hold(request, [ONLY_JOB], onResult, onFailed);
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
  // The queued request of each strategy; A's runs before B's.
  const strategies = new Map<StrategyName, Queued<UpgradeStrategyInput>>();
  const topScores = new Map<StrategyName, Queued<TopEchoScoresInput>>();
  // Echo Evaluation is visible until the app says otherwise: it is the tab an empty hash opens.
  let visibleTab: CalculatingTab = 'echoEvaluation';
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
      visibleTab === 'echoEvaluation'
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

  /** Runs Upgrade Strategy's next job, if one is queued. */
  function runUpgradeStrategyJob() {
    if (topScores.size > 0) {
      // Before the strategies, which wait for an example's Top x% Echo Scores.
      const { id, strategy, input } = takeFirst(topScores);
      attempt({ kind: 'failed', id }, () => ({
        kind: 'topEchoScores',
        id,
        strategy,
        result: jobs.topEchoScores.run(input),
      }));
      return true;
    }
    if (strategies.size === 0) return false;
    const { id, strategy, input } = takeFirst(strategies);
    attempt({ kind: 'failed', id }, () => ({
      kind: 'upgradeStrategy',
      id,
      strategy,
      result: jobs.upgradeStrategy.run(input),
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
