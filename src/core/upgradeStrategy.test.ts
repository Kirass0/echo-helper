import { describe, expect, it } from 'vitest';
import {
  MAX_TUNE_STAGE,
  SUBSTAT_TYPES,
  UpgradeRule,
  calculateUpgradeStrategy,
  substatWeightTable,
  upgradeStrategy,
  type CostPerSuccessfulEcho,
  FinishingTableCache,
  type RuleGroup,
  type SubstatWeightTable,
  type UpgradeStrategy,
  type UpgradeStrategyResult,
} from './index';
import { tuneFreshEchoes } from './testing/upgradeStrategySimulator';

// Ported from UpgradeStrategyCalculationTests.

const exact = 1e-9;
const oracleIterations = 100_000;
const oracleSeed = 1234;

// Crit Rate and Crit Damage add 5.0 per Reference Roll (7.5 and 15).
const critTable = substatWeightTable(
  'Crit',
  Object.fromEntries(
    SUBSTAT_TYPES.map((type) => [
      type,
      type === 'Critical_Rate' || type === 'Critical_Damage' ? 5.0 : 0.0,
    ]),
  ),
);

// Only Crit Rate is weighted: 6.0 per Reference Roll (7.5).
const critRateTable = substatWeightTable('Crit Rate', { Critical_Rate: 6.0 });

// Many Substat types weighted with uneven weights, as in a real Weight Table.
const resonatorTable = substatWeightTable('Resonator', {
  Atk_Percent: 3.56,
  Critical_Rate: 6.27,
  Critical_Damage: 4.86,
  Basic_Attack: 3.21,
  Heavy: 0.08,
  Skill: 0.28,
  Atk_Flat: 1.84,
});

// The values Crit Rate can roll, and their tier weights.
const critRateRolls = [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5];
const critRollWeights = [2333, 2333, 2333, 800, 800, 800, 300, 300];
const critRollTotal = 9999;

const discardRateAt = (result: UpgradeStrategyResult, tuneStage: number) =>
  result.discards.find((stage) => stage.tuneStage === tuneStage)!.discardRate;

function calculate(
  strategy: UpgradeStrategy,
  table: SubstatWeightTable = critTable,
  options: {
    onProgress?: (progress: number) => void;
    signal?: AbortSignal;
    cache?: FinishingTableCache;
  } = {},
): UpgradeStrategyResult {
  return calculateUpgradeStrategy(strategy, table, options);
}

// The rules at each Tune Stage form one Rule Group, so they all have to pass.
function strategyWith(...rules: [tuneStage: number, rule: UpgradeRule][]): UpgradeStrategy {
  const byStage = new Map<number, UpgradeRule[]>();
  for (const [tuneStage, rule] of rules)
    byStage.set(tuneStage, [...(byStage.get(tuneStage) ?? []), rule]);
  return upgradeStrategy(
    [...byStage].map(([tuneStage, stageRules]) => ({ tuneStage, rules: stageRules })),
  );
}

// One Rule Group per entry; an Echo passes a Tune Stage with several entries if any one of them passes.
function strategyWithGroups(
  ...ruleGroups: [tuneStage: number, rules: UpgradeRule[]][]
): UpgradeStrategy {
  return upgradeStrategy(ruleGroups.map(([tuneStage, rules]): RuleGroup => ({ tuneStage, rules })));
}

function expectClose(actual: number | null | undefined, expected: number, tolerance = exact) {
  expect(actual).not.toBeNull();
  expect(actual).toBeDefined();
  expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(tolerance);
}

// The Discard Rate at each Tune Stage from 1 to 5.
function expectDiscards(result: UpgradeStrategyResult, ...discardRates: number[]) {
  expect(result.discards.map((stage) => stage.tuneStage)).toEqual([1, 2, 3, 4, 5]);
  result.discards.forEach((stage) =>
    expectClose(stage.discardRate, discardRates[stage.tuneStage - 1]!),
  );
}

function expectCost(expected: CostPerSuccessfulEcho, actual: CostPerSuccessfulEcho | null) {
  expect(actual).not.toBeNull();
  expectClose(actual!.echoes, expected.echoes);
  expectClose(actual!.exp, expected.exp);
  expectClose(actual!.tuners, expected.tuners);
  expectClose(actual!.shellCredits, expected.shellCredits);
}

