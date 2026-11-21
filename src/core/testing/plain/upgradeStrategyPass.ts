// The plain Map-based port (spec §3, "Order of work"), kept in test code as the exact reference the fast Core is
// checked against. It never ships: only tests import it.
import { scoreRolls, substatScore } from '../../echo';
import { finishingEchoScoresFor, type FinishingEchoScores } from './finishingEchoScores';
import { MAX_TUNE_STAGE, SUBSTAT_TYPES, possibleRolls, type SubstatType } from '../../gameData';
import { roundTo12Decimals } from '../../rounding';
import { THRESHOLD_TOLERANCE, clamp01 } from '../../search';
import type { SubstatWeightTable } from '../../substatWeightTable';
import { addTuningCosts, scaleTuningCost, tuningCost, type TuningCost } from '../../tuningCost';
import { ruleGroupsByStage, type UpgradeRule, type UpgradeStrategy } from '../../upgradeStrategy';

/** What it costs on average to end up with one Successful Echo, counting the Echoes discarded along the way. */
export type CostPerSuccessfulEcho = TuningCost & { readonly echoes: number };

/** The Discard Rate at a Tune Stage: the share of all Echoes started that are discarded there. */
export interface TuneStageDiscards {
  readonly tuneStage: number;
  readonly discardRate: number;
}

/**
 * The exact result of an Upgrade Strategy on fresh Echoes. Rates are in [0, 1]; the Discard Rates and the Success Rate
 * add up to 1. The per-Successful-Echo results are null when no Echo is Successful.
 */
export interface UpgradeStrategyResult {
  readonly successRate: number;
  readonly discards: readonly TuneStageDiscards[];
  readonly costPerSuccessfulEcho: CostPerSuccessfulEcho | null;
  readonly averageSuccessfulEchoScore: number | null;
  readonly lowestSuccessfulEchoScore: number | null;
}

/**
 * The finishing tables an Upgrade Strategy pass reads, from an Echo Score of 0, keyed by a Weight Table's weights and
 * a Substat type set. Kept by the caller between calculations, it makes threshold and rule edits on an unchanged Weight
 * Table rebuild none of them.
 */
export class FinishingTableCache {
  readonly #tables = new Map<string, FinishingEchoScores>();

  /** How many finishing tables have been built. */
  get size(): number {
    return this.#tables.size;
  }

  clear(): void {
    this.#tables.clear();
  }

  /** The finishing table of an Echo with these Substat types and an Echo Score of 0. */
  finishingTable(table: SubstatWeightTable, types: readonly SubstatType[]): FinishingEchoScores {
    const ordered = SUBSTAT_TYPES.filter((type) => types.includes(type));
    const key = `${SUBSTAT_TYPES.map((type) => table.weightOf(type)).join(',')}|${ordered.join(',')}`;
    let finishing = this.#tables.get(key);
    if (!finishing) {
      finishing = finishingEchoScoresFor(ordered, 0, table);
      this.#tables.set(key, finishing);
    }
    return finishing;
  }
}

export interface UpgradeStrategyOptions {
  /** Aborting it stops the calculation with the signal's reason (an `AbortError` by default). */
  readonly signal?: AbortSignal | undefined;
  /** Called with the share done, in (0, 1], after each Tune Stage up to the last one with rules, and with 1 at the end. */
  readonly onProgress?: ((progress: number) => void) | undefined;
  /** The finishing tables to reuse; without it, each calculation builds its own. */
  readonly cache?: FinishingTableCache | undefined;
}

// TunedEcho.Rolls holds, per Substat type a Substat Roll rule names, the index of its roll plus one in a base-16 digit.
const ROLL_BASE = 16;

const bit = (type: SubstatType) => 1 << SUBSTAT_TYPES.indexOf(type);
const has = (types: number, type: SubstatType) => (types & bit(type)) !== 0;
const typesOf = (types: number) => SUBSTAT_TYPES.filter((type) => has(types, type));
const popCount = (types: number) => typesOf(types).length;

/**
 * What Upgrade Rules read of an Echo during the forward pass: its Substat types as bits, its Echo Score (0 once no
 * later rule reads it) and the roll digits of the Substat types Substat Roll rules name.
 */
interface TunedEcho {
  readonly types: number;
  readonly score: number;
  readonly rolls: number;
}

