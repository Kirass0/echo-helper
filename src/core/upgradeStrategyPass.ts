import { scoreRolls, substatScore } from './echo';
import { finishingEchoScoresFor, type SortedFinishingEchoScores } from './finishingEchoScores';
import { MAX_TUNE_STAGE, SUBSTAT_TYPES, possibleRolls, type SubstatType } from './gameData';
import { CompensatedSum, THRESHOLD_TOLERANCE, clamp01 } from './search';
import { roundTo12Decimals } from './rounding';
import { RunHeap } from './sortedTable';
import type { SubstatWeightTable } from './substatWeightTable';
import { addTuningCosts, scaleTuningCost, tuningCost, type TuningCost } from './tuningCost';
import { ruleGroupsByStage, type UpgradeRule, type UpgradeStrategy } from './upgradeStrategy';

/**
 * What it costs on average to end up with one Successful Echo, counting the Echoes discarded along the way: the
 * Echoes started, and their Tuning Cost.
 */
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
 *
 * Substat types weighted 0 add exactly 0 to every Echo Score, so type sets that differ only in which of them they hold
 * (Energy Regen aside, which the table tracks) have the same finishing table, and share it.
 */
export class FinishingTableCache {
  readonly #tables = new Map<string, SortedFinishingEchoScores>();

  /** How many finishing tables have been built. */
  get size(): number {
    return this.#tables.size;
  }

  /** How many Echo Scores the finishing tables hold, over all of them. */
  get entries(): number {
    let entries = 0;
    for (const table of this.#tables.values()) entries += table.scores.length;
    return entries;
  }

  clear(): void {
    this.#tables.clear();
  }

  /** The finishing table of an Echo with these Substat types and an Echo Score of 0. */
  finishingTable(
    table: SubstatWeightTable,
    types: readonly SubstatType[],
  ): SortedFinishingEchoScores {
    const weights = SUBSTAT_TYPES.map((type) => table.weightOf(type));
    const shared = sharedTypes(typeSetOf(types), weights);
    const key = `${weights.join(',')}|${shared}`;
    let finishing = this.#tables.get(key);
    if (!finishing) {
      finishing = finishingEchoScoresFor(typesOf(shared), 0, table);
      this.#tables.set(key, finishing);
    }
    return finishing;
  }
}

/**
 * The type set whose finishing table a type set shares: its Substat types weighted 0, other than Energy Regen, are
 * replaced by as many of the first such types.
 */
function sharedTypes(types: TypeSet, weights: readonly number[]): TypeSet {
  let shared = types;
  let unweighted = 0;
  SUBSTAT_TYPES.forEach((type, i) => {
    if (weights[i] !== 0 || type === 'Energy_Regen') return;
    if ((types & (1 << i)) !== 0) unweighted++;
    shared &= ~(1 << i);
  });
  SUBSTAT_TYPES.forEach((type, i) => {
    if (unweighted === 0 || weights[i] !== 0 || type === 'Energy_Regen') return;
    shared |= 1 << i;
    unweighted--;
  });
  return shared;
}

export interface UpgradeStrategyOptions {
  /** Aborting it stops the calculation with the signal's reason (an `AbortError` by default). */
  readonly signal?: AbortSignal | undefined;
  /** Called with the share done, in (0, 1], after each Tune Stage up to the last one with rules, and with 1 at the end. */
  readonly onProgress?: ((progress: number) => void) | undefined;
  /** The finishing tables to reuse; without it, each calculation builds its own. */
  readonly cache?: FinishingTableCache | undefined;
}

// A roll key holds, per Substat type a Substat Roll rule names, the index of its roll plus one in a base-16 digit.
const ROLL_BASE = 16;

/** A set of Substat types as bits, bit i for SUBSTAT_TYPES[i]. */
type TypeSet = number;

const bit = (type: SubstatType): TypeSet => 1 << SUBSTAT_TYPES.indexOf(type);
const has = (types: TypeSet, type: SubstatType) => (types & bit(type)) !== 0;
const typesOf = (types: TypeSet) => SUBSTAT_TYPES.filter((type) => has(types, type));
const typeSetOf = (types: readonly SubstatType[]): TypeSet =>
  types.reduce((set, type) => set | bit(type), 0);
const popCount = (types: TypeSet) => typesOf(types).length;

/**
 * A roll in the forward pass: what it adds to the Echo Score, its chance, and what it adds to a roll key (its digit in
 * its Substat type's place, or 0 when no later rule reads its value).
 */
interface PassRoll {
  readonly score: number;
  readonly chance: number;
  readonly rollKeyPart: number;
}

/**
 * The states of the pass at one Tune Stage, one entry per Echo Score rounded to 12 decimals (ascending), with the
 * chance, the chance-weighted sum of unrounded Echo Scores and the lowest unrounded Echo Score merged into it. Once no
 * later rule reads the Echo Score, there is a single entry with an Echo Score of 0, as the source keys its states.
 */
interface StateEntries {
  readonly scores: Float64Array;
  readonly chances: Float64Array;
  readonly scoreSums: Float64Array;
  readonly minScores: Float64Array;
}

/**
 * The states of the pass that share their Substat types and the roll digits later rules read (the source's TunedEcho
 * without its Echo Score), with their entries per Echo Score.
 */
interface StateGroup {
  readonly types: TypeSet;
  /** The roll digits later rules read; see ROLL_BASE. */
  readonly rollKey: number;
  readonly entries: StateEntries;
}

/** State groups keyed by their Substat types, then by their roll key. */
class StateGroupMap<T> {
  readonly #byTypes = new Map<TypeSet, Map<number, T>>();

