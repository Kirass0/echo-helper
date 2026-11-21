import { useMemo } from 'react';
import type { RenamedTable } from '../customTables/customTablesEntry';
import { createStoredEntry } from '../storage/storedEntry';
import { useStoredEntry } from '../storage/useStoredEntry';
import { renameTable } from './customTables';
import {
  echoEvaluationDefinition,
  withoutVanishedTables,
  type EchoEvaluationState,
} from './echoEvaluationEntry';

const echoEvaluationEntry = createStoredEntry(echoEvaluationDefinition);

/**
 * Echo Evaluation's state, remembered across reloads and shared with other tabs (spec §12). Listed tables that no
 * longer exist are left out silently; the stored copy loses them at the next change, keeping their targets.
 */
export function useRememberedEchoEvaluation(
  exists: (name: string) => boolean,
): [EchoEvaluationState, (change: Partial<EchoEvaluationState>) => void] {
  const [stored, save] = useStoredEntry(echoEvaluationEntry);
  const state = useMemo(() => withoutVanishedTables(stored, exists), [stored, exists]);
  return [state, (change) => save({ ...state, ...change })];
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