/** A roll in the forward pass: what it adds to the Echo Score, its chance, and what it adds to TunedEcho.rolls. */
interface PassRoll {
  readonly score: number;
  readonly chance: number;
  readonly rollsPart: number;
}

/** A state's chance, its chance-weighted sum of Echo Scores, and the lowest Echo Score merged into it. */
interface StateChance {
  chance: number;
  scoreSum: number;
  minScore: number;
}

/**
 * Calculates an Upgrade Strategy exactly by going forward one Tune Stage at a time, keeping the chance of every
 * distinct state still in play. Upgrade Rules don't see the order Substats arrived in, so a state is the Substat types,
 * the Echo Score and the values Substat Roll rules name, and each part is kept only while a rule at a later Tune Stage
 * still reads it.
 */
export function calculateUpgradeStrategy(
  strategy: UpgradeStrategy,
  table: SubstatWeightTable,
  { signal, onProgress, cache = new FinishingTableCache() }: UpgradeStrategyOptions = {},
): UpgradeStrategyResult {
  signal?.throwIfAborted();
  const byStage = ruleGroupsByStage(strategy);
  let lastRuleStage = 0;
  for (let tuneStage = 1; tuneStage <= MAX_TUNE_STAGE; tuneStage++)
    if (byStage[tuneStage]!.length > 0) lastRuleStage = tuneStage;
  const context = new RuleContext(table, byStage, cache);
  const keyOf = (echo: TunedEcho) => `${echo.types},${echo.score},${echo.rolls}`;
  let states = new Map<string, [TunedEcho, StateChance]>([
    [
      keyOf({ types: 0, score: 0, rolls: 0 }),
      [
        { types: 0, score: 0, rolls: 0 },
        { chance: 1, scoreSum: 0, minScore: 0 },
      ],
    ],
  ]);
  const discardRates = new Array<number>(MAX_TUNE_STAGE + 1).fill(0);

  for (let tuneStage = 1; tuneStage <= lastRuleStage; tuneStage++) {
    const ruleGroups = byStage[tuneStage]!;
    const keepsScore = context.scoreReadFrom(tuneStage + 1);
    const typeChance = 1.0 / (SUBSTAT_TYPES.length - tuneStage + 1);
    const next = new Map<string, [TunedEcho, StateChance]>();

    for (const [echo, state] of states.values()) {
      signal?.throwIfAborted();
      for (const type of SUBSTAT_TYPES) {
        if (has(echo.types, type)) continue;
        for (const roll of context.rollsAt(tuneStage, type)) {
          const tuned: TunedEcho = {
            types: echo.types | bit(type),
            score: echo.score + roll.score,
            rolls: echo.rolls + roll.rollsPart,
          };
          const chance = typeChance * roll.chance;
          if (!passesAnyRuleGroup(ruleGroups, tuned, context)) {
            discardRates[tuneStage]! += state.chance * chance;
            continue;
          }

          const kept: TunedEcho = {
            types: tuned.types,
            score: keepsScore ? roundTo12Decimals(tuned.score) : 0,
            rolls: context.keptRolls(tuned.rolls, tuneStage + 1),
          };
          const key = keyOf(kept);
          const merged = next.get(key)?.[1];
          const addedChance = state.chance * chance;
          const addedSum = (state.scoreSum + state.chance * roll.score) * chance;
          const addedMin = state.minScore + roll.score;
          if (merged) {
            merged.chance += addedChance;
            merged.scoreSum += addedSum;
            merged.minScore = Math.min(merged.minScore, addedMin);
          } else {
            next.set(key, [kept, { chance: addedChance, scoreSum: addedSum, minScore: addedMin }]);
          }
        }
      }
    }

    states = next;
    onProgress?.(tuneStage / MAX_TUNE_STAGE);
  }

  // No rule reads the Tune Stages after the last one with rules, so every state left is Successful, and finishes with
  // any of the missing types.
  signal?.throwIfAborted();
  let successRate = 0;
  let scoreSum = 0;
  let lowestScore = Number.MAX_VALUE;
  for (const [echo, state] of states.values()) {
    const { average, min } = context.scoreAddedToFinish(echo.types);
    successRate += state.chance;
    scoreSum += state.scoreSum + state.chance * average;
    lowestScore = Math.min(lowestScore, state.minScore + min);
  }
  const anySuccessful = states.size > 0;
  if (lastRuleStage < MAX_TUNE_STAGE) onProgress?.(1);

  successRate = clamp01(successRate);
  return {
    successRate,
    discards: Array.from({ length: MAX_TUNE_STAGE }, (_, i) => ({
      tuneStage: i + 1,
      discardRate: clamp01(discardRates[i + 1]!),
    })),
    costPerSuccessfulEcho: anySuccessful ? costPerSuccessfulEcho(discardRates, successRate) : null,
    averageSuccessfulEchoScore: anySuccessful ? scoreSum / successRate : null,
    lowestSuccessfulEchoScore: anySuccessful ? lowestScore : null,
  };
}

