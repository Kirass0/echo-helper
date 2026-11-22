// The example strategies behind "Start from an example" (spec §8), defined as the ticket 08 prototype's `EXAMPLES`.
// Their Echo Score thresholds are written as "the Echo Score of a Top x% Echo for the selected Weight Table": loading
// one leaves those fields empty, and they are filled once that table's distribution has been worked out. From then on
// they are ordinary numbers.
import type { SubstatType } from '../core/gameData';
import { emptyStrategy, newRule, type RuleDraft, type StrategyDraft } from './strategyDraft';

/** A rule field holding a Top x% threshold. */
export type ThresholdField = 'echoScoreText' | 'targetScoreText';

/** A field of a loaded example's rule that waits for the Echo Score of a Top x% Echo. */
export interface PendingThreshold {
  readonly ruleId: string;
  readonly field: ThresholdField;
  /** The x of Top x%, in [0, 1]. */
  readonly topPercent: number;
}

/** A loaded example: its strategy, with its Top x% thresholds still empty, and what they wait for. */
export interface LoadedExample {
  readonly name: string;
  readonly draft: StrategyDraft;
  readonly thresholds: readonly PendingThreshold[];
  /** The distinct Top Percents the thresholds wait for: what to work out. */
  readonly topPercents: readonly number[];
}

const CRITS: readonly SubstatType[] = ['Critical_Rate', 'Critical_Damage'];

/** Builds one example's stages; `topScore(x)` stands for the Echo Score of a Top x% Echo in a field. */
interface Builder {
  rule(fields: Partial<Omit<RuleDraft, 'id'>>): RuleDraft;
  topScore(
    topPercent: number,
    field: ThresholdField,
    fields?: Partial<Omit<RuleDraft, 'id'>>,
  ): RuleDraft;
}

type Stages = (readonly (readonly RuleDraft[])[])[];

const EXAMPLES: readonly { readonly name: string; readonly stages: (b: Builder) => Stages }[] = [
  { name: 'Keep every Echo', stages: () => emptyStrategy().stages.map(() => []) },
  {
    name: 'Crit first',
    stages: (b) => [
      [],
      [[b.rule({ count: 1, substatTypes: CRITS })]],
      [],
      [[b.rule({ count: 2, substatTypes: CRITS })]],
      [],
    ],
  },
  {
    name: 'Double crit, or one great crit roll',
    stages: (b) => [
      [],
      [],
      [
        [b.rule({ count: 2, substatTypes: CRITS })],
        [b.rule({ kind: 'substatRoll', substatType: 'Critical_Rate', minValue: 9.3 })],
        [b.rule({ kind: 'substatRoll', substatType: 'Critical_Damage', minValue: 18.6 })],
      ],
      [],
      [[b.topScore(0.1, 'echoScoreText', { kind: 'echoScore' })]],
    ],
  },
  {
    name: 'Chance to reach a Top 5% Echo',
    stages: (b) => {
      const chance = (chanceText: string) => [
        [b.topScore(0.05, 'targetScoreText', { kind: 'targetChance', chanceText })],
      ];
      return [
        chance('5'),
        chance('8'),
        chance('12'),
        chance('20'),
        [[b.topScore(0.05, 'echoScoreText', { kind: 'echoScore' })]],
      ];
    },
  },
];

export const EXAMPLE_NAMES: readonly string[] = EXAMPLES.map(({ name }) => name);

/** Loads an example by name, with new rules, its Top x% thresholds empty. */
export function loadExample(name: string): LoadedExample {
  const example = EXAMPLES.find((candidate) => candidate.name === name);
  if (!example) throw new Error(`No example named ${name}`);
  const thresholds: PendingThreshold[] = [];
  const rule: Builder['rule'] = (fields) => ({ ...newRule(), ...fields });
  const stages = example.stages({
    rule,
    topScore(topPercent, field, fields) {
      const made = rule(fields ?? {});
      thresholds.push({ ruleId: made.id, field, topPercent });
      return made;
    },
  });
  return {
    name,
    draft: { stages },
    thresholds,
    topPercents: [...new Set(thresholds.map(({ topPercent }) => topPercent))],
  };
}

/** An Echo Score as a threshold field's text, rounded to 1 decimal. */
export function thresholdText(echoScore: number): string {
  // Through a fixed number of decimals first, so 1.45, held as 1.4499…, rounds as written.
  return String(Math.round(Number((echoScore * 10).toFixed(6))) / 10);
}

/**
 * Fills the pending thresholds, `echoScores` being the Echo Scores of the loaded example's `topPercents` in order. A
 * rule removed meanwhile is left out; every other field stays as it is.
 */
export function fillThresholds(
  draft: StrategyDraft,
  { thresholds, topPercents }: Pick<LoadedExample, 'thresholds' | 'topPercents'>,
  echoScores: readonly number[],
): StrategyDraft {
  const fill = (rule: RuleDraft) =>
    thresholds
      .filter(({ ruleId }) => ruleId === rule.id)
      .reduce((filled, { field, topPercent }) => {
        const echoScore = echoScores[topPercents.indexOf(topPercent)];
        return echoScore === undefined ? filled : { ...filled, [field]: thresholdText(echoScore) };
      }, rule);
  return { stages: draft.stages.map((boxes) => boxes.map((rules) => rules.map(fill))) };
}