  get(types: TypeSet, rollKey: number): T | undefined {
    return this.#byTypes.get(types)?.get(rollKey);
  }

  set(types: TypeSet, rollKey: number, value: T): void {
    let byRollKey = this.#byTypes.get(types);
    if (!byRollKey) this.#byTypes.set(types, (byRollKey = new Map()));
    byRollKey.set(rollKey, value);
  }

  *entries(): Generator<[types: TypeSet, rollKey: number, value: T]> {
    for (const [types, byRollKey] of this.#byTypes)
      for (const [rollKey, value] of byRollKey) yield [types, rollKey, value];
  }
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
  let groups: StateGroup[] = [{ types: 0, rollKey: 0, entries: singleEntry(1, 0, 0) }];
  const discards = Array.from({ length: MAX_TUNE_STAGE + 1 }, () => new CompensatedSum());

  for (let tuneStage = 1; tuneStage <= lastRuleStage; tuneStage++) {
    const ruleGroups = context.ruleGroupsAt(tuneStage);
    const keepsScore = context.scoreReadFrom(tuneStage + 1);
    const typeChance = 1.0 / (SUBSTAT_TYPES.length - tuneStage + 1);
    const next = new StateGroupMap<Run[]>();

    for (const group of groups) {
      signal?.throwIfAborted();
      const { entries } = group;
      const chanceBelow = chancesBelow(entries.chances);
      const length = entries.scores.length;
      for (const type of SUBSTAT_TYPES) {
        if (has(group.types, type)) continue;
        const types = group.types | bit(type);
        for (const roll of context.rollsAt(tuneStage, type)) {
          const rollKey = group.rollKey + roll.rollKeyPart;
          const chance = typeChance * roll.chance;
          // Rule Groups whose Substat Count and Substat Roll rules pass; their other rules read the Echo Score.
          const scoreGroups: CompiledGroup[] = [];
          let passesAll = ruleGroups.length === 0;
          for (const ruleGroup of ruleGroups) {
            if (!ruleGroup.keyRules.every((rule) => rule(types, rollKey))) continue;
            if (ruleGroup.scoreRules.length === 0) passesAll = true;
            else scoreGroups.push(ruleGroup);
          }
          let start = length;
          if (passesAll) start = 0;
          else if (scoreGroups.length > 0)
            start = firstPassing(entries.scores, roll.score, (score) =>
              scoreGroups.some((ruleGroup) =>
                ruleGroup.scoreRules.every((rule) => rule(types, score)),
              ),
            );
          discards[tuneStage]!.add(chance * chanceBelow[start]!);
          if (start === length) continue;

          const keptRollKey = context.keptRollKey(rollKey, tuneStage + 1);
          let runs = next.get(types, keptRollKey);
          if (!runs) next.set(types, keptRollKey, (runs = []));
          runs.push({ entries, start, shift: roll.score, chance });
        }
      }
    }

    groups = [];
    for (const [types, rollKey, runs] of next.entries())
      groups.push({ types, rollKey, entries: keepsScore ? mergedRuns(runs) : collapsedRuns(runs) });
    onProgress?.(tuneStage / MAX_TUNE_STAGE);
  }

  // No rule reads the Tune Stages after the last one with rules, so every state left is Successful, and finishes with
  // any of the missing types.
  signal?.throwIfAborted();
  const successSum = new CompensatedSum();
  const scoreSum = new CompensatedSum();
  let lowestScore = Number.MAX_VALUE;
  for (const { types, entries } of groups) {
    const added = context.scoreAddedToFinish(types);
    const { chances, scoreSums, minScores } = entries;
    for (let i = 0; i < chances.length; i++) {
      successSum.add(chances[i]!);
      scoreSum.add(scoreSums[i]! + chances[i]! * added.average);
      lowestScore = Math.min(lowestScore, minScores[i]! + added.min);
    }
  }
  const anySuccessful = groups.length > 0;
  if (lastRuleStage < MAX_TUNE_STAGE) onProgress?.(1);

  const successRate = clamp01(successSum.value);
  const discardRates = discards.map((sum) => sum.value);
  return {
    successRate,
    discards: Array.from({ length: MAX_TUNE_STAGE }, (_, i) => ({
      tuneStage: i + 1,
      discardRate: clamp01(discardRates[i + 1]!),
    })),
    costPerSuccessfulEcho: anySuccessful ? costPerSuccessfulEcho(discardRates, successRate) : null,
    averageSuccessfulEchoScore: anySuccessful ? scoreSum.value / successSum.value : null,
    lowestSuccessfulEchoScore: anySuccessful ? lowestScore : null,
  };
}

function singleEntry(chance: number, scoreSum: number, minScore: number): StateEntries {
  return {
    scores: Float64Array.of(0),
    chances: Float64Array.of(chance),
    scoreSums: Float64Array.of(scoreSum),
    minScores: Float64Array.of(minScore),
  };
}

// The chance of the entries below each index, with the total last.
function chancesBelow(chances: Float64Array): Float64Array {
  const below = new Float64Array(chances.length + 1);
  const sum = new CompensatedSum();
  for (let i = 0; i < chances.length; i++) {
    sum.add(chances[i]!);
    below[i + 1] = sum.value;
  }
  return below;
}

/**
 * The first entry whose Echo Score plus a roll passes. Echo Score and Target Chance rules pass from some Echo Score
 * up, so the entries that pass are a suffix of the ascending entries, found by bisection.
 */
function firstPassing(
  scores: Float64Array,
  rollScore: number,
  passes: (score: number) => boolean,
): number {
  let low = 0;
  let high = scores.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (passes(scores[middle]! + rollScore)) high = middle;
    else low = middle + 1;
  }
  return low;
}

/** A state group's entries from `start` on, after a roll that adds `shift` to the Echo Score, with the roll's chance. */
interface Run {
  readonly entries: StateEntries;
  readonly start: number;
  readonly shift: number;
  readonly chance: number;
}

/**
 * The runs that tune into one state group, merged: each entry's Echo Score is rounded to 12 decimals, which keeps a
 * run in order, and entries with exactly equal Echo Scores combine.
 */
function mergedRuns(runs: readonly Run[]): StateEntries {
  const count = runs.length;
  const runEntries = runs.map((run) => run.entries);
  const shifts = Float64Array.from(runs, (run) => run.shift);
  const rollChances = Float64Array.from(runs, (run) => run.chance);
  const at = Int32Array.from(runs, (run) => run.start);
  let capacity = 0;
  for (const run of runs) capacity += run.entries.scores.length - run.start;
  const scores = new Float64Array(capacity);
  const chances = new Float64Array(capacity);
  const scoreSums = new Float64Array(capacity);
  const minScores = new Float64Array(capacity);
  const heap = new RunHeap(count);
  for (let r = 0; r < count; r++)
    heap.push(r, roundTo12Decimals(runEntries[r]!.scores[at[r]!]! + shifts[r]!));
  let n = -1;
  let last = NaN;
  while (heap.size > 0) {
    const r = heap.topRun;
    const score = heap.topKey;
    const entries = runEntries[r]!;
    const i = at[r]!;
    const shift = shifts[r]!;
    const chance = rollChances[r]!;
    const entryChance = entries.chances[i]!;
    const keptChance = entryChance * chance;
    const keptSum = (entries.scoreSums[i]! + entryChance * shift) * chance;
    const keptMin = entries.minScores[i]! + shift;
    if (score === last) {
      chances[n]! += keptChance;
      scoreSums[n]! += keptSum;
      if (keptMin < minScores[n]!) minScores[n] = keptMin;
    } else {
      scores[++n] = last = score;
      chances[n] = keptChance;
      scoreSums[n] = keptSum;
      minScores[n] = keptMin;
    }
    if (i + 1 < entries.scores.length) {
      at[r] = i + 1;
      heap.advanceTop(roundTo12Decimals(entries.scores[i + 1]! + shift));
    } else heap.popTop();
  }
  const length = n + 1;
  return {
    scores: scores.slice(0, length),
    chances: chances.slice(0, length),
    scoreSums: scoreSums.slice(0, length),
    minScores: minScores.slice(0, length),
  };
}

/** The runs that tune into one state group, combined into one entry with an Echo Score of 0, as no later rule reads it. */
function collapsedRuns(runs: readonly Run[]): StateEntries {
  let chanceSum = 0;
  let scoreSum = 0;
  let minScore = Infinity;
  for (const { entries, start, shift, chance } of runs) {
    for (let i = start; i < entries.scores.length; i++) {
      const entryChance = entries.chances[i]!;
      chanceSum += entryChance * chance;
      scoreSum += (entries.scoreSums[i]! + entryChance * shift) * chance;
      minScore = Math.min(minScore, entries.minScores[i]! + shift);
    }
  }
  return singleEntry(chanceSum, scoreSum, minScore);
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

type KeyRule = (types: TypeSet, rollKey: number) => boolean;
type ScoreRule = (types: TypeSet, score: number) => boolean;

/**
 * A Rule Group split into the rules that read only the Substat types and the roll key, and those that read the Echo
 * Score.
 */
interface CompiledGroup {
  readonly keyRules: readonly KeyRule[];
  readonly scoreRules: readonly ScoreRule[];
}

/** What the rules of one Upgrade Strategy read besides the Echo, and which parts of it they read from each Tune Stage on. */
class RuleContext {
  readonly #table: SubstatWeightTable;
  readonly #cache: FinishingTableCache;
  // The digit of each Substat type a Substat Roll rule names in a roll key.
  readonly #rollSlots = new Map<SubstatType, number>();
  // Indexed by Tune Stage, with an extra entry past the last: what rules at that Tune Stage or later read.
  readonly #scoreReadFrom = new Array<boolean>(MAX_TUNE_STAGE + 2).fill(false);
  readonly #slotsReadFrom: Set<number>[] = Array.from(
    { length: MAX_TUNE_STAGE + 2 },
    () => new Set(),
  );
  // Indexed by Tune Stage, then Substat type.
  readonly #rollsAt: Map<SubstatType, PassRoll[]>[];
  readonly #ruleGroupsAt: CompiledGroup[][];
  readonly #finishing = new Map<TypeSet, SortedFinishingEchoScores>();
  readonly #addedToFinish = new Map<TypeSet, ScoreAddedToFinish>();

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
    this.#ruleGroupsAt = byStage.map((groups) => groups.map((rules) => this.#compile(rules)));
  }

