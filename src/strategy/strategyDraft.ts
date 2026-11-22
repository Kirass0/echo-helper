// An Upgrade Strategy as the player holds it while editing (spec §8): every Tune Stage's boxes of rules, unfinished
// rules included. Each rule keeps the fields of all four kinds, so switching kind loses nothing.
import { MAX_TUNE_STAGE, possibleRolls, type SubstatType } from '../core/gameData';
import type { RuleGroup, UpgradeRule, UpgradeStrategy } from '../core/upgradeStrategy';
import { INVALID_NUMBER_MESSAGE, parseNonNegativeNumber } from '../ui/nonNegativeNumber';

export type RuleKind = UpgradeRule['kind'];

/** One rule as edited: its kind, and the fields of every kind. Number fields are the text typed. */
export interface RuleDraft {
  /** Tells rules apart while they are edited, added and removed; it means nothing else. */
  readonly id: string;
  readonly kind: RuleKind;
  /** Substat Count: at least `count` (1–5) of `substatTypes`. */
  readonly count: number;
  readonly substatTypes: readonly SubstatType[];
  /** Substat Roll: `substatType` at least `minValue`, one of its possible values. */
  readonly substatType: SubstatType;
  readonly minValue: number;
  /** Echo Score: at least this. */
  readonly echoScoreText: string;
  /** Target Chance: at least `chanceText`% chance to reach a Target Score of `targetScoreText`. */
  readonly chanceText: string;
  readonly targetScoreText: string;
}

/** A Tune Stage's boxes, each a Rule Group's rules: rules in a box are joined by "and", boxes by "or". */
export type StageDraft = readonly (readonly RuleDraft[])[];

/** One Upgrade Strategy as edited: its five Tune Stages, 1/5 first. */
export interface StrategyDraft {
  readonly stages: readonly StageDraft[];
}

export const emptyStrategy = (): StrategyDraft => ({
  stages: Array.from({ length: MAX_TUNE_STAGE }, () => []),
});

let lastId = 0;

/** The lowest value a Substat type can roll. */
const lowestValue = (type: SubstatType) => possibleRolls(type)[0]?.value ?? 0;

/** A new rule: an unfinished Substat Count rule, at least 1 of no Substats yet. */
export function newRule(): RuleDraft {
  return {
    id: `rule-${++lastId}`,
    kind: 'substatCount',
    count: 1,
    substatTypes: [],
    substatType: 'Critical_Rate',
    minValue: lowestValue('Critical_Rate'),
    echoScoreText: '',
    chanceText: '',
    targetScoreText: '',
  };
}

/** Why a rule is unfinished: the field to blame, its message, and whether it holds an invalid number or nothing. */
export interface RuleProblem {
  readonly field: 'substatTypes' | 'echoScore' | 'chance' | 'targetScore';
  readonly message: string;
  readonly invalid: boolean;
}

export const INVALID_CHANCE_MESSAGE = 'Enter a chance from 0 to 100.';

/** What is wrong with a rule's fields for its kind, or null when it is finished. Impossible rules are fine. */
export function ruleProblem(rule: RuleDraft): RuleProblem | null {
  switch (rule.kind) {
    case 'substatCount':
      return rule.substatTypes.length
        ? null
        : { field: 'substatTypes', message: 'Pick at least one Substat.', invalid: false };
    case 'substatRoll':
      return null;
    case 'echoScore':
      return scoreProblem(rule.echoScoreText, 'echoScore', 'Enter an Echo Score.');
    case 'targetChance':
      return (
        chanceProblem(rule.chanceText) ??
        scoreProblem(rule.targetScoreText, 'targetScore', 'Enter a Target Score.')
      );
  }
}

function scoreProblem(
  text: string,
  field: RuleProblem['field'],
  missing: string,
): RuleProblem | null {
  const { value, invalid } = parseNonNegativeNumber(text);
  if (invalid) return { field, message: INVALID_NUMBER_MESSAGE, invalid: true };
  return value === null ? { field, message: missing, invalid: false } : null;
}

