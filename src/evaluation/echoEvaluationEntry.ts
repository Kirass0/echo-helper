// The Echo Evaluation entry (spec §12): what the tab holds, and how a stored copy is salvaged.
import type { SubstatEntry } from '../calculation/protocol';
import { isRecord } from '../catalogue/catalogue';
import { isSubstatType, MAX_TUNE_STAGE, possibleRolls } from '../core/gameData';
import type { EntryDefinition } from '../storage/storedEntry';
import { parseNonNegativeNumber } from '../ui/nonNegativeNumber';
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

const isName = (value: unknown): value is string => typeof value === 'string' && value !== '';
const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/** A slot with an unknown type, a value outside its set, or a type already on the Echo is emptied. */
function salvageSubstats(stored: unknown): SubstatEntry[] {
  const substats: SubstatEntry[] = [];
  for (const slot of asArray(stored)) {
    if (!isRecord(slot)) continue;
    const { type, value } = slot;
    if (!isSubstatType(type)) continue;
    if (!possibleRolls(type).some((roll) => roll.value === value)) continue;
    if (substats.some((substat) => substat.type === type)) continue;
    substats.push({ type, value: value as number });
  }
  return substats.slice(0, MAX_TUNE_STAGE);
}

/** A target that isn't text of a valid target is cleared. */
const salvageTarget = (text: unknown) =>
  typeof text === 'string' && !parseNonNegativeNumber(text).invalid ? text : '';

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
 * Drops the rows whose table is not kept. A dropped table in focus passes focus to the next row that is left, or the
 * row above; with no rows left there is no focus.
 */
export function withoutRows<
  S extends { readonly listed: readonly string[]; readonly focused: string | null },
>(state: S, kept: (name: string) => boolean): S {
  if (state.listed.every(kept)) return state;
  const listed = state.listed.filter(kept);
  let focused = state.focused;
  if (focused !== null && !kept(focused)) {
    const at = state.listed.indexOf(focused);
    focused =
      state.listed.slice(at + 1).find(kept) ??
      state.listed.slice(0, Math.max(at, 0)).findLast(kept) ??
      null;
  }
  return { ...state, listed, focused };
}

/** Drops listed tables that no longer exist (a built-in gone with a deploy), silently, as `withoutRows`. Targets are kept. */
export const withoutVanishedTables = (
  state: EchoEvaluationState,
  exists: (name: string) => boolean,
): EchoEvaluationState => withoutRows(state, exists);