const oracleCases: [string, UpgradeStrategy, SubstatWeightTable][] = [
  [
    'Crit Target Chance and Echo Score',
    strategyWith(
      [2, UpgradeRule.echoScore(1)],
      [3, UpgradeRule.targetChance(20, 10)],
      [5, UpgradeRule.echoScore(8)],
    ),
    critTable,
  ],
  [
    'Resonator Substat Roll',
    strategyWith(
      [2, UpgradeRule.substatRoll('Critical_Rate', 7.5)],
      [4, UpgradeRule.substatRoll('Critical_Damage', 15)],
      [4, UpgradeRule.echoScore(12)],
    ),
    resonatorTable,
  ],
  [
    'Resonator Target Chance at 1 and 4',
    strategyWith(
      [1, UpgradeRule.targetChance(20, 8)],
      [4, UpgradeRule.targetChance(25, 14)],
      [5, UpgradeRule.substatRoll('Atk_Percent', 7.9)],
    ),
    resonatorTable,
  ],
  [
    'Resonator Substat Count',
    strategyWith(
      [2, UpgradeRule.substatCount(1, 'Critical_Rate', 'Critical_Damage', 'Atk_Percent')],
      [3, UpgradeRule.substatCount(2, 'Critical_Rate', 'Critical_Damage', 'Basic_Attack')],
    ),
    resonatorTable,
  ],
  [
    'Resonator Rule Groups',
    strategyWithGroups(
      [2, [UpgradeRule.substatCount(1, 'Critical_Rate', 'Critical_Damage')]],
      [2, [UpgradeRule.substatRoll('Atk_Percent', 8.6), UpgradeRule.echoScore(4)]],
      [4, [UpgradeRule.substatCount(2, 'Critical_Rate', 'Critical_Damage')]],
      [4, [UpgradeRule.targetChance(20, 14)]],
      [4, [UpgradeRule.substatRoll('Critical_Rate', 9.3), UpgradeRule.echoScore(10)]],
    ),
    resonatorTable,
  ],
];

