import { MAX_TABLE_NAME_LENGTH, sameName, type WeightTableData } from '../catalogue/catalogue';
import { SUBSTAT_TYPES, type SubstatType } from '../core/gameData';
import {
  formatNonNegativeNumber,
  INVALID_NUMBER_MESSAGE,
  parseNonNegativeNumber,
} from '../ui/nonNegativeNumber';

/** A Custom Substat Weight Table being made or edited: what is typed in its name and 13 weight fields. */
export interface TableDraft {
  readonly name: string;
  readonly weights: Readonly<Record<SubstatType, string>>;
}

/** A draft checked against the rules for a table (spec §5): the table to save, or the problem at each field. */
export interface CheckedDraft {
  /** The table to save, or null while any field is rejected. */
  readonly table: WeightTableData | null;
  readonly nameError: string | null;
  readonly weightErrors: Readonly<Partial<Record<SubstatType, string>>>;
}

/** The first of `base + suffix(1)`, `base + suffix(2)`, … no table has, kept within the name length limit. */
function firstFreeName(
  base: string,
  suffix: (n: number) => string,
  takenNames: readonly string[],
): string {
  for (let n = 1; ; n++) {
    const end = suffix(n);
    const name = base.slice(0, MAX_TABLE_NAME_LENGTH - end.length).trimEnd() + end;
    if (!takenNames.some((taken) => sameName(taken, name))) return name;
  }
}

/** "X (copy)", then "X (copy 2)" and so on. */
export const defaultCopyName = (name: string, takenNames: readonly string[]) =>
  firstFreeName(name, (n) => (n === 1 ? ' (copy)' : ` (copy ${n})`), takenNames);

/** "X (custom)", then "X (custom 2)" and so on: for a stored table whose name is taken. */
export const defaultCustomName = (name: string, takenNames: readonly string[]) =>
  firstFreeName(name, (n) => (n === 1 ? ' (custom)' : ` (custom ${n})`), takenNames);

/** "New Weight Table", then "New Weight Table 2" and so on. */
export const defaultNewName = (takenNames: readonly string[]) =>
  firstFreeName('New Weight Table', (n) => (n === 1 ? '' : ` ${n}`), takenNames);

const draftWeights = (table: WeightTableData) =>
  Object.fromEntries(
    SUBSTAT_TYPES.map((type) => [type, formatNonNegativeNumber(table.weights[type] ?? 0)]),
  ) as Record<SubstatType, string>;

/** A draft of a table as it is, for editing it. */
export const editDraft = (table: WeightTableData): TableDraft => ({
  name: table.name,
  weights: draftWeights(table),
});

/** A draft of a new, independent copy of a table. */
export const copyDraft = (table: WeightTableData, takenNames: readonly string[]): TableDraft => ({
  name: defaultCopyName(table.name, takenNames),
  weights: draftWeights(table),
});

/** A draft of a new blank table: every weight 0. */
export const blankDraft = (takenNames: readonly string[]): TableDraft => ({
  name: defaultNewName(takenNames),
  weights: draftWeights({ name: '', weights: {} }),
});

/**
 * Checks a draft. The name is trimmed, not empty and unique among all tables ignoring case, except against the table
 * being edited (`editing`, null for a new table). Each weight is a number of 0 or more; empty means 0.
 */
export function checkDraft(
  draft: TableDraft,
  allNames: readonly string[],
  editing: string | null,
): CheckedDraft {
  const name = draft.name.trim();
  const nameError =
    name === ''
      ? 'Enter a name.'
      : allNames.some((other) => other !== editing && sameName(other, name))
        ? `'${name}' is already taken.`
        : null;

  const weights: Partial<Record<SubstatType, number>> = {};
  const weightErrors: Partial<Record<SubstatType, string>> = {};
  for (const type of SUBSTAT_TYPES) {
    const { value, invalid } = parseNonNegativeNumber(draft.weights[type]);
    if (invalid) weightErrors[type] = INVALID_NUMBER_MESSAGE;
    else weights[type] = value ?? 0;
  }

  const valid = nameError === null && Object.keys(weightErrors).length === 0;
  return { table: valid ? { name, weights } : null, nameError, weightErrors };
}