function chanceProblem(text: string): RuleProblem | null {
  if (text.trim() === '')
    return { field: 'chance', message: 'Enter a chance in %.', invalid: false };
  const { value } = parseNonNegativeNumber(text);
  return value === null || value > 100
    ? { field: 'chance', message: INVALID_CHANCE_MESSAGE, invalid: true }
    : null;
}

/** The Upgrade Rule a finished rule stands for. */
function upgradeRule(rule: RuleDraft): UpgradeRule {
  const number = (text: string) => parseNonNegativeNumber(text).value ?? 0;
  switch (rule.kind) {
    case 'substatCount':
      return { kind: 'substatCount', count: rule.count, substatTypes: [...rule.substatTypes] };
    case 'substatRoll':
      return { kind: 'substatRoll', substatType: rule.substatType, minValue: rule.minValue };
    case 'echoScore':
      return { kind: 'echoScore', minEchoScore: number(rule.echoScoreText) };
    case 'targetChance':
      return {
        kind: 'targetChance',
        minChancePercent: number(rule.chanceText),
        targetScore: number(rule.targetScoreText),
      };
  }
}

/**
 * The Upgrade Strategy to calculate, one Rule Group per box; or, while any rule is unfinished, the first Tune Stage
 * holding one.
 */
export function finishedStrategy(
  draft: StrategyDraft,
): { readonly strategy: UpgradeStrategy } | { readonly unfinishedStage: number } {
  const ruleGroups: RuleGroup[] = [];
  for (const [index, boxes] of draft.stages.entries()) {
    const tuneStage = index + 1;
    for (const box of boxes) {
      if (box.some((rule) => ruleProblem(rule) !== null)) return { unfinishedStage: tuneStage };
      ruleGroups.push({ tuneStage, rules: box.map(upgradeRule) });
    }
  }
  return { strategy: { ruleGroups } };
}

function withStage(
  draft: StrategyDraft,
  tuneStage: number,
  change: (boxes: StageDraft) => StageDraft,
): StrategyDraft {
  return {
    stages: draft.stages.map((boxes, i) => (i === tuneStage - 1 ? change(boxes) : boxes)),
  };
}

/** "+ or" and "+ add a rule": a new box at the Tune Stage, holding a new rule. */
export const addBox = (draft: StrategyDraft, tuneStage: number) =>
  withStage(draft, tuneStage, (boxes) => [...boxes, [newRule()]]);

/** "+ and": a new rule at the end of a box. */
export const addRule = (draft: StrategyDraft, tuneStage: number, box: number) =>
  withStage(draft, tuneStage, (boxes) =>
    boxes.map((rules, i) => (i === box ? [...rules, newRule()] : rules)),
  );

/** Removes a rule; a box left without rules goes too. */
export const removeRule = (draft: StrategyDraft, tuneStage: number, box: number, rule: number) =>
  withStage(draft, tuneStage, (boxes) =>
    boxes
      .map((rules, i) => (i === box ? rules.filter((_, j) => j !== rule) : rules))
      .filter((rules) => rules.length > 0),
  );

/**
 * Changes a rule's fields. A Substat Roll rule given another Substat, and no value, starts at that Substat's lowest
 * value.
 */
export const updateRule = (
  draft: StrategyDraft,
  tuneStage: number,
  box: number,
  rule: number,
  change: Partial<Omit<RuleDraft, 'id'>>,
) =>
  withStage(draft, tuneStage, (boxes) =>
    boxes.map((rules, i) =>
      i !== box
        ? rules
        : rules.map((old, j) => {
            if (j !== rule) return old;
            const changed = { ...old, ...change };
            if (change.substatType && change.minValue === undefined)
              return { ...changed, minValue: lowestValue(change.substatType) };
            return changed;
          }),
    ),
  );