// A Tune Stage without Rule Groups lets every Echo through.
function passesAnyRuleGroup(
  ruleGroups: readonly (readonly UpgradeRule[])[],
  echo: TunedEcho,
  context: RuleContext,
): boolean {
  return (
    ruleGroups.length === 0 ||
    ruleGroups.some((rules) => rules.every((rule) => passes(rule, echo, context)))
  );
}

function passes(rule: UpgradeRule, echo: TunedEcho, context: RuleContext): boolean {
  switch (rule.kind) {
    case 'substatCount':
      return rule.substatTypes.filter((type) => has(echo.types, type)).length >= rule.count;
    case 'substatRoll': {
      const value = context.valueOf(echo, rule.substatType);
      return value !== null && value >= rule.minValue - THRESHOLD_TOLERANCE;
    }
    case 'echoScore':
      return echo.score >= rule.minEchoScore - THRESHOLD_TOLERANCE;
    case 'targetChance':
      return (
        context.targetChance(echo, rule.targetScore) >=
        rule.minChancePercent / 100 - THRESHOLD_TOLERANCE
      );
  }
}

const NO_COST: TuningCost = { exp: 0, tuners: 0, shellCredits: 0 };

// The expected Tuning Cost per started Echo, divided by the Success Rate.
function costPerSuccessfulEcho(
  discardRates: readonly number[],
  successRate: number,
): CostPerSuccessfulEcho {
  let perStartedEcho = NO_COST;
  for (let tuneStage = 1; tuneStage <= MAX_TUNE_STAGE; tuneStage++)
    perStartedEcho = addTuningCosts(
      perStartedEcho,
      scaleTuningCost(tuningCost(tuneStage, true), discardRates[tuneStage]!),
    );
  perStartedEcho = addTuningCosts(
    perStartedEcho,
    scaleTuningCost(tuningCost(MAX_TUNE_STAGE, false), successRate),
  );
  return { echoes: 1 / successRate, ...scaleTuningCost(perStartedEcho, 1 / successRate) };
}

/** What finishing an Echo adds to its Echo Score: on average, and at least. */
interface ScoreAddedToFinish {
  readonly average: number;
  readonly min: number;
}

