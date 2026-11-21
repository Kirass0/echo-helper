import { useCallback, useMemo } from 'react';
import type { RenamedTable } from '../customTables/customTablesEntry';
import { createStoredEntry } from '../storage/storedEntry';
import { useStoredEntry } from '../storage/useStoredEntry';
import { renameTable } from './rememberedByName';
import {
  echoEvaluationDefinition,
  withoutVanishedTables,
  type EchoEvaluationState,
} from './echoEvaluationEntry';

const echoEvaluationEntry = createStoredEntry(echoEvaluationDefinition);

/** A change to some of Echo Evaluation's state, or how to make it from the newest state. */
export type EchoEvaluationChange =
  Partial<EchoEvaluationState> | ((state: EchoEvaluationState) => Partial<EchoEvaluationState>);

/**
 * Echo Evaluation's state, remembered across reloads and shared with other tabs (spec §12). Listed tables that no
 * longer exist are left out silently; the stored copy loses them at the next change, keeping their targets. Each
 * change builds on the newest state, so several changes before the next render all count.
 */
export function useRememberedEchoEvaluation(
  exists: (name: string) => boolean,
): [EchoEvaluationState, (change: EchoEvaluationChange) => void] {
  const [stored, save] = useStoredEntry(echoEvaluationEntry);
  const state = useMemo(() => withoutVanishedTables(stored, exists), [stored, exists]);
  const update = useCallback(
    (change: EchoEvaluationChange) =>
      save((last) => {
        const current = withoutVanishedTables(last, exists);
        return { ...current, ...(typeof change === 'function' ? change(current) : change) };
      }),
    [save, exists],
  );
  return [state, update];
}

/** Carries what Echo Evaluation remembers under each renamed table's old name to its new one, in the stored copy. */
export function followRenamesInEchoEvaluation(renamed: readonly RenamedTable[]) {
  const state = echoEvaluationEntry.load();
  const followed = renamed.reduce<EchoEvaluationState>(
    (remembered, { from, to }) => ({ ...remembered, ...renameTable(remembered, from, to) }),
    state,
  );
  echoEvaluationEntry.save(followed);
}
