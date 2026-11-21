import { MAX_TUNE_STAGE, type SubstatType } from './gameData';

/**
 * One condition checked when an Echo reaches a Tune Stage. Any rule is accepted; one that can never pass discards
 * every Echo at its Tune Stage.
 */
export type UpgradeRule =
  /** At least `count` of the listed Substat types are on the Echo; a type listed twice counts twice. */
  | {
      readonly kind: 'substatCount';
      readonly count: number;
      readonly substatTypes: readonly SubstatType[];
    }
  /** The Substat type is on the Echo with a value of at least `minValue`. */
  | { readonly kind: 'substatRoll'; readonly substatType: SubstatType; readonly minValue: number }
  /** The Echo Score is at least `minEchoScore`. */
  | { readonly kind: 'echoScore'; readonly minEchoScore: number }
  /** The Target Chance for `targetScore` is at least `minChancePercent`, from 0 to 100. */
  | {
      readonly kind: 'targetChance';
      readonly minChancePercent: number;
      readonly targetScore: number;
    };

/** Builds the four kinds of Upgrade Rule. */
export const UpgradeRule = {
  substatCount: (count: number, ...substatTypes: SubstatType[]): UpgradeRule => ({
    kind: 'substatCount',
    count,
    substatTypes,
  }),
  substatRoll: (substatType: SubstatType, minValue: number): UpgradeRule => ({
    kind: 'substatRoll',
    substatType,
    minValue,
  }),
  echoScore: (minEchoScore: number): UpgradeRule => ({ kind: 'echoScore', minEchoScore }),
  targetChance: (minChancePercent: number, targetScore: number): UpgradeRule => ({
    kind: 'targetChance',
    minChancePercent,
    targetScore,
  }),
};

/** Upgrade Rules at one Tune Stage that must all pass; it always has at least one. */
export interface RuleGroup {
  readonly tuneStage: number;
  readonly rules: readonly UpgradeRule[];
}

/**
 * An Upgrade Strategy: an Echo passes a Tune Stage when every rule of any one of its Rule Groups passes, and a Tune
 * Stage without Rule Groups lets every Echo through. It is plain data, so it can be posted to a worker.
 */
export interface UpgradeStrategy {
  readonly ruleGroups: readonly RuleGroup[];
}

/** Builds an Upgrade Strategy, rejecting a Rule Group without rules or at a Tune Stage outside 1 to 5. */
export function upgradeStrategy(ruleGroups: readonly RuleGroup[]): UpgradeStrategy {
  for (const group of ruleGroups) validateRuleGroup(group);
  return { ruleGroups: ruleGroups.map((group) => ({ ...group, rules: [...group.rules] })) };
}

function validateRuleGroup({ tuneStage, rules }: RuleGroup): void {
  if (!Number.isInteger(tuneStage) || tuneStage < 1 || tuneStage > MAX_TUNE_STAGE)
    throw new RangeError(
      `A Rule Group's Tune Stage must be from 1 to ${MAX_TUNE_STAGE}, not ${tuneStage}.`,
    );
  if (rules.length === 0) throw new Error('A Rule Group needs at least one Upgrade Rule.');
}

/** The Rule Groups of each Tune Stage, indexed by Tune Stage (index 0 is empty), validated. */
export function ruleGroupsByStage(strategy: UpgradeStrategy): (readonly UpgradeRule[])[][] {
  const byStage: (readonly UpgradeRule[])[][] = Array.from(
    { length: MAX_TUNE_STAGE + 1 },
    () => [],
  );
  for (const group of strategy.ruleGroups) {
    validateRuleGroup(group);
    byStage[group.tuneStage]!.push(group.rules);
  }
  return byStage;
}