describe('calculateUpgradeStrategy', () => {
  it('an empty strategy keeps every Echo at the full Tuning Cost', () => {
    const result = calculate(upgradeStrategy([]));

    expectClose(result.successRate, 1.0);
    expectDiscards(result, 0, 0, 0, 0, 0);
    expectCost(
      { echoes: 1, exp: 142_600, tuners: 50, shellCredits: 24_260 },
      result.costPerSuccessfulEcho,
    );
    // Most Echoes have neither Crit Substat.
    expectClose(result.lowestSuccessfulEchoScore, 0.0);
  });
  it('a Substat Count rule at Tune Stage 1 for one type discards 12 of 13 Echoes there', () => {
    const result = calculate(strategyWith([1, UpgradeRule.substatCount(1, 'Critical_Rate')]));

    expectClose(result.successRate, 1.0 / 13);
    expectDiscards(result, 12.0 / 13, 0, 0, 0, 0);
    // Each Successful Echo costs 13 Echoes: 12 discarded at Tune Stage 1 (1,100 EXP, 7 Tuners, 2,440 Shell Credits
    // after the refund) and itself.
    expectCost(
      {
        echoes: 13,
        exp: 12 * 1_100 + 142_600,
        tuners: 12 * 7 + 50,
        shellCredits: 12 * 2_440 + 24_260,
      },
      result.costPerSuccessfulEcho,
    );
  });

  it('an Echo passing either Rule Group keeps tuning', () => {
    const result = calculate(
      strategyWithGroups(
        [1, [UpgradeRule.substatCount(1, 'Critical_Rate')]],
        [1, [UpgradeRule.substatCount(1, 'Critical_Damage')]],
      ),
    );

    // The first Substat is Crit Rate or Crit Damage for 2 of 13 Echoes.
    expectClose(result.successRate, 2.0 / 13);
    expectDiscards(result, 11.0 / 13, 0, 0, 0, 0);
  });

  it('an Echo passes a Rule Group only when all its rules pass', () => {
    // Of the 286 sets of 3 Substat types, 11 have Crit Rate and Crit Damage, 66 have Atk% and 1 has all three, so 76
    // pass.
    const result = calculate(
      strategyWithGroups(
        [
          3,
          [
            UpgradeRule.substatCount(1, 'Critical_Rate'),
            UpgradeRule.substatCount(1, 'Critical_Damage'),
          ],
        ],
        [3, [UpgradeRule.substatCount(1, 'Atk_Percent')]],
      ),
    );

    expectClose(result.successRate, 76.0 / 286);
    expectDiscards(result, 0, 0, 210.0 / 286, 0, 0);
  });

  it('the order of Rule Groups does not change the result', () => {
    const critRateAndDamage = [
      UpgradeRule.substatCount(1, 'Critical_Rate'),
      UpgradeRule.substatCount(1, 'Critical_Damage'),
    ];
    const echoScore = [UpgradeRule.echoScore(9)];

    const first = calculate(strategyWithGroups([3, critRateAndDamage], [3, echoScore]));
    const second = calculate(strategyWithGroups([3, echoScore], [3, critRateAndDamage]));

    expectClose(first.successRate, second.successRate);
    expectClose(first.averageSuccessfulEchoScore, second.averageSuccessfulEchoScore!);
    first.discards.forEach((stage, i) =>
      expectClose(stage.discardRate, second.discards[i]!.discardRate),
    );
  });

  it('a Rule Group that never passes beside one that always passes discards nothing', () => {
    // Two of a single Substat type can never be on an Echo; every Echo Score is at least 0.
    const result = calculate(
      strategyWithGroups(
        [2, [UpgradeRule.substatCount(2, 'Critical_Rate')]],
        [2, [UpgradeRule.echoScore(0)]],
      ),
    );

    expectClose(result.successRate, 1.0);
    expectDiscards(result, 0, 0, 0, 0, 0);
  });

  it('Rule Groups that never pass discard every Echo', () => {
    const result = calculate(
      strategyWithGroups(
        [2, [UpgradeRule.substatCount(2, 'Critical_Rate')]],
        [2, [UpgradeRule.substatCount(2, 'Critical_Damage')]],
      ),
    );

    expect(result.successRate).toBe(0.0);
    expectDiscards(result, 0, 1, 0, 0, 0);
  });

  it('a Substat Roll rule only in a later Rule Group decides with its roll', () => {
    // The first Rule Group can never pass, so the result is that of the Substat Roll rule alone.
    const alone = calculate(strategyWith([5, UpgradeRule.substatRoll('Critical_Rate', 10.5)]));
    const later = calculate(
      strategyWithGroups(
        [5, [UpgradeRule.echoScore(1_000)]],
        [5, [UpgradeRule.substatRoll('Critical_Rate', 10.5)]],
      ),
    );

    expectClose(alone.successRate, later.successRate);
    expectClose(alone.averageSuccessfulEchoScore, later.averageSuccessfulEchoScore!);
    expectClose(alone.lowestSuccessfulEchoScore, later.lowestSuccessfulEchoScore!);
  });

  it('a Target Chance rule only in a later Rule Group decides with its chance', () => {
    // The first Rule Group can never pass, so the result is that of the Target Chance rule alone.
    const alone = calculate(strategyWith([3, UpgradeRule.targetChance(20, 10)]));
    const later = calculate(
      strategyWithGroups(
        [3, [UpgradeRule.echoScore(1_000)]],
        [3, [UpgradeRule.targetChance(20, 10)]],
      ),
    );

    expect(alone.successRate).toBeGreaterThanOrEqual(0.01);
    expect(alone.successRate).toBeLessThanOrEqual(0.99);
    expectClose(alone.successRate, later.successRate);
    expectClose(alone.averageSuccessfulEchoScore, later.averageSuccessfulEchoScore!);
  });

  it('a Rule Group without rules is rejected', () => {
    expect(() => upgradeStrategy([{ tuneStage: 1, rules: [] }])).toThrow();
  });

  it('Successful Echo Scores are those of the Successful Echoes', () => {
    // Every Successful Echo has Crit Rate, the only weighted type, so its Echo Score is 6.0 per Reference Roll of it.
    const result = calculate(
      strategyWith([1, UpgradeRule.substatCount(1, 'Critical_Rate')]),
      critRateTable,
    );

    const averageCritRate =
      critRateRolls.reduce((sum, roll, i) => sum + roll * critRollWeights[i]!, 0) / critRollTotal;
    expectClose(result.averageSuccessfulEchoScore, (6.0 * averageCritRate) / 7.5);
    expectClose(result.lowestSuccessfulEchoScore, (6.0 * 6.3) / 7.5);
  });

  it('Discards add to the cost of each Successful Echo', () => {
    const result = calculate(
      strategyWith([3, UpgradeRule.substatCount(1, 'Critical_Rate', 'Critical_Damage')]),
    );

    // 165 of the 286 sets of three Substat types have neither Crit Substat.
    expectClose(result.successRate, 121.0 / 286);
    expectDiscards(result, 0, 0, 165.0 / 286, 0, 0);
    // An Echo discarded at Tune Stage 3 costs 9,900 EXP, 21 Tuners and 9,960 Shell Credits after the refund.
    expectCost(
      {
        echoes: 286.0 / 121,
        exp: (165 * 9_900 + 121 * 142_600) / 121.0,
        tuners: (165 * 21 + 121 * 50) / 121.0,
        shellCredits: (165 * 9_960 + 121 * 24_260) / 121.0,
      },
      result.costPerSuccessfulEcho,
    );
  });

  it.each([1, 3, 5])(
    'an impossible Substat Count rule discards every Echo at its Tune Stage (%i)',
    (tuneStage) => {
      // Two of a single Substat type can never be on an Echo.
      const result = calculate(
        strategyWith([tuneStage, UpgradeRule.substatCount(2, 'Critical_Rate')]),
      );

      expect(result.successRate).toBe(0.0);
      expectDiscards(
        result,
        ...Array.from({ length: MAX_TUNE_STAGE }, (_, i) => (i + 1 === tuneStage ? 1.0 : 0.0)),
      );
      expect(result.costPerSuccessfulEcho).toBeNull();
      expect(result.averageSuccessfulEchoScore).toBeNull();
      expect(result.lowestSuccessfulEchoScore).toBeNull();
    },
  );

  it('a Substat Roll rule above the maximum roll discards every Echo', () => {
    // Crit Rate rolls at most 10.5.
    const result = calculate(strategyWith([5, UpgradeRule.substatRoll('Critical_Rate', 10.6)]));

    expect(result.successRate).toBe(0.0);
    expectDiscards(result, 0, 0, 0, 0, 1);
  });

  it.each([10.5, 10.5 + 5e-10])(
    'a Substat Roll rule at the maximum roll keeps Echoes with that roll (%d)',
    (minValue) => {
      const result = calculate(
        strategyWith([5, UpgradeRule.substatRoll('Critical_Rate', minValue)]),
      );

      // Crit Rate is on 5 of 13 Echoes, and 300 of 9,999 of its rolls are 10.5.
      const kept = ((5.0 / 13) * 300) / critRollTotal;
      expectClose(result.successRate, kept);
      expectDiscards(result, 0, 0, 0, 0, 1 - kept);
    },
  );

  it('an Echo Score rule of 0 never discards', () => {
    const strategy = strategyWith(
      ...Array.from({ length: MAX_TUNE_STAGE }, (_, i): [number, UpgradeRule] => [
        i + 1,
        UpgradeRule.echoScore(0),
      ]),
    );

    expectClose(calculate(strategy).successRate, 1.0);
  });

  it.each([10, 10 + 5e-10])(
    'Successful Echoes reach the final Echo Score rule, and one reaching it exactly is Successful (%d)',
    (minEchoScore) => {
      const result = calculate(strategyWith([5, UpgradeRule.echoScore(minEchoScore)]));

      // Crit Rate 7.5 and Crit Damage 15, one Reference Roll each, are worth exactly 10.
      expectClose(result.lowestSuccessfulEchoScore, 10.0);
      expect(result.averageSuccessfulEchoScore).toBeGreaterThan(10);
      expect(result.successRate).toBeGreaterThanOrEqual(0.01);
      expect(result.successRate).toBeLessThanOrEqual(0.99);
      expectClose(discardRateAt(result, 5), 1 - result.successRate);
    },
  );

  it.each([
    [34, 12.0 / 13],
    [100.0 / 3, 0], // exactly the chance without Crit Rate
    [33, 0],
  ])(
    'a Target Chance rule discards Echoes whose Target Chance is too low (%d%%)',
    (minChancePercent, discardRate) => {
      // Any Crit Rate reaches the Target Score; an Echo without it at Tune Stage 1 gets it in 4 of the 12 other types.
      const result = calculate(
        strategyWith([1, UpgradeRule.targetChance(minChancePercent, 0.1)]),
        critRateTable,
      );

      expectDiscards(result, discardRate, 0, 0, 0, 0);
      expectClose(result.successRate, 1 - discardRate);
    },
  );

  it('a Target Chance rule that is always met keeps every Echo, and an unreachable one discards them', () => {
    const unreachable = calculate(strategyWith([3, UpgradeRule.targetChance(1, 1_000)]));
    const alwaysMet = calculate(strategyWith([3, UpgradeRule.targetChance(0, 1_000)]));

    expectDiscards(unreachable, 0, 0, 1, 0, 0);
    expectClose(alwaysMet.successRate, 1.0);
  });

  it('a Target Chance rule above 100% discards every Echo at its Tune Stage', () => {
    // Target Score 0 is always reached, so only the impossible chance discards.
    const result = calculate(strategyWith([2, UpgradeRule.targetChance(101, 0)]));

    expect(result.successRate).toBe(0.0);
    expectDiscards(result, 0, 1, 0, 0, 0);
  });

  it.each(oracleCases)('the result agrees with tuning random Echoes: %s', (_, strategy, table) => {
    const sampled = tuneFreshEchoes(strategy, table, oracleIterations, oracleSeed);

    const result = calculate(strategy, table);

    // Rates within about five standard errors of 100,000 samples.
    const rateError = 0.008;
    expectClose(result.successRate, sampled.successRate, rateError);
    result.discards.forEach((stage, i) =>
      expectClose(stage.discardRate, sampled.discardRates[i]!, rateError),
    );
    expect(sampled.successRate).toBeGreaterThanOrEqual(0.002);
    expect(sampled.successRate).toBeLessThanOrEqual(0.99);
    const sampledAverage =
      sampled.successfulEchoScores.reduce((sum, score) => sum + score, 0) /
      sampled.successfulEchoScores.length;
    expectClose(result.averageSuccessfulEchoScore, sampledAverage, 0.2);
    expect(result.lowestSuccessfulEchoScore).toBeLessThanOrEqual(
      Math.min(...sampled.successfulEchoScores) + exact,
    );
  });

  it('an aborted signal stops the calculation', () => {
    const controller = new AbortController();
    controller.abort();

    expect(() =>
      calculate(strategyWith([5, UpgradeRule.echoScore(10)]), critTable, {
        signal: controller.signal,
      }),
    ).toThrow(expect.objectContaining({ name: 'AbortError' }));
  });

  it('progress is reported per Tune Stage', () => {
    const reports: number[] = [];

    calculate(strategyWith([5, UpgradeRule.echoScore(10)]), critTable, {
      onProgress: (progress) => reports.push(progress),
    });

    expect(reports).toHaveLength(5);
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach((expected, i) => expectClose(reports[i], expected));
  });
});

