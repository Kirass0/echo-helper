// Loads the golden fixtures exported from the C# Core (tools/golden-export) and maps the C# field names to the
// glossary's: Echo Value -> Echo Score, Value Table -> Substat Weight Table, Target Value -> Target Score,
// Kept -> Successful, ChanceToReachTarget -> Target Chance.

import { readFileSync } from 'node:fs';
import { Echo, type SubstatType } from '../index';
import { substatWeightTable, type SubstatWeightTable } from '../substatWeightTable';
import type { EchoEvaluation, DistributionPoint } from '../evaluateEcho';
import { upgradeStrategy, type UpgradeRule, type UpgradeStrategy } from '../upgradeStrategy';
import type { UpgradeStrategyResult } from '../upgradeStrategyPass';

const FIXTURE_DIRECTORY = new URL('../../../tests/fixtures/golden/', import.meta.url);

/** Reads a fixture's JSON. A missing or unreadable file throws, so its tests fail instead of being skipped. */
export function readGoldenFixture(fileName: string): unknown {
  const url = new URL(fileName, FIXTURE_DIRECTORY);
  let text: string;
  try {
    text = readFileSync(url, 'utf8');
  } catch (error) {
    throw new Error(`The golden fixture ${fileName} can't be read from ${url.pathname}.`, {
      cause: error,
    });
  }
  return JSON.parse(text);
}

// --- The C# shapes, as the exporter writes them -------------------------------------------------------------------

interface CsValueTable {
  Name: string;
  Weights: Record<SubstatType, number>;
}
interface CsDistributionPoint {
  Threshold: number;
  Chance: number;
}
interface CsTopPercent {
  Tables: {
    ValueTable: CsValueTable;
    Points: { EchoValue: number; TopPercent: number; ErTopPercent: number }[];
  }[];
}
interface CsEchoEvaluation {
  ValueTables: CsValueTable[];
  Cases: {
    Name: string;
    ValueTableName: string;
    TuneStage: number;
    Substats: { Type: SubstatType; Value: number }[];
    TargetValue: number | null;
    ErTargetValue: number | null;
    TopPercent: number;
    ErTopPercent: number;
    Evaluation: {
      CurrentEchoValue: number;
      TargetValue: number | null;
      ErTargetValue: number | null;
      Outlook: {
        Best: number;
        Worst: number;
        Average: number;
        Median: number;
        ChanceToReachTarget: number | null;
        ChanceToReachErTarget: number | null;
        Distribution: CsDistributionPoint[];
        DistributionWithEr?: CsDistributionPoint[] | null;
      } | null;
      Verdict: { ReachesTarget: boolean | null; ReachesErTarget: boolean | null } | null;
    };
  }[];
}
type CsRule =
  | { Kind: 'MustHave'; SubstatCount: number; SubstatTypes: SubstatType[] }
  | { Kind: 'StatValue'; SubstatType: SubstatType; MinValue: number }
  | { Kind: 'MinEchoValue'; MinEchoValue: number }
  | { Kind: 'Chance'; MinChancePercent: number; TargetValue: number };
interface CsUpgradeStrategy {
  ValueTables: CsValueTable[];
  Strategies: { Name: string; RuleGroups: { TuneStage: number; Rules: CsRule[] }[] }[];
  Cases: {
    StrategyName: string;
    ValueTableName: string;
    Result: {
      SuccessRate: number;
      AverageCostPerKeptEcho: {
        Echoes: number;
        Exp: number;
        Tuners: number;
        ShellCredits: number;
      } | null;
      Discards: { TuneStage: number; DiscardRate: number }[];
      AverageKeptEchoValue: number | null;
      MinimumKeptEchoValue: number | null;
    };
    // The exporter's Successful Echoes' Echo Score distribution, which the Core no longer calculates (spec §19,
    // 2026-11-21); it stays in the fixture but is not read.
    SuccessfulEchoValues?: unknown;
  }[];
}

// --- The glossary shapes the tests read ---------------------------------------------------------------------------

export interface TopPercentFixture {
  readonly weightTable: SubstatWeightTable;
  readonly points: readonly { echoScore: number; topPercent: number; erTopPercent: number }[];
}

