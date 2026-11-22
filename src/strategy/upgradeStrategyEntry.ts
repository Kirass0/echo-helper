// The Upgrade Strategy entry (spec §12): the selected table, Strategy A exactly as held and, while comparing,
// Strategy B; and how a stored copy is salvaged.
import { isRecord } from '../catalogue/catalogue';
import { isSubstatType, MAX_TUNE_STAGE, possibleRolls } from '../core/gameData';
import type { EntryDefinition } from '../storage/storedEntry';
import { formatNonNegativeNumber, parseNonNegativeNumber } from '../ui/nonNegativeNumber';
import { loadExample } from './examples';
import {
  emptyStrategy,
  newRule,
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

const RULE_KINDS: ReadonlySet<unknown> = new Set<RuleKind>([
  'substatCount',
  'substatRoll',
  'echoScore',
  'targetChance',
]);

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/** A number field's text; one that isn't text of a number of 0 or more is cleared. */
function salvageText(stored: unknown): string {
  if (typeof stored === 'number')
    return Number.isFinite(stored) && stored >= 0 ? formatNonNegativeNumber(stored) : '';
  return typeof stored === 'string' && !parseNonNegativeNumber(stored).invalid ? stored : '';
}

/**
 * A stored rule with a new id, keeping the fields of all four kinds. An unknown Substat is removed (which may leave the
 * rule unfinished); a field that isn't a number is cleared, or for the selects starts as in a new rule. A rule of no
 * known kind is dropped.
 */
function salvageRule(stored: unknown): RuleDraft | null {
  if (!isRecord(stored) || !RULE_KINDS.has(stored.kind)) return null;
  const fresh = newRule();
  const { count, substatType: type, minValue } = stored;
  const substatType = isSubstatType(type) ? type : fresh.substatType;
  const rolls = possibleRolls(substatType).map((roll) => roll.value);
  return {
    ...fresh,
    kind: stored.kind as RuleKind,
    count:
      Number.isInteger(count) && (count as number) >= 1 && (count as number) <= MAX_TUNE_STAGE
        ? (count as number)
        : fresh.count,
    substatTypes: [...new Set(asArray(stored.substatTypes).filter(isSubstatType))],
    substatType,
    minValue: rolls.includes(minValue as number) ? (minValue as number) : (rolls[0] ?? 0),
    echoScoreText: salvageText(stored.echoScoreText),
    chanceText: salvageText(stored.chanceText),
    targetScoreText: salvageText(stored.targetScoreText),
  };
}

/** A stage's boxes: rules that can't be read go, and so does a box left without rules. */
function salvageStage(stored: unknown): StageDraft {
  return asArray(stored)
    .map((box) => asArray(box).flatMap((rule) => salvageRule(rule) ?? []))
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
  // Only when nothing is stored: the first visit holds "Crit first", with no table (spec §6).
  fallback: () => ({ table: null, a: loadExample('Crit first').draft, b: null }),
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
