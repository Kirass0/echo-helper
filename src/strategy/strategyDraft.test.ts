import { describe, expect, it } from 'vitest';
import {
  addRuleGroup,
  addRule,
  emptyStrategy,
  finishedStrategy,
  newRule,
  removeRule,
  ruleProblem,
  stageSummary,
  updateRule,
  type RuleDraft,
  type StrategyDraft,
} from './strategyDraft';

const rule = (fields: Partial<RuleDraft>): RuleDraft => ({ ...newRule(), ...fields });

/** A strategy with these boxes at one Tune Stage, and nothing elsewhere. */
const atStage = (tuneStage: number, boxes: RuleDraft[][]): StrategyDraft => ({
  stages: emptyStrategy().stages.map((stage, i) => (i === tuneStage - 1 ? boxes : stage)),
});

describe('a new rule', () => {
  it('is an unfinished Substat Count rule: at least 1 of no Substats', () => {
    const fresh = newRule();
    expect(fresh.kind).toBe('substatCount');
    expect(fresh.count).toBe(1);
    expect(fresh.substatTypes).toEqual([]);
    expect(ruleProblem(fresh)?.message).toBe('Pick at least one Substat.');
  });

  it('gets an id of its own', () => {
    expect(newRule().id).not.toBe(newRule().id);
  });
});

describe('unfinished and invalid rules', () => {
  it('asks for what each kind is missing', () => {
    expect(ruleProblem(rule({ kind: 'echoScore', echoScoreText: '' }))?.message).toBe(
      'Enter an Echo Score.',
    );
    expect(
      ruleProblem(rule({ kind: 'targetChance', chanceText: '', targetScoreText: '20' }))?.message,
    ).toBe('Enter a chance in %.');
    expect(
      ruleProblem(rule({ kind: 'targetChance', chanceText: '5', targetScoreText: ' ' }))?.message,
    ).toBe('Enter a Target Score.');
  });

  it('has a field error for an invalid number instead', () => {
    expect(ruleProblem(rule({ kind: 'echoScore', echoScoreText: '-1' }))).toEqual({
      field: 'echoScore',
      message: 'Enter a number of 0 or more.',
      invalid: true,
    });
    expect(ruleProblem(rule({ kind: 'echoScore', echoScoreText: 'abc' }))?.message).toBe(
      'Enter a number of 0 or more.',
    );
    expect(
      ruleProblem(rule({ kind: 'targetChance', chanceText: '101', targetScoreText: '20' })),
    ).toEqual({ field: 'chance', message: 'Enter a chance from 0 to 100.', invalid: true });
    expect(
      ruleProblem(rule({ kind: 'targetChance', chanceText: '-3', targetScoreText: '20' }))?.message,
    ).toBe('Enter a chance from 0 to 100.');
    expect(
      ruleProblem(rule({ kind: 'targetChance', chanceText: '50', targetScoreText: 'x' })),
    ).toEqual({ field: 'targetScore', message: 'Enter a number of 0 or more.', invalid: true });
  });

  it('allows impossible rules', () => {
    expect(ruleProblem(rule({ count: 5, substatTypes: ['Critical_Rate'] }))).toBeNull();
    expect(ruleProblem(rule({ kind: 'echoScore', echoScoreText: '9999' }))).toBeNull();
    expect(
      ruleProblem(rule({ kind: 'targetChance', chanceText: '100', targetScoreText: '0' })),
    ).toBeNull();
    expect(ruleProblem(rule({ kind: 'substatRoll' }))).toBeNull();
  });

  it('judges only the fields of the rule’s own kind', () => {
    expect(ruleProblem(rule({ kind: 'substatRoll', substatTypes: [], echoScoreText: 'x' }))).toBe(
      null,
    );
  });
});

