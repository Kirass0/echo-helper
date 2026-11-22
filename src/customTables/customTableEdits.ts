// What the weights dialog's Save and Delete do to the Custom tables, the same from either tab: the tables change, and a
// rename or deletion is published on the table events, where every tab (the one it was made in included) hears it
// and carries along, or forgets, what it remembers under the table's name.
import type { WeightTableData } from '../catalogue/catalogue';
import type { TableEvents } from './tableEvents';

export interface CustomTableEdits {
  /** The saved Custom tables. */
  readonly customTables: readonly WeightTableData[];
  /** Called with all Custom tables after one is saved, renamed or deleted. */
  readonly onCustomTablesChange: (tables: readonly WeightTableData[]) => void;
  readonly tableEvents: TableEvents;
}

/** Saves a new table at the end (`editing` null), or the edited one in its place, publishing a rename. */
export function saveCustomTable(
  { customTables, onCustomTablesChange, tableEvents }: CustomTableEdits,
  editing: string | null,
  saved: WeightTableData,
): void {
  if (editing === null) {
    onCustomTablesChange([...customTables, saved]);
    return;
  }
  onCustomTablesChange(customTables.map((custom) => (custom.name === editing ? saved : custom)));
  if (saved.name !== editing)
    tableEvents.publish({ kind: 'renamed', from: editing, to: saved.name });
}

export function deleteCustomTable(
  { customTables, onCustomTablesChange, tableEvents }: CustomTableEdits,
  name: string,
): void {
  onCustomTablesChange(customTables.filter((custom) => custom.name !== name));
  tableEvents.publish({ kind: 'deleted', name });
}
