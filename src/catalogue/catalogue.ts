import { isSubstatType, type SubstatType } from '../core/gameData';
import catalogueFile from './builtInWeightTables.json';

/** The longest name a Substat Weight Table may have. */
export const MAX_TABLE_NAME_LENGTH = 40;

/** A Substat Weight Table as data: its name and weights. A Substat type it doesn't list has a weight of 0. */
export interface WeightTableData {
  readonly name: string;
  readonly weights: Readonly<Partial<Record<SubstatType, number>>>;
}

const TABLE_PROPERTIES = new Set(['name', 'weights']);

/** A plain object (not null, not an array): for reading untrusted JSON. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A weight a table may have: a finite number of 0 or more. */
export const isWeight = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** What can be wrong with a table's name. */
export type NameProblem = 'empty' | 'tooLong';

/** The problem with a table's name, or null: it must not be blank, and at most 40 characters. */
export function nameProblem(name: string): NameProblem | null {
  if (name.trim() === '') return 'empty';
  if (name.length > MAX_TABLE_NAME_LENGTH) return 'tooLong';
  return null;
}

/** A problem with one entry of a table's weights read from untrusted data. */
export interface WeightProblem {
  readonly type: string;
  readonly problem: 'unknownType' | 'notAWeight';
}

/**
 * A table's weights read from untrusted data: those that are fine, and a problem for each entry that isn't (an unknown
 * Substat type, or a weight that isn't a finite number of 0 or more). Null when the weights aren't an object.
 */
export function checkWeights(weights: unknown): {
  readonly weights: Partial<Record<SubstatType, number>>;
  readonly problems: readonly WeightProblem[];
} | null {
  if (!isRecord(weights)) return null;
  const read: Partial<Record<SubstatType, number>> = {};
  const problems: WeightProblem[] = [];
  for (const [type, weight] of Object.entries(weights)) {
    if (!isSubstatType(type)) problems.push({ type, problem: 'unknownType' });
    else if (!isWeight(weight)) problems.push({ type, problem: 'notAWeight' });
    else read[type] = weight;
  }
  return { weights: read, problems };
}

/** Table names are the same when they differ only in case. */
export const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The table of that exact name, or undefined. */
export const findTable = (tables: readonly WeightTableData[], name: string) =>
  tables.find((table) => table.name === name);

/** Every problem with a catalogue file's contents (spec §4); an empty list means it may ship. */
export function catalogueProblems(catalogue: unknown): string[] {
  if (!Array.isArray(catalogue)) return ['The catalogue is not an array.'];
  if (catalogue.length === 0) return ['The catalogue is empty.'];

  const problems: string[] = [];
  const namesSeen = new Set<string>();
  catalogue.forEach((table: unknown, index) => {
    const position = `Table ${index + 1}`;
    if (!isRecord(table)) {
      problems.push(`${position} is not an object.`);
      return;
    }
    const { name, weights } = table;
    const label = typeof name === 'string' && name.trim() !== '' ? `'${name}'` : position;

    if (typeof name !== 'string') problems.push(`${position} has no name.`);
    else {
      const badName = nameProblem(name);
      if (badName === 'empty') problems.push(`${position} has an empty name.`);
      else if (badName === 'tooLong')
        problems.push(`${label} has a name longer than ${MAX_TABLE_NAME_LENGTH} characters.`);
      else if (namesSeen.has(name.toLowerCase()))
        problems.push(`${label} has the same name as another table, ignoring case.`);
      namesSeen.add(name.toLowerCase());
    }

    for (const property of Object.keys(table)) {
      if (!TABLE_PROPERTIES.has(property))
        problems.push(`${label} has an unknown property '${property}'.`);
    }

    const checked = checkWeights(weights);
    if (!checked) {
      problems.push(`${label} has no weights.`);
      return;
    }
    for (const { type, problem } of checked.problems)
      problems.push(
        problem === 'unknownType'
          ? `${label} has an unknown Substat type '${type}'.`
          : `${label} has a ${type} weight that is not a number of 0 or more.`,
      );
  });
  return problems;
}

/** The Built-in Substat Weight Tables, sorted alphabetically as every picker lists them. File order means nothing. */
export const BUILT_IN_TABLES: readonly WeightTableData[] = Object.freeze(
  (catalogueFile as WeightTableData[])
    .map((table) =>
      Object.freeze({ name: table.name, weights: Object.freeze({ ...table.weights }) }),
    )
    .sort((a, b) => a.name.localeCompare(b.name)),
);
