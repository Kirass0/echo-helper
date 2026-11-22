// The Custom Weight Tables entry (spec §12): every saved Custom table, and how a stored copy is salvaged.
import {
  checkWeights,
  isRecord,
  nameProblem,
  sameName,
  type WeightTableData,
} from '../catalogue/catalogue';
import type { EntryDefinition } from '../storage/storedEntry';
import { defaultCustomName } from './tableDraft';

/** The `localStorage` key of the Custom Weight Tables entry. */
export const CUSTOM_TABLES_KEY = 'echo-helper.custom-tables';

/** A Custom table renamed on load because a new built-in took its name. */
export interface RenamedTable {
  readonly builtIn: string;
  readonly from: string;
  readonly to: string;
}

/** What salvaging a stored copy gave: the tables kept, how many couldn't be read, and which were renamed for a built-in. */
export interface SalvagedTables {
  readonly tables: readonly WeightTableData[];
  readonly lost: number;
  readonly renamed: readonly RenamedTable[];
}

/** The table, or null when it has a bad weight, an empty name or a name over 40 characters once trimmed. */
function readTable(stored: unknown): WeightTableData | null {
  if (!isRecord(stored) || typeof stored.name !== 'string') return null;
  const name = stored.name.trim();
  const checked = checkWeights(stored.weights);
  if (nameProblem(name) !== null || !checked || checked.problems.length > 0) return null;
  return { name, weights: checked.weights };
}

/**
 * Salvages stored Custom tables, a table at a time (spec §12). An unreadable table is dropped. A name a built-in has
 * (ignoring case) goes to the built-in, and the Custom table becomes "X (custom)", then "X (custom 2)"; a name an
 * earlier Custom table has is renamed the same way, quietly. Throws for data that isn't a list, so the entry resets.
 */
export function salvageCustomTables(
  data: unknown,
  builtInNames: readonly string[],
): SalvagedTables {
  if (!Array.isArray(data)) throw new Error('not a list of Custom tables');
  const readable = data.map(readTable).filter((table) => table !== null);
  // A new name avoids every name in sight, so it never takes one a later table holds.
  const taken = [...builtInNames, ...readable.map((table) => table.name)];
  const tables: WeightTableData[] = [];
  const renamed: RenamedTable[] = [];
  for (const table of readable) {
    const builtIn = builtInNames.find((name) => sameName(name, table.name));
    const duplicate = tables.some((kept) => sameName(kept.name, table.name));
    if (builtIn === undefined && !duplicate) {
      tables.push(table);
      continue;
    }
    const name = defaultCustomName(table.name, taken);
    taken.push(name);
    tables.push({ ...table, name });
    if (builtIn !== undefined) renamed.push({ builtIn, from: table.name, to: name });
  }
  return { tables, lost: data.length - readable.length, renamed };
}

/**
 * The entry, for a catalogue of built-ins. `onSalvaged` hears of each read that dropped or renamed something for a
 * built-in, so the app can tell the player once.
 */
export function customTablesDefinition(
  builtInNames: readonly string[],
  onSalvaged?: (salvaged: SalvagedTables) => void,
): EntryDefinition<readonly WeightTableData[]> {
  return {
    key: CUSTOM_TABLES_KEY,
    version: 1,
    fallback: () => [],
    validate: (data) => {
      const salvaged = salvageCustomTables(data, builtInNames);
      if (salvaged.lost > 0 || salvaged.renamed.length > 0) onSalvaged?.(salvaged);
      return salvaged.tables;
    },
  };
}

/** The one-time notices for what a load salvaged (wording per ticket 17): one per rename, then one for lost tables. */
export function salvageNotices(salvaged: SalvagedTables | null): string[] {
  if (!salvaged) return [];
  const notices = salvaged.renamed.map(
    ({ builtIn, to }) =>
      `A new built-in Substat Weight Table is called '${builtIn}', so your Custom table was renamed to '${to}'.`,
  );
  if (salvaged.lost === 1) notices.push("1 Custom Weight Table couldn't be read and was removed.");
  else if (salvaged.lost > 1)
    notices.push(`${salvaged.lost} Custom Weight Tables couldn't be read and were removed.`);
  return notices;
}