export interface EchoEvaluationFixture {
  readonly name: string;
  readonly weightTable: SubstatWeightTable;
  readonly echo: Echo;
  readonly targetScore: number | null;
  readonly erTargetScore: number | null;
  readonly topPercent: number;
  readonly erTopPercent: number;
  readonly evaluation: EchoEvaluation;
}

export interface UpgradeStrategyFixture {
  readonly name: string;
  readonly weightTable: SubstatWeightTable;
  readonly strategy: UpgradeStrategy;
  readonly result: UpgradeStrategyResult;
}

const weightTableOf = ({ Name, Weights }: CsValueTable) => substatWeightTable(Name, Weights);

function byName<T extends { name: string }>(items: readonly T[], name: string): T {
  const found = items.find((item) => item.name === name);
  if (!found) throw new Error(`The fixture has no entry named ${name}.`);
  return found;
}

const distributionOf = (points: readonly CsDistributionPoint[]): DistributionPoint[] =>
  points.map(({ Threshold, Chance }) => ({ threshold: Threshold, chance: Chance }));

export function loadTopPercentFixtures(): TopPercentFixture[] {
  const fixture = readGoldenFixture('top-percent.json') as CsTopPercent;
  return fixture.Tables.map(({ ValueTable, Points }) => ({
    weightTable: weightTableOf(ValueTable),
    points: Points.map(({ EchoValue, TopPercent, ErTopPercent }) => ({
      echoScore: EchoValue,
      topPercent: TopPercent,
      erTopPercent: ErTopPercent,
    })),
  }));
}

export function loadEchoEvaluationFixtures(): EchoEvaluationFixture[] {
  const fixture = readGoldenFixture('echo-evaluation.json') as CsEchoEvaluation;
  const tables = fixture.ValueTables.map(weightTableOf);
  return fixture.Cases.map((c) => {
    const echo = new Echo();
    for (const { Type, Value } of c.Substats) echo.addSubstat(Type, Value);
    if (echo.tuneStage !== c.TuneStage)
      throw new Error(`${c.Name} lists ${echo.tuneStage} Substats, not ${c.TuneStage}.`);
    const { Evaluation: e } = c;
    const outlook = e.Outlook;
    return {
      name: c.Name,
      weightTable: byName(tables, c.ValueTableName),
      echo,
      targetScore: c.TargetValue,
      erTargetScore: c.ErTargetValue,
      topPercent: c.TopPercent,
      erTopPercent: c.ErTopPercent,
      evaluation: {
        echoScore: e.CurrentEchoValue,
        targetScore: e.TargetValue,
        erTargetScore: e.ErTargetValue,
        outlook: outlook && {
          best: outlook.Best,
          worst: outlook.Worst,
          average: outlook.Average,
          median: outlook.Median,
          targetChance: outlook.ChanceToReachTarget,
          erTargetChance: outlook.ChanceToReachErTarget,
          distribution: distributionOf(outlook.Distribution),
          distributionWithEr: outlook.DistributionWithEr
            ? distributionOf(outlook.DistributionWithEr)
            : null,
        },
        verdict: e.Verdict && {
          reachesTarget: e.Verdict.ReachesTarget,
          reachesErTarget: e.Verdict.ReachesErTarget,
        },
      },
    };
  });
}

function ruleOf(rule: CsRule): UpgradeRule {
  switch (rule.Kind) {
    case 'MustHave':
      return { kind: 'substatCount', count: rule.SubstatCount, substatTypes: rule.SubstatTypes };
    case 'StatValue':
      return { kind: 'substatRoll', substatType: rule.SubstatType, minValue: rule.MinValue };
    case 'MinEchoValue':
      return { kind: 'echoScore', minEchoScore: rule.MinEchoValue };
    case 'Chance':
      return {
        kind: 'targetChance',
        minChancePercent: rule.MinChancePercent,
        targetScore: rule.TargetValue,
      };
    default:
      throw new Error(`Unknown rule kind ${(rule as { Kind: string }).Kind}.`);
  }
}