/** What the rules of one Upgrade Strategy read besides the Echo, and which parts of it they read from each Tune Stage on. */
class RuleContext {
  readonly #table: SubstatWeightTable;
  readonly #cache: FinishingTableCache;
  // The digit of each Substat type a Substat Roll rule names in TunedEcho.rolls, or -1.
  readonly #rollSlots = new Map<SubstatType, number>();
  // Indexed by Tune Stage, with an extra entry past the last: what rules at that Tune Stage or later read.
  readonly #scoreReadFrom = new Array<boolean>(MAX_TUNE_STAGE + 2).fill(false);
  readonly #slotsReadFrom: Set<number>[] = Array.from(
    { length: MAX_TUNE_STAGE + 2 },
    () => new Set(),
  );
  // Indexed by Tune Stage, then Substat type.
  readonly #rollsAt: Map<SubstatType, PassRoll[]>[];
  readonly #addedToFinish = new Map<number, ScoreAddedToFinish>();

  constructor(
    table: SubstatWeightTable,
    byStage: readonly (readonly (readonly UpgradeRule[])[])[],
    cache: FinishingTableCache,
  ) {
    this.#table = table;
    this.#cache = cache;
    for (let tuneStage = MAX_TUNE_STAGE; tuneStage >= 1; tuneStage--) {
      this.#scoreReadFrom[tuneStage] = this.#scoreReadFrom[tuneStage + 1]!;
      this.#slotsReadFrom[tuneStage] = new Set(this.#slotsReadFrom[tuneStage + 1]);
      for (const rule of byStage[tuneStage]!.flat()) {
        if (rule.kind === 'echoScore' || rule.kind === 'targetChance')
          this.#scoreReadFrom[tuneStage] = true;
        if (rule.kind === 'substatRoll') {
          let slot = this.#rollSlots.get(rule.substatType);
          if (slot === undefined)
            this.#rollSlots.set(rule.substatType, (slot = this.#rollSlots.size));
          this.#slotsReadFrom[tuneStage]!.add(slot);
        }
      }
    }
    this.#rollsAt = Array.from(
      { length: MAX_TUNE_STAGE + 1 },
      (_, tuneStage) =>
        new Map(SUBSTAT_TYPES.map((type) => [type, this.#rollsOf(type, tuneStage)])),
    );
  }

  scoreReadFrom(tuneStage: number): boolean {
    return this.#scoreReadFrom[tuneStage]!;
  }

  /** Only the roll digits a rule at this Tune Stage or later reads. */
  keptRolls(rolls: number, tuneStage: number): number {
    let kept = 0;
    for (const slot of this.#slotsReadFrom[tuneStage]!)
      kept += digitOf(rolls, slot) * ROLL_BASE ** slot;
    return kept;
  }

  rollsAt(tuneStage: number, type: SubstatType): readonly PassRoll[] {
    return this.#rollsAt[tuneStage]!.get(type)!;
  }

  /** Null when the Echo doesn't have the Substat type. */
  valueOf(echo: TunedEcho, type: SubstatType): number | null {
    if (!has(echo.types, type)) return null;
    const index = digitOf(echo.rolls, this.#rollSlots.get(type)!) - 1;
    return possibleRolls(type)[index]!.value;
  }

  finishingTable(types: number): FinishingEchoScores {
    return this.#cache.finishingTable(this.#table, typesOf(types));
  }

  targetChance(echo: TunedEcho, targetScore: number): number {
    return this.finishingTable(echo.types).chanceAtOrAbove(targetScore - echo.score);
  }

  /** What finishing an Echo with these Substat types adds to its Echo Score: on average, and at least. */
  scoreAddedToFinish(types: number): ScoreAddedToFinish {
    let added = this.#addedToFinish.get(types);
    if (!added) {
      added = this.#calculateScoreAddedToFinish(types);
      this.#addedToFinish.set(types, added);
    }
    return added;
  }

  #calculateScoreAddedToFinish(types: number): ScoreAddedToFinish {
    const missing = SUBSTAT_TYPES.filter((type) => !has(types, type));
    const toAdd = MAX_TUNE_STAGE - popCount(types);
    const rolls = missing.map((type) => scoreRolls(type, this.#table));
    // Each missing type is added with the same chance, toAdd of missing.length.
    const rollsSum = rolls.reduce(
      (total, typeRolls) =>
        total + typeRolls.reduce((sum, roll) => sum + roll.score * roll.chance, 0),
      0,
    );
    const average = (toAdd / missing.length) * rollsSum;
    const min = rolls
      .map((typeRolls) => Math.min(...typeRolls.map((roll) => roll.score)))
      .sort((a, b) => a - b)
      .slice(0, toAdd)
      .reduce((sum, score) => sum + score, 0);
    return { average, min };
  }

  // Every distinct value when a rule at this Tune Stage or later reads it; otherwise only what it adds to the Echo Score.
  #rollsOf(type: SubstatType, tuneStage: number): PassRoll[] {
    const slot = this.#rollSlots.get(type);
    if (slot !== undefined && this.#slotsReadFrom[tuneStage]!.has(slot)) {
      return possibleRolls(type).map((roll, index) => ({
        score: substatScore(type, roll.value, this.#table),
        chance: roll.chance,
        rollsPart: (index + 1) * ROLL_BASE ** slot,
      }));
    }
    return scoreRolls(type, this.#table).map((roll) => ({ ...roll, rollsPart: 0 }));
  }
}

function digitOf(rolls: number, slot: number): number {
  return Math.floor(rolls / ROLL_BASE ** slot) % ROLL_BASE;
}