describe('the finished strategy', () => {
  it('turns each box into a Rule Group at its Tune Stage', () => {
    const draft = {
      stages: [
        [],
        [
          [rule({ count: 1, substatTypes: ['Critical_Rate', 'Critical_Damage'] })],
          [
            rule({ kind: 'substatRoll', substatType: 'Critical_Rate', minValue: 9.3 }),
            rule({ kind: 'echoScore', echoScoreText: '4.5' }),
          ],
        ],
        [],
        [],
        [[rule({ kind: 'targetChance', chanceText: '12.5', targetScoreText: '20' })]],
      ],
    };
    expect(finishedStrategy(draft)).toEqual({
      strategy: {
        ruleGroups: [
          {
            tuneStage: 2,
            rules: [
              {
                kind: 'substatCount',
                count: 1,
                substatTypes: ['Critical_Rate', 'Critical_Damage'],
              },
            ],
          },
          {
            tuneStage: 2,
            rules: [
              { kind: 'substatRoll', substatType: 'Critical_Rate', minValue: 9.3 },
              { kind: 'echoScore', minEchoScore: 4.5 },
            ],
          },
          {
            tuneStage: 5,
            rules: [{ kind: 'targetChance', minChancePercent: 12.5, targetScore: 20 }],
          },
        ],
      },
    });
  });

  it('is an empty strategy when there are no rules', () => {
    expect(finishedStrategy(emptyStrategy())).toEqual({ strategy: { ruleGroups: [] } });
  });

  it('is missing while a rule is unfinished, naming the first Tune Stage with one', () => {
    const draft: StrategyDraft = {
      stages: [[], [], [[newRule()]], [[rule({ kind: 'echoScore', echoScoreText: '' })]], []],
    };
    expect(finishedStrategy(draft)).toEqual({ unfinishedStage: 3 });
  });
});

describe('editing a strategy', () => {
  it('adds a rule to a box ("+ and") and a new box ("+ or" or "+ add a rule")', () => {
    let draft = addRuleGroup(emptyStrategy(), 2);
    expect(draft.stages[1]).toHaveLength(1);
    expect(draft.stages[1]?.[0]).toHaveLength(1);
    draft = addRule(draft, 2, 0);
    expect(draft.stages[1]?.[0]).toHaveLength(2);
    draft = addRuleGroup(draft, 2);
    expect(draft.stages[1]?.map((box) => box.length)).toEqual([2, 1]);
  });

  it('removes a rule, and a box with it once empty', () => {
    const first = rule({ substatTypes: ['Critical_Rate'] });
    const second = rule({ substatTypes: ['Critical_Damage'] });
    const draft = atStage(1, [[first, second], [rule({})]]);
    expect(removeRule(draft, 1, 0, 0).stages[0]).toEqual([[second], draft.stages[0]?.[1]]);
    expect(removeRule(draft, 1, 1, 0).stages[0]).toEqual([[first, second]]);
  });

  it('keeps every kind’s fields when switching kind', () => {
    const draft = atStage(1, [
      [rule({ substatTypes: ['Critical_Rate'], echoScoreText: '7', chanceText: '20' })],
    ]);
    const switched = updateRule(draft, 1, 0, 0, { kind: 'echoScore' });
    const back = updateRule(switched, 1, 0, 0, { kind: 'substatCount' });
    expect(back.stages[0]?.[0]?.[0]).toEqual(draft.stages[0]?.[0]?.[0]);
    expect(switched.stages[0]?.[0]?.[0]).toMatchObject({
      kind: 'echoScore',
      substatTypes: ['Critical_Rate'],
      echoScoreText: '7',
      chanceText: '20',
    });
  });

  it('moves a Substat Roll rule’s value to the new Substat’s lowest when its Substat changes', () => {
    const draft = atStage(1, [
      [rule({ kind: 'substatRoll', substatType: 'Critical_Rate', minValue: 9.3 })],
    ]);
    const changed = updateRule(draft, 1, 0, 0, { substatType: 'Hp_Flat' });
    expect(changed.stages[0]?.[0]?.[0]).toMatchObject({ substatType: 'Hp_Flat', minValue: 320 });
  });
});

describe('a Tune Stage’s summary', () => {
  it('joins rules in a box with "and" and boxes with "or"', () => {
    expect(
      stageSummary([
        [rule({ count: 1, substatTypes: ['Critical_Damage', 'Critical_Rate'] })],
        [rule({ kind: 'substatRoll', substatType: 'Critical_Rate', minValue: 9.3 })],
      ]),
    ).toBe('at least 1 of Crit Rate, Crit Damage or Crit Rate at least 9.3');
    expect(
      stageSummary([
        [
          rule({ kind: 'echoScore', echoScoreText: '11.8' }),
          rule({ kind: 'targetChance', chanceText: '5', targetScoreText: '7.4' }),
        ],
      ]),
    ).toBe('Echo Score at least 11.8 and at least 5% chance to reach a Target Score of 7.4');
  });

  it('reads "every Echo keeps tuning" for an empty stage', () => {
    expect(stageSummary([])).toBe('every Echo keeps tuning');
  });
});