export function loadUpgradeStrategyFixtures(): UpgradeStrategyFixture[] {
  const fixture = readGoldenFixture('upgrade-strategy.json') as CsUpgradeStrategy;
  const tables = fixture.ValueTables.map(weightTableOf);
  const strategies = fixture.Strategies.map(({ Name, RuleGroups }) => ({
    name: Name,
    strategy: upgradeStrategy(
      RuleGroups.map(({ TuneStage, Rules }) => ({
        tuneStage: TuneStage,
        rules: Rules.map(ruleOf),
      })),
    ),
  }));
  return fixture.Cases.map(({ StrategyName, ValueTableName, Result: r }) => ({
    name: `${StrategyName} on ${ValueTableName}`,
    weightTable: byName(tables, ValueTableName),
    strategy: byName(strategies, StrategyName).strategy,
    result: {
      successRate: r.SuccessRate,
      discards: r.Discards.map(({ TuneStage, DiscardRate }) => ({
        tuneStage: TuneStage,
        discardRate: DiscardRate,
      })),
      costPerSuccessfulEcho: r.AverageCostPerKeptEcho && {
        echoes: r.AverageCostPerKeptEcho.Echoes,
        exp: r.AverageCostPerKeptEcho.Exp,
        tuners: r.AverageCostPerKeptEcho.Tuners,
        shellCredits: r.AverageCostPerKeptEcho.ShellCredits,
      },
      averageSuccessfulEchoScore: r.AverageKeptEchoValue,
      lowestSuccessfulEchoScore: r.MinimumKeptEchoValue,
    },
  }));
}

/**
 * The differences between an actual and an expected value, walked through the expected value's shape: numbers must be
 * within the tolerance, everything else equal, and arrays the same length. Counts the numbers compared.
 */
export function differencesFrom(
  actual: unknown,
  expected: unknown,
  tolerance: number,
  path = '',
  counter = { numbers: 0 },
): string[] {
  if (typeof expected === 'number') {
    counter.numbers++;
    if (typeof actual !== 'number' || !(Math.abs(actual - expected) <= tolerance))
      return [`${path}: expected ${expected}, got ${String(actual)}`];
    return [];
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length)
      return [
        `${path}: expected ${expected.length} items, got ${Array.isArray(actual) ? actual.length : String(actual)}`,
      ];
    return expected.flatMap((item, i) =>
      differencesFrom(actual[i], item, tolerance, `${path}[${i}]`, counter),
    );
  }
  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object')
      return [`${path}: expected an object, got ${String(actual)}`];
    return Object.entries(expected).flatMap(([key, value]) =>
      differencesFrom(
        (actual as Record<string, unknown>)[key],
        value,
        tolerance,
        `${path}.${key}`,
        counter,
      ),
    );
  }
  return actual === expected
    ? []
    : [`${path}: expected ${String(expected)}, got ${String(actual)}`];
}

/**
 * The differences between two Upgrade Strategy results. Everything is compared as differencesFrom compares it, except
 * the Cost per Successful Echo, whose fields must be within the tolerance relative to the expected value. They are
 * Tuning Costs in the hundreds of thousands divided by the Success Rate, so a difference of 1e-15 in a Discard Rate,
 * which a different summation order gives, is about 1e-7 there; the C# Core's own rates are off by up to 1e-12
 * (they sum to 1 only within that). Relative to their size they agree within about 1e-12.
 */
export function upgradeStrategyDifferences(
  actual: UpgradeStrategyResult,
  expected: UpgradeStrategyResult,
  tolerance: number,
): string[] {
  const { costPerSuccessfulEcho: actualCost, ...actualRest } = actual;
  const { costPerSuccessfulEcho: expectedCost, ...expectedRest } = expected;
  const differences = differencesFrom(actualRest, expectedRest, tolerance);
  if (expectedCost === null || actualCost === null) {
    if (expectedCost !== actualCost)
      differences.push(
        `.costPerSuccessfulEcho: expected ${String(expectedCost)}, got ${String(actualCost)}`,
      );
    return differences;
  }
  for (const key of ['echoes', 'exp', 'tuners', 'shellCredits'] as const) {
    const scale = Math.max(1, Math.abs(expectedCost[key]));
    if (!(Math.abs(actualCost[key] - expectedCost[key]) <= tolerance * scale))
      differences.push(
        `.costPerSuccessfulEcho.${key}: expected ${expectedCost[key]}, got ${actualCost[key]}`,
      );
  }
  return differences;
}
