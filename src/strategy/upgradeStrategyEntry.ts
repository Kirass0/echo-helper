// The Upgrade Strategy entry (spec §12): the selected table, Strategy A exactly as held and, while comparing,
// Strategy B; and how a stored copy is salvaged.
import { isRecord } from '../catalogue/catalogue';
import { isSubstatType, MAX_TUNE_STAGE, possibleRolls } from '../core/gameData';
import type { EntryDefinition } from '../storage/storedEntry';
import { formatNonNegativeNumber } from '../ui/nonNegativeNumber';
import { loadExample } from './examples';
import {
  emptyStrategy,
  newRule,
  RULE_KIND_NAMES,
  SUBSTAT_COUNTS,
  type RuleDraft,
  type RuleKind,
  type StageDraft,
  type StrategyDraft,
} from './strategyDraft';

export interface UpgradeStrategyState {
  /** The selected table's name; null, or a table that no longer exists, means no table. */
  readonly table: string | null;
  /** Strategy A, the only one unless comparing, unfinished rules included. */
  readonly a: StrategyDraft;
  /** Strategy B while comparing; null otherwise. */
  readonly b: StrategyDraft | null;
}

/** The `localStorage` key of the Upgrade Strategy entry. */
export const UPGRADE_STRATEGY_KEY = 'echo-helper.upgrade-strategy';

const RULE_KINDS: ReadonlySet<unknown> = new Set(Object.keys(RULE_KIND_NAMES));

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/**
 * A number field's text, kept as held when it is a number, an invalid one (below 0, or a chance over 100) included;
 * text that isn't a number at all is cleared (spec §12).
 */
function salvageText(stored: unknown): string {
  if (typeof stored === 'number') {
    if (!Number.isFinite(stored)) return '';
    return stored >= 0 ? formatNonNegativeNumber(stored) : String(stored);
  }
  if (typeof stored !== 'string') return '';
  const trimmed = stored.trim();
  return trimmed !== '' && Number.isFinite(Number(trimmed)) ? stored : '';
}

/**
 * A stored rule with a new id, keeping the fields of all four kinds, each salvaged on its own (spec §12): an unknown
 * Substat is removed, which may leave the rule unfinished; a field that isn't a number is cleared; a select holding
 * no option it has (the kind, the count, a value the Substat never rolls) starts as in a new rule. What isn't a rule
 * at all is dropped.
 */
function salvageRule(stored: unknown): RuleDraft | null {
  if (!isRecord(stored)) return null;
  const fresh = newRule();
  const { count, substatType: type, minValue } = stored;
  const substatType = isSubstatType(type) ? type : null;
  const rolls = substatType ? possibleRolls(substatType).map((roll) => roll.value) : [];
  return {
    ...fresh,
    kind: RULE_KINDS.has(stored.kind) ? (stored.kind as RuleKind) : fresh.kind,
    count: SUBSTAT_COUNTS.includes(count as number) ? (count as number) : fresh.count,
    substatTypes: [...new Set(asArray(stored.substatTypes).filter(isSubstatType))],
    substatType,
    minValue: rolls.includes(minValue as number) ? (minValue as number) : (rolls[0] ?? 0),
    echoScoreText: salvageText(stored.echoScoreText),
    chanceText: salvageText(stored.chanceText),
    targetScoreText: salvageText(stored.targetScoreText),
  };
}

/** A Tune Stage's Rule Groups: what isn't a rule goes, and so does a Rule Group left without rules. */
function salvageStage(stored: unknown): StageDraft {
  return asArray(stored)
    .map((ruleGroup) => asArray(ruleGroup).flatMap((rule) => salvageRule(rule) ?? []))
    .filter((rules) => rules.length > 0);
}

/** A stored strategy's five Tune Stages, salvaged; null when it isn't a strategy at all. */
function salvageStrategy(stored: unknown): StrategyDraft | null {
  if (!isRecord(stored) || !Array.isArray(stored.stages)) return null;
  const stages = stored.stages as readonly unknown[];
  return { stages: Array.from({ length: MAX_TUNE_STAGE }, (_, i) => salvageStage(stages[i])) };
}

export const upgradeStrategyDefinition: EntryDefinition<UpgradeStrategyState> = {
  key: UPGRADE_STRATEGY_KEY,
  version: 1,
  // Only the first visit, with nothing stored, holds "Crit first" (spec §6); an entry that can't be read is reset to
  // an empty strategy, as one that can't be read as a strategy is (spec §12).
  nothingStored: () => ({ table: null, a: loadExample('Crit first').draft, b: null }),
  fallback: () => ({ table: null, a: emptyStrategy(), b: null }),
  validate: (data) => {
    if (!isRecord(data)) throw new Error('not an Upgrade Strategy');
    return {
      table: typeof data.table === 'string' && data.table !== '' ? data.table : null,
      a: salvageStrategy(data.a) ?? emptyStrategy(),
      // A bad Strategy B is dropped, and compare mode is left.
      b: salvageStrategy(data.b),
    };
  },
};
