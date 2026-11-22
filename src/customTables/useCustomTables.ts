import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { WeightTableData } from '../catalogue/catalogue';
import { createStoredEntry, type StoredEntry } from '../storage/storedEntry';
import {
  customTablesDefinition,
  type RenamedTable,
  type SalvagedTables,
} from './customTablesEntry';

interface Loaded {
  entry: StoredEntry<readonly WeightTableData[]>;
  tables: readonly WeightTableData[];
  salvaged: SalvagedTables | null;
}

/** Reads the entry as on app load, noting what salvage dropped or renamed. Writes nothing back. */
function loadCustomTables(builtInTables: readonly WeightTableData[]): Loaded {
  const heard: { salvaged: SalvagedTables | null; loading: boolean } = {
    salvaged: null,
    loading: true,
  };
  const entry = createStoredEntry(
    customTablesDefinition(
      builtInTables.map((table) => table.name),
      (salvaged) => {
        // Another tab's change is read quietly: that tab has told its player already.
        if (heard.loading) heard.salvaged = salvaged;
      },
    ),
  );
  const tables = entry.load();
  heard.loading = false;
  return { entry, tables, salvaged: heard.salvaged };
}

export interface CustomTables {
  /** Every saved Custom table. */
  readonly tables: readonly WeightTableData[];
  /** Replaces the saved tables: after a table is saved, renamed or deleted. */
  readonly save: (tables: readonly WeightTableData[]) => void;
  /** What the load salvaged, for the one-time notices; null when everything was read as stored. */
  readonly salvaged: SalvagedTables | null;
  /**
   * False until what the load salvaged is written back and renames are followed: render the parts that use the
   * tables only once it is true, so they read their remembered names repaired.
   */
  readonly ready: boolean;
}

/**
 * The player's Custom Substat Weight Tables, remembered across reloads and shared with other tabs (spec §12). Call it
 * once, above every part that uses the tables. What salvage dropped or renamed is written back before the first paint,
 * so the player hears of it once only; `followRenames` carries what other parts remember under a renamed table's old
 * name to its new one.
 */
export function useCustomTables(
  builtInTables: readonly WeightTableData[],
  followRenames: (renamed: readonly RenamedTable[]) => void = () => {},
): CustomTables {
  const [loaded] = useState(() => loadCustomTables(builtInTables));
  const [tables, setTables] = useState(loaded.tables);
  const [ready, setReady] = useState(loaded.salvaged === null);
  // Written back once, even when StrictMode runs the effect twice.
  const writtenBack = useRef(false);

  useLayoutEffect(() => {
    if (writtenBack.current || !loaded.salvaged) return;
    writtenBack.current = true;
    loaded.entry.save(loaded.tables);
    if (loaded.salvaged.renamed.length) followRenames(loaded.salvaged.renamed);
    setReady(true);
  }, [loaded, followRenames]);

  useEffect(() => loaded.entry.subscribe(setTables), [loaded.entry]);

  const save = useCallback(
    (next: readonly WeightTableData[]) => {
      setTables(next);
      loaded.entry.save(next);
    },
    [loaded.entry],
  );

  return { tables, save, salvaged: loaded.salvaged, ready };
}
