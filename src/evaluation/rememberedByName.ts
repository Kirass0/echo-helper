import { withoutRows } from './echoEvaluationEntry';
import type { TargetTexts } from './WeightTableList';

/** What Echo Evaluation remembers by table name. */
export interface RememberedByName {
  readonly listed: readonly string[];
  readonly focused: string | null;
  readonly targets: Readonly<Record<string, TargetTexts>>;
}

/** Carries everything remembered under a renamed table's old name over to its new one. */
export function renameTable(
  remembered: RememberedByName,
  oldName: string,
  newName: string,
): RememberedByName {
  const { [oldName]: moved, ...otherTargets } = remembered.targets;
  return {
    listed: remembered.listed.map((name) => (name === oldName ? newName : name)),
    focused: remembered.focused === oldName ? newName : remembered.focused,
    targets: moved ? { ...otherTargets, [newName]: moved } : remembered.targets,
  };
}

/**
 * Forgets a deleted table: its targets go, and its rows go as for a vanished table (spec §12), focus passing to the
 * next row that is left, or the row above.
 */
export function forgetTable(remembered: RememberedByName, deleted: string): RememberedByName {
  const targets = Object.fromEntries(
    Object.entries(remembered.targets).filter(([name]) => name !== deleted),
  );
  return { ...withoutRows(remembered, (name) => name !== deleted), targets };
}
