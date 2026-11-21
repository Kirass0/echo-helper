import { useMemo } from 'react';
import { createStoredEntry } from '../storage/storedEntry';
import { useStoredEntry } from '../storage/useStoredEntry';
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
