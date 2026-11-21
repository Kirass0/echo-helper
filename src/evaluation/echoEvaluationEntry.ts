// The Echo Evaluation entry (spec §12): what the tab holds, and how a stored copy is salvaged.
import type { SubstatEntry } from '../calculation/protocol';
import { MAX_TUNE_STAGE, possibleRolls, SUBSTAT_TYPES, type SubstatType } from '../core/gameData';
import type { EntryDefinition } from '../storage/storedEntry';
import { parseTarget } from './targetScore';
import type { TargetTexts } from './WeightTableList';

export interface EchoEvaluationState {
  /** The Substats in slot order. */
  readonly substats: readonly SubstatEntry[];
  /** The listed tables' names, top to bottom. */
  readonly listed: readonly string[];
  readonly focused: string | null;
  /** What is typed in each table's target boxes, per table name, kept while the table is unlisted or gone. */
  readonly targets: Readonly<Record<string, TargetTexts>>;
}

/** The `localStorage` key of the Echo Evaluation entry. */
export const ECHO_EVALUATION_KEY = 'echo-helper.echo-evaluation';

const EMPTY: EchoEvaluationState = { substats: [], listed: [], focused: null, targets: {} };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isName = (value: unknown): value is string => typeof value === 'string' && value !== '';
const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/** A slot with an unknown type, a value outside its set, or a type already on the Echo is emptied. */
function salvageSubstats(stored: unknown): SubstatEntry[] {
  const substats: SubstatEntry[] = [];
  for (const slot of asArray(stored)) {
    if (!isRecord(slot)) continue;
    const { type, value } = slot;
    if (!SUBSTAT_TYPES.includes(type as SubstatType)) continue;
    const known = type as SubstatType;
    if (!possibleRolls(known).some((roll) => roll.value === value)) continue;
    if (substats.some((substat) => substat.type === known)) continue;
    substats.push({ type: known, value: value as number });
  }
  return substats.slice(0, MAX_TUNE_STAGE);
}

/** A target that isn't text of a valid target is cleared. */
const salvageTarget = (text: unknown) =>
  typeof text === 'string' && !parseTarget(text).invalid ? text : '';

function salvageTargets(stored: unknown): Record<string, TargetTexts> {
  if (!isRecord(stored)) return {};
  const targets: Record<string, TargetTexts> = {};
  for (const [name, texts] of Object.entries(stored)) {
    if (!isName(name) || !isRecord(texts)) continue;
    targets[name] = {
      targetText: salvageTarget(texts.targetText),
      erTargetText: salvageTarget(texts.erTargetText),
    };
  }
  return targets;
}

export const echoEvaluationDefinition: EntryDefinition<EchoEvaluationState> = {
  key: ECHO_EVALUATION_KEY,
  version: 1,
  fallback: () => EMPTY,
  validate: (data) => {
    if (!isRecord(data)) throw new Error('not an Echo Evaluation');
    const listed = [...new Set(asArray(data.listed).filter(isName))];
    const focused =
      isName(data.focused) && listed.includes(data.focused) ? data.focused : (listed[0] ?? null);
    return {
      substats: salvageSubstats(data.substats),
      listed,
      focused,
      targets: salvageTargets(data.targets),
    };
  },
};

/**
 * Drops listed tables that no longer exist (a built-in gone with a deploy), silently. A vanished table in focus passes
 * focus to the next row that is left, or the row above; with no rows left there is no focus. Targets are kept.
 */
export function withoutVanishedTables(
  state: EchoEvaluationState,
  exists: (name: string) => boolean,
): EchoEvaluationState {
  if (state.listed.every(exists)) return state;
  const listed = state.listed.filter(exists);
  let focused = state.focused;
  if (focused !== null && !exists(focused)) {
    const at = state.listed.indexOf(focused);
    focused =
      state.listed.slice(at + 1).find(exists) ??
      state.listed.slice(0, Math.max(at, 0)).findLast(exists) ??
      null;
  }
  return { ...state, listed, focused };
}