  ruleGroupsAt(tuneStage: number): readonly CompiledGroup[] {
    return this.#ruleGroupsAt[tuneStage]!;
  }

  /** Whether a rule at this Tune Stage or later reads the Echo Score. */
  scoreReadFrom(tuneStage: number): boolean {
    return this.#scoreReadFrom[tuneStage]!;
  }

  /** Only the roll digits a rule at this Tune Stage or later reads. */
  keptRollKey(rollKey: number, tuneStage: number): number {
    let kept = 0;
    for (const slot of this.#slotsReadFrom[tuneStage]!)
      kept += digitOf(rollKey, slot) * ROLL_BASE ** slot;
    return kept;
  }

  rollsAt(tuneStage: number, type: SubstatType): readonly PassRoll[] {
    return this.#rollsAt[tuneStage]!.get(type)!;
  }

  finishingTable(types: TypeSet): SortedFinishingEchoScores {
    let finishing = this.#finishing.get(types);
    if (!finishing) {
      finishing = this.#cache.finishingTable(this.#table, typesOf(types));
      this.#finishing.set(types, finishing);
    }
    return finishing;
  }

  scoreAddedToFinish(types: TypeSet): ScoreAddedToFinish {
    let added = this.#addedToFinish.get(types);
    if (!added) {
      added = this.#calculateScoreAddedToFinish(types);
      this.#addedToFinish.set(types, added);
    }
    return added;
  }

  #compile(rules: readonly UpgradeRule[]): CompiledGroup {
    const keyRules: KeyRule[] = [];
    const scoreRules: ScoreRule[] = [];
    for (const rule of rules) {
      switch (rule.kind) {
        case 'substatCount': {
          const bits = rule.substatTypes.map(bit);
          keyRules.push((types) => {
            let count = 0;
            for (const typeBit of bits) if ((types & typeBit) !== 0) count++;
            return count >= rule.count;
          });
          break;
        }
        case 'substatRoll': {
          const { substatType, minValue } = rule;
          const typeBit = bit(substatType);
          const slot = this.#rollSlots.get(substatType)!;
          // The roll digits (index plus one) whose value reaches the threshold; values are ascending.
          const lowestDigit =
            possibleRolls(substatType).findIndex(
              (roll) => roll.value >= minValue - THRESHOLD_TOLERANCE,
            ) + 1;
          keyRules.push(
            (types, rollKey) =>
              (types & typeBit) !== 0 && lowestDigit > 0 && digitOf(rollKey, slot) >= lowestDigit,
          );
          break;
        }
        case 'echoScore': {
          const lowest = rule.minEchoScore - THRESHOLD_TOLERANCE;
          scoreRules.push((_, score) => score >= lowest);
          break;
        }
        case 'targetChance': {
          const { targetScore } = rule;
          const lowest = rule.minChancePercent / 100 - THRESHOLD_TOLERANCE;
          scoreRules.push(
            (types, score) =>
              this.finishingTable(types).chanceAtOrAbove(targetScore - score) >= lowest,
          );
          break;
        }
      }
    }
    return { keyRules, scoreRules };
  }

  #calculateScoreAddedToFinish(types: TypeSet): ScoreAddedToFinish {
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
        rollKeyPart: (index + 1) * ROLL_BASE ** slot,
      }));
    }
    return scoreRolls(type, this.#table).map((roll) => ({ ...roll, rollKeyPart: 0 }));
  }
}

function digitOf(rollKey: number, slot: number): number {
  return Math.floor(rollKey / ROLL_BASE ** slot) % ROLL_BASE;
}
