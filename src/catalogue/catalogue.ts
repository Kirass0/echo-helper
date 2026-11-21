import { SUBSTAT_TYPES, type SubstatType } from '../core/gameData';
import catalogueFile from './builtInWeightTables.json';

/** The longest name a Substat Weight Table may have. */
export const MAX_TABLE_NAME_LENGTH = 40;

/** A Substat Weight Table as data: its name and weights. A Substat type it doesn't list has a weight of 0. */
export interface WeightTableData {
  readonly name: string;
  readonly weights: Readonly<Partial<Record<SubstatType, number>>>;
}

const TABLE_PROPERTIES = new Set(['name', 'weights']);
const KNOWN_TYPES = new Set<string>(SUBSTAT_TYPES);

/** A plain object (not null, not an array): for reading untrusted JSON. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A weight a table may have: a finite number of 0 or more. */
export const isWeight = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

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
    else if (name.trim() === '') problems.push(`${position} has an empty name.`);
    else if (name.length > MAX_TABLE_NAME_LENGTH)
      problems.push(`${label} has a name longer than ${MAX_TABLE_NAME_LENGTH} characters.`);
    else if (namesSeen.has(name.toLowerCase()))
      problems.push(`${label} has the same name as another table, ignoring case.`);
    if (typeof name === 'string') namesSeen.add(name.toLowerCase());

    for (const property of Object.keys(table)) {
      if (!TABLE_PROPERTIES.has(property))
        problems.push(`${label} has an unknown property '${property}'.`);
    }

    if (!isRecord(weights)) {
      problems.push(`${label} has no weights.`);
      return;
    }
    for (const [type, weight] of Object.entries(weights)) {
      if (!KNOWN_TYPES.has(type)) problems.push(`${label} has an unknown Substat type '${type}'.`);
      else if (!isWeight(weight))
        problems.push(`${label} has a ${type} weight that is not a number of 0 or more.`);
    }
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
