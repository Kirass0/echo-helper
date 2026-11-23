import { useEffect, useMemo, useRef, useState } from 'react';
import type { Calculator } from '../calculation/newestInputWins';
import type {
  StrategyName,
  UpgradeStrategyInput,
  UpgradeStrategyResult,
} from '../calculation/protocol';
import type { WeightTableData } from '../catalogue/catalogue';
import type { CalculationState } from '../ui/CalculationStatus';
import { useLongPending } from '../ui/useLongPending';
import { fillThresholds, loadExample, type LoadedExample, type PendingThreshold } from './examples';
import { finishedStrategy, type StrategyDraft } from './strategyDraft';

/** One strategy as held on Upgrade Strategy: Strategy A (the only one unless comparing) or Strategy B. */
export type HeldStrategy = HeldStrategyBase &
  (
    | {
        /** Whether the results are those of the strategy as it is now: nothing pending, unfinished or given up. */
        readonly settled: true;
        readonly result: UpgradeStrategyResult;
      }
    | {
        readonly settled: false;
        /** The latest results; null before the first arrives. */
        readonly result: UpgradeStrategyResult | null;
      }
  );

interface HeldStrategyBase {
  readonly draft: StrategyDraft;
  setDraft(draft: StrategyDraft): void;
  /** The first Tune Stage holding an unfinished rule, while there is one. */
  readonly unfinishedStage: number | null;
  /** Whether the results are from before the last change: a rule is unfinished, or thresholds are pending. */
  readonly waiting: boolean;
  /**
   * Whether the results have been calculating for about 300 ms or more, or couldn't be calculated (spec §11); the last
   * results then stay, faded.
   */
  readonly state: CalculationState;
  /** A loaded example's Top x% thresholds still being worked out. */
  readonly calculating: readonly PendingThreshold[];
  /** Replaces the strategy with an example, working out its Top x% thresholds for the table. */
  loadExample(name: string): void;
  /** Replaces the strategy with this one and forgets its results and any pending thresholds. */
  reset(draft: StrategyDraft): void;
}

/**
 * One strategy's rules and results. While `active`, every finished change is calculated at once as this strategy's
 * own job (spec §11); otherwise nothing is sent, and results that still arrive are dropped.
 */
export function useStrategy(
  calculator: Calculator,
  name: StrategyName,
  table: WeightTableData | undefined,
  active: boolean,
  initial: () => StrategyDraft,
): HeldStrategy {
  const [draft, setDraft] = useState(initial);
  const pending = usePendingThresholds(calculator, name, active ? table : undefined, setDraft);

  const finished = useMemo(() => finishedStrategy(draft), [draft]);
  // While an example's Top x% thresholds are pending, the results wait.
  const input = useMemo(
    (): UpgradeStrategyInput | null =>
      active && table && !pending.example && 'strategy' in finished
        ? { strategy: finished.strategy, table }
        : null,
    [active, table, finished, pending.example],
  );
  const calculated = useUpgradeStrategyResult(calculator, name, input);
  const unfinishedStage =
    !pending.example && 'unfinishedStage' in finished ? finished.unfinishedStage : null;
  // The results are pending while the strategy, or a loaded example's thresholds, are being calculated.
  const longPending = useLongPending(
    calculated.pending || pending.calculating ? [STRATEGY_RESULTS] : [],
  );
  const state: CalculationState =
    calculated.failed || pending.failed
      ? 'failed'
      : longPending.has(STRATEGY_RESULTS)
        ? 'calculating'
        : 'done';

  const { result } = calculated;
  return {
    draft,
    setDraft(next) {
      pending.forgetFailure();
      setDraft(next);
    },
    unfinishedStage,
    waiting: pending.example !== null || unfinishedStage !== null,
    state,
    ...(result !== null &&
    input !== null &&
    !calculated.pending &&
    !pending.calculating &&
    state === 'done'
      ? { settled: true as const, result }
      : { settled: false as const, result }),
    calculating: pending.example?.thresholds ?? [],
    loadExample(example) {
      const loaded = loadExample(example);
      setDraft(loaded.draft);
      pending.load(loaded);
    },
    reset(next) {
      setDraft(next);
      pending.load(null);
      calculated.clear();
    },
  };
}

/** What `useLongPending` watches for a strategy: its one set of results. */
const STRATEGY_RESULTS = 'strategy results';

/**
 * The loaded example whose Top x% thresholds are still being worked out, if any (spec §8, "Example strategies"). They
 * are worked out for the selected table, and filled into the strategy once that table's distribution is ready. A newer
 * example, or another table, supersedes a pending one: only the newest request's result is passed on.
 */
function usePendingThresholds(
  calculator: Calculator,
  name: StrategyName,
  table: WeightTableData | undefined,
  setDraft: (change: (draft: StrategyDraft) => StrategyDraft) => void,
) {
  const [example, setExample] = useState<LoadedExample | null>(null);
  // Whether working out the last example's thresholds was given up: they then stay empty (spec §11, "Failure").
  const [failed, setFailed] = useState(false);
  const newest = useRef<LoadedExample | null>(null);

  useEffect(() => {
    if (!example || !table) return;
    calculator.topEchoScores(
      name,
      { table, topPercents: example.topPercents },
      ({ echoScores }) => {
        if (newest.current !== example) return;
        newest.current = null;
        setDraft((draft) => fillThresholds(draft, example, echoScores));
        setExample(null);
      },
      () => {
        if (newest.current !== example) return;
        newest.current = null;
        setExample(null);
        setFailed(true);
      },
    );
  }, [calculator, name, example, table, setDraft]);

  return {
    example,
    /** Whether the thresholds are being worked out now: only while there is a table to work them out for. */
    calculating: example !== null && table !== undefined,
    failed,
    /** Starts working out a just-loaded example's thresholds; one without any, or none, has nothing pending. */
    load(loaded: LoadedExample | null) {
      const waiting = loaded && loaded.topPercents.length > 0 ? loaded : null;
      newest.current = waiting;
      setExample(waiting);
      setFailed(false);
    },
    /** An edit to the strategy leaves a failure behind. */
    forgetFailure() {
      setFailed(false);
    },
  };
}

/**
 * The newest result of the strategy: every valid change is sent at once, with no debounce; results of outdated
 * inputs are dropped. While a rule is unfinished nothing is sent, and the last result stays.
 */
function useUpgradeStrategyResult(
  calculator: Calculator,
  name: StrategyName,
  input: UpgradeStrategyInput | null,
) {
  const [result, setResult] = useState<UpgradeStrategyResult | null>(null);
  // The input the last answer was for, and whether its calculation was given up.
  const [answered, setAnswered] = useState<{
    input: UpgradeStrategyInput;
    failed: boolean;
  } | null>(null);
  // Counts what was sent; a cleared strategy counts one more, so a result still on its way is dropped.
  const sent = useRef(0);
  useEffect(() => {
    if (!input) return;
    const request = ++sent.current;
    calculator.calculateUpgradeStrategy(
      name,
      input,
      (calculated) => {
        if (sent.current !== request) return;
        setResult(calculated);
        setAnswered({ input, failed: false });
      },
      () => {
        if (sent.current === request) setAnswered({ input, failed: true });
      },
    );
  }, [calculator, name, input]);
  return {
    result,
    /** Whether the input's result is still to come. */
    pending: input !== null && answered?.input !== input,
    /** Whether the input's calculation was given up (spec §11, "Failure"). */
    failed: input !== null && answered?.input === input && answered.failed,
    clear() {
      sent.current++;
      setResult(null);
      setAnswered(null);
    },
  };
}