describe('the finishing table cache', () => {
  const chanceStrategy = (minChancePercent: number, targetScore: number) =>
    strategyWith(
      [2, UpgradeRule.targetChance(minChancePercent, targetScore)],
      [3, UpgradeRule.substatCount(1, 'Critical_Rate', 'Critical_Damage')],
    );

  it('builds no finishing table again for threshold and rule edits on an unchanged Weight Table', () => {
    const cache = new FinishingTableCache();
    calculate(chanceStrategy(20, 10), resonatorTable, { cache });
    const built = cache.size;
    expect(built).toBeGreaterThan(0);

    const edited = strategyWithGroups(
      [2, [UpgradeRule.targetChance(35, 12.5), UpgradeRule.echoScore(2)]],
      [2, [UpgradeRule.substatRoll('Critical_Rate', 8.1)]],
      [3, [UpgradeRule.substatCount(2, 'Critical_Rate', 'Critical_Damage', 'Atk_Percent')]],
    );
    const cached = calculate(edited, resonatorTable, { cache });

    expect(cache.size).toBe(built);
    expect(cached).toEqual(calculate(edited, resonatorTable));
  });

  it('is keyed by the weights, not the Weight Table', () => {
    const cache = new FinishingTableCache();
    calculate(chanceStrategy(20, 10), resonatorTable, { cache });
    const built = cache.size;

    const renamed = substatWeightTable('Renamed', {
      Atk_Percent: 3.56,
      Critical_Rate: 6.27,
      Critical_Damage: 4.86,
      Basic_Attack: 3.21,
      Heavy: 0.08,
      Skill: 0.28,
      Atk_Flat: 1.84,
    });
    calculate(chanceStrategy(20, 10), renamed, { cache });
    expect(cache.size).toBe(built);

    calculate(chanceStrategy(20, 10), critTable, { cache });
    expect(cache.size).toBeGreaterThan(built);
  });
});
