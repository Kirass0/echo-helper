import { useEffect, useState } from 'react';
import type { RenamedTable } from '../customTables/customTablesEntry';
import { createStoredEntry } from '../storage/storedEntry';
import { useStoredEntry, type StoredEntryChange } from '../storage/useStoredEntry';
import { upgradeStrategyDefinition, type UpgradeStrategyState } from './upgradeStrategyEntry';

const upgradeStrategyEntry = createStoredEntry(upgradeStrategyDefinition);

export interface RememberedUpgradeStrategy {
  readonly state: UpgradeStrategyState;
  readonly update: (change: StoredEntryChange<UpgradeStrategyState>) => void;
  /** Counts the changes taken on from other tabs: Upgrade Strategy opens again, as on load, at each. */
  readonly otherTabChanges: number;
}

/**
 * Upgrade Strategy's table and strategies, remembered across reloads and shared with other tabs (spec §12). A change
 * given as a function builds on the newest state, so several changes before the next render all count.
 */
export function useRememberedUpgradeStrategy(): RememberedUpgradeStrategy {
  const [state, update] = useStoredEntry(upgradeStrategyEntry);
  const [otherTabChanges, setOtherTabChanges] = useState(0);
  useEffect(() => upgradeStrategyEntry.subscribe(() => setOtherTabChanges((n) => n + 1)), []);
  return { state, update, otherTabChanges };
}

/** The selected table's new name, if it was renamed. */
export const followRenames = (
  state: UpgradeStrategyState,
  renamed: readonly RenamedTable[],
): UpgradeStrategyState => {
  const to = renamed.find(({ from }) => from === state.table)?.to;
  return to === undefined ? state : { ...state, table: to };
};
