import { describe, expect, it, vi } from 'vitest';
import { createCalculator, serveCalculations, type MessagePortLike } from './newestInputWins';
import type {
  EchoEvaluationInput,
  EchoEvaluationListInput,
  EchoEvaluationResult,
} from './protocol';

const tableNamed = (name: string) => ({ name, weights: { Critical_Rate: 6 } });

/** A request for these listed tables, top to bottom, with this one in focus and every Target Score set to target. */
const listInput = (
  names: readonly string[],
  focusedTableName: string | null = names[0] ?? null,
  target = 1,
): EchoEvaluationListInput => ({
  substats: [],
  tables: names.map((name) => ({
    table: tableNamed(name),
    targetScore: target,
    erTargetScore: null,
  })),
  focusedTableName,
});

// A result that says which input it came from.
const resultFor = (input: EchoEvaluationInput) =>
  ({ tableName: `${input.table.name} @${input.targetScore}` }) as EchoEvaluationResult;

function fakeJobs() {
  return { run: vi.fn(resultFor), keepOnly: vi.fn<(tableNames: readonly string[]) => void>() };
}

function fakePort(): MessagePortLike & { sent: unknown[] } {
  return {
    sent: [],
    onmessage: null,
    postMessage(message: unknown) {
      this.sent.push(message);
    },
  };
}

const deliver = (port: MessagePortLike, data: unknown) =>
  port.onmessage?.(new MessageEvent('message', { data }));

const request = (id: number, input: EchoEvaluationListInput) => ({
  kind: 'echoEvaluation',
  id,
  input,
});
const response = (id: number, tableName: string) => ({
  kind: 'echoEvaluation',
  id,
  result: { tableName },
});

/** Runs the jobs scheduled so far, one at a time, as the worker's event loop would. */
function stepper() {
  const queued: (() => void)[] = [];
  return {
    schedule: (job: () => void) => queued.push(job),
    step: () => queued.shift()?.(),
    runAll: () => {
      for (let job = queued.shift(); job; job = queued.shift()) job();
    },
  };
}

describe('the worker side', () => {
  it('runs one job per Weight Table, the focused one first and then the list top to bottom', () => {
    const port = fakePort();
    const { schedule, runAll } = stepper();
    serveCalculations(port, fakeJobs(), schedule);

    deliver(port, request(1, listInput(['A', 'B', 'C', 'D'], 'C')));
    runAll();

    expect(port.sent).toEqual([
      response(1, 'C @1'),
      response(1, 'A @1'),
      response(1, 'B @1'),
      response(1, 'D @1'),
    ]);
  });

  it('posts each table’s result as soon as it is ready', () => {
    const port = fakePort();
    const { schedule, step } = stepper();
    serveCalculations(port, fakeJobs(), schedule);

    deliver(port, request(1, listInput(['A', 'B'])));
    step();
    expect(port.sent).toEqual([response(1, 'A @1')]);
    step();
    expect(port.sent).toEqual([response(1, 'A @1'), response(1, 'B @1')]);
  });

  it('runs only the newest request that arrived before it got to work', () => {
    const port = fakePort();
    const jobs = fakeJobs();
    const { schedule, runAll } = stepper();
    serveCalculations(port, jobs, schedule);

    deliver(port, request(1, listInput(['A'], 'A', 1)));
    deliver(port, request(2, listInput(['A'], 'A', 2)));
    deliver(port, request(3, listInput(['A'], 'A', 3)));
    runAll();

    expect(jobs.run).toHaveBeenCalledTimes(1);
    expect(port.sent).toEqual([response(3, 'A @3')]);
  });

  it('drops the rest of an outdated request between jobs', () => {
    const port = fakePort();
    const { schedule, step, runAll } = stepper();
    serveCalculations(port, fakeJobs(), schedule);

    deliver(port, request(1, listInput(['A', 'B', 'C'], 'A', 1)));
    step();
    deliver(port, request(2, listInput(['A', 'B', 'C'], 'B', 2)));
    runAll();

    expect(port.sent).toEqual([
      response(1, 'A @1'),
      response(2, 'B @2'),
      response(2, 'A @2'),
      response(2, 'C @2'),
    ]);
  });

  it('runs a request that arrives after the last one finished', () => {
    const port = fakePort();
    const { schedule, runAll } = stepper();
    serveCalculations(port, fakeJobs(), schedule);

    deliver(port, request(1, listInput(['A'])));
    runAll();
    deliver(port, request(2, listInput(['A'])));
    runAll();

    expect(port.sent).toHaveLength(2);
  });

  it('keeps tables only for the Weight Tables listed now', () => {
    const port = fakePort();
    const jobs = fakeJobs();
    const { schedule, runAll } = stepper();
    serveCalculations(port, jobs, schedule);

    deliver(port, request(1, listInput(['A', 'B'])));
    runAll();
    expect(jobs.keepOnly).toHaveBeenLastCalledWith(['A', 'B']);
  });
});

describe('the app side', () => {
  it('sends each input to the worker', () => {
    const port = fakePort();
    const calculator = createCalculator(port);
    calculator.evaluate(listInput(['A']), () => {});
    expect(port.sent).toEqual([request(1, listInput(['A']))]);
  });

  it('passes on every result of the newest input and drops outdated ones', () => {
    const port = fakePort();
    const calculator = createCalculator(port);
    const first = vi.fn();
    const second = vi.fn();
    calculator.evaluate(listInput(['A', 'B']), first);
    calculator.evaluate(listInput(['A', 'B']), second);

    deliver(port, response(1, 'A @1'));
    deliver(port, response(2, 'A @1'));
    deliver(port, response(2, 'B @1'));

    expect(first).not.toHaveBeenCalled();
    expect(second.mock.calls).toEqual([[{ tableName: 'A @1' }], [{ tableName: 'B @1' }]]);
  });
});
