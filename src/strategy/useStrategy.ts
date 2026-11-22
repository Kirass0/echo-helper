import { useEffect, useMemo, useRef, useState } from 'react';
import type { Calculator } from '../calculation/newestInputWins';
import type {
  StrategyName,
  UpgradeStrategyInput,
  UpgradeStrategyResult,
} from '../calculation/protocol';
import type { WeightTableData } from '../catalogue/catalogue';
import { fillThresholds, loadExample, type LoadedExample, type PendingThreshold } from './examples';
import { finishedStrategy, type StrategyDraft } from './strategyDraft';

/** One strategy as held on Upgrade Strategy: Strategy A (the only one unless comparing) or Strategy B. */
export interface HeldStrategy {
  readonly draft: StrategyDraft;
  setDraft(draft: StrategyDraft): void;
  /** The latest results; null before the first arrives. */
  readonly result: UpgradeStrategyResult | null;
  /** The first Tune Stage holding an unfinished rule, while there is one. */
  readonly unfinishedStage: number | null;
  /** Whether the results are from before the last change: a rule is unfinished, or thresholds are pending. */
  readonly waiting: boolean;
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
  const { result, clear } = useUpgradeStrategyResult(calculator, name, input);
  const unfinishedStage =
    !pending.example && 'unfinishedStage' in finished ? finished.unfinishedStage : null;

  return {
    draft,
    setDraft,
    result,
    unfinishedStage,
    waiting: pending.example !== null || unfinishedStage !== null,
    calculating: pending.example?.thresholds ?? [],
    loadExample(example) {
      const loaded = loadExample(example);
      setDraft(loaded.draft);
      pending.load(loaded);
    },
    reset(next) {
      setDraft(next);
      pending.load(null);
      clear();
    },
  };
}

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
    );
  }, [calculator, name, example, table, setDraft]);

  return {
    example,
    /** Starts working out a just-loaded example's thresholds; one without any, or none, has nothing pending. */
    load(loaded: LoadedExample | null) {
      const waiting = loaded && loaded.topPercents.length > 0 ? loaded : null;
      newest.current = waiting;
      setExample(waiting);
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
  // Counts what was sent; a cleared strategy counts one more, so a result still on its way is dropped.
  const sent = useRef(0);
  useEffect(() => {
    if (!input) return;
    const request = ++sent.current;
    calculator.calculateUpgradeStrategy(name, input, (calculated) => {
      if (sent.current === request) setResult(calculated);
    });
  }, [calculator, name, input]);
  return {
    result,
    clear() {
      sent.current++;
      setResult(null);
    },
  };
}
