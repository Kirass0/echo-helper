import { describe, expect, it } from 'vitest';
import { EXAMPLE_NAMES, fillThresholds, loadExample, thresholdText } from './examples';
import { finishedStrategy, removeRule } from './strategyDraft';

const CRITS = ['Critical_Rate', 'Critical_Damage'];

/** Loads an example and fills its Top x% thresholds from these Echo Scores, one per Top Percent asked for. */
function loadedWith(name: string, echoScores: (topPercent: number) => number) {
  const loaded = loadExample(name);
  return finishedStrategy(
    fillThresholds(
      loaded.draft,
      loaded,
      loaded.topPercents.map((topPercent) => echoScores(topPercent)),
    ),
  );
}

describe('the example strategies', () => {
  it('are the four of the ticket 08 prototype, in its order', () => {
    expect(EXAMPLE_NAMES).toEqual([
      'Keep every Echo',
      'Crit first',
      'Double crit, or one great crit roll',
      'Chance to reach a Top 5% Echo',
    ]);
  });

  it('Keep every Echo has no rules', () => {
    const loaded = loadExample('Keep every Echo');
    expect(loaded.topPercents).toEqual([]);
    expect(finishedStrategy(loaded.draft)).toEqual({ strategy: { ruleGroups: [] } });
  });

  it('Crit first needs Crit Rate or Crit Damage by 2/5, and both by 4/5', () => {
    const loaded = loadExample('Crit first');
    expect(loaded.topPercents).toEqual([]);
    expect(finishedStrategy(loaded.draft)).toEqual({
      strategy: {
        ruleGroups: [
          { tuneStage: 2, rules: [{ kind: 'substatCount', count: 1, substatTypes: CRITS }] },
          { tuneStage: 4, rules: [{ kind: 'substatCount', count: 2, substatTypes: CRITS }] },
        ],
      },
    });
  });

  it('Double crit, or one great crit roll: both crits or a high roll at 3/5, a Top 10% Echo Score at 5/5', () => {
    expect(loadExample('Double crit, or one great crit roll').topPercents).toEqual([0.1]);
    expect(loadedWith('Double crit, or one great crit roll', () => 6.48)).toEqual({
      strategy: {
        ruleGroups: [
          { tuneStage: 3, rules: [{ kind: 'substatCount', count: 2, substatTypes: CRITS }] },
          {
            tuneStage: 3,
            rules: [{ kind: 'substatRoll', substatType: 'Critical_Rate', minValue: 9.3 }],
          },
          {
            tuneStage: 3,
            rules: [{ kind: 'substatRoll', substatType: 'Critical_Damage', minValue: 18.6 }],
          },
          { tuneStage: 5, rules: [{ kind: 'echoScore', minEchoScore: 6.5 }] },
        ],
      },
    });
  });

  it('Chance to reach a Top 5% Echo: a growing chance of its Echo Score, then the Echo Score itself', () => {
    expect(loadExample('Chance to reach a Top 5% Echo').topPercents).toEqual([0.05]);
    const chance = (tuneStage: number, minChancePercent: number) => ({
      tuneStage,
      rules: [{ kind: 'targetChance', minChancePercent, targetScore: 7.4 }],
    });
    expect(loadedWith('Chance to reach a Top 5% Echo', () => 7.44)).toEqual({
      strategy: {
        ruleGroups: [
          chance(1, 5),
          chance(2, 8),
          chance(3, 12),
          chance(4, 20),
          { tuneStage: 5, rules: [{ kind: 'echoScore', minEchoScore: 7.4 }] },
        ],
      },
    });
  });

  it('leave their Top x% thresholds empty until they are worked out', () => {
    const loaded = loadExample('Chance to reach a Top 5% Echo');
    expect(finishedStrategy(loaded.draft)).toEqual({ unfinishedStage: 1 });
    expect(loaded.thresholds).toHaveLength(5);
  });

  it('fill only the thresholds of rules still there', () => {
    const loaded = loadExample('Chance to reach a Top 5% Echo');
    const withoutFirst = removeRule(loaded.draft, 1, 0, 0);
    const filled = fillThresholds(withoutFirst, loaded, [7.44]);
    expect(finishedStrategy(filled)).toMatchObject({ strategy: { ruleGroups: { length: 4 } } });
  });
});

describe('a Top x% threshold', () => {
  it.each([
    [6.48, '6.5'],
    [7.44, '7.4'],
    [1.45, '1.5'],
    [12.95, '13'],
    [3, '3'],
    [0, '0'],
  ])('of %d reads %s, rounded to 1 decimal', (echoScore, text) => {
    expect(thresholdText(echoScore)).toBe(text);
  });
});
