import { describe, expect, it, vi } from 'vitest';
import { createCalculator, serveCalculations, type MessagePortLike } from './newestInputWins';
import type { EchoEvaluationInput, EchoEvaluationResult } from './protocol';

const table = { name: 'Crit Rate', weights: { Critical_Rate: 6 } };
const inputWithTarget = (targetScore: number): EchoEvaluationInput => ({
  substats: [],
  table,
  targetScore,
  erTargetScore: null,
});

// A result that says which input it came from.
const resultFor = (input: EchoEvaluationInput) =>
  ({ tableName: `target ${input.targetScore}` }) as EchoEvaluationResult;

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

describe('the worker side', () => {
  it('runs only the newest request that arrived before it got to work', () => {
    const port = fakePort();
    const run = vi.fn(resultFor);
    const queued: (() => void)[] = [];
    serveCalculations(port, run, (job) => queued.push(job));

    deliver(port, { kind: 'echoEvaluation', id: 1, input: inputWithTarget(1) });
    deliver(port, { kind: 'echoEvaluation', id: 2, input: inputWithTarget(2) });
    deliver(port, { kind: 'echoEvaluation', id: 3, input: inputWithTarget(3) });
    queued.splice(0).forEach((job) => job());

    expect(run).toHaveBeenCalledTimes(1);
    expect(port.sent).toEqual([
      { kind: 'echoEvaluation', id: 3, result: { tableName: 'target 3' } },
    ]);
  });

  it('runs a request that arrives after the last one finished', () => {
    const port = fakePort();
    const queued: (() => void)[] = [];
    serveCalculations(port, resultFor, (job) => queued.push(job));

    deliver(port, { kind: 'echoEvaluation', id: 1, input: inputWithTarget(1) });
    queued.splice(0).forEach((job) => job());
    deliver(port, { kind: 'echoEvaluation', id: 2, input: inputWithTarget(2) });
    queued.splice(0).forEach((job) => job());

    expect(port.sent).toHaveLength(2);
  });
});

describe('the app side', () => {
  it('sends each input to the worker', () => {
    const port = fakePort();
    const calculator = createCalculator(port);
    calculator.evaluate(inputWithTarget(1), () => {});
    expect(port.sent).toEqual([{ kind: 'echoEvaluation', id: 1, input: inputWithTarget(1) }]);
  });

  it('passes on the newest input’s result and drops outdated ones', () => {
    const port = fakePort();
    const calculator = createCalculator(port);
    const first = vi.fn();
    const second = vi.fn();
    calculator.evaluate(inputWithTarget(1), first);
    calculator.evaluate(inputWithTarget(2), second);

    deliver(port, { kind: 'echoEvaluation', id: 1, result: resultFor(inputWithTarget(1)) });
    deliver(port, { kind: 'echoEvaluation', id: 2, result: resultFor(inputWithTarget(2)) });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith({ tableName: 'target 2' });
  });
});
