import { scoreRolls, substatScore } from './echo';
import { averageOf, medianOf, thresholdsOf, type DistributionPoint } from './evaluateEcho';
import { finishingEchoScoresFor, type SortedFinishingEchoScores } from './finishingEchoScores';
import { MAX_TUNE_STAGE, SUBSTAT_TYPES, possibleRolls, type SubstatType } from './gameData';
import { roundTo12Decimals } from './rounding';
import { CompensatedSum, SCORE_TOLERANCE, clamp01, firstAtOrAbove } from './search';
import { RunHeap, type SortedTable } from './sortedTable';
import type { SubstatWeightTable } from './substatWeightTable';
import { tuningCost, type TuningCost } from './tuningCost';
import { ruleGroupsByStage, type UpgradeRule, type UpgradeStrategy } from './upgradeStrategy';

/** What it costs on average to end up with one Successful Echo, counting the Echoes discarded along the way. */
export interface CostPerSuccessfulEcho {
  readonly echoes: number;
  readonly exp: number;
  readonly tuners: number;
  readonly shellCredits: number;
}

/** The Discard Rate at a Tune Stage: the share of all Echoes started that are discarded there. */
export interface TuneStageDiscards {
  readonly tuneStage: number;
  readonly discardRate: number;
}

/**
 * The Echo Scores the Successful Echoes finish with. Each distribution point holds the share of Successful Echoes
 * that finish at or above its threshold; the thresholds run from Worst to Best, picked as Echo Evaluation picks them.
 */
export interface SuccessfulEchoScores {
  readonly best: number;
  readonly worst: number;
  readonly average: number;
  readonly median: number;
  readonly distribution: readonly DistributionPoint[];
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
  readonly successfulEchoScores: SuccessfulEchoScores | null;
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

  clear(): void {
    this.#tables.clear();
  }

  /** The finishing table of an Echo with the Substat types in the bitmask and an Echo Score of 0. */
  finishingTable(table: SubstatWeightTable, types: number): SortedFinishingEchoScores {
    const weights = SUBSTAT_TYPES.map((type) => table.weightOf(type));
    const shared = sharedTypes(types, weights);
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
function sharedTypes(types: number, weights: readonly number[]): number {
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

// Values this close to a threshold reach it, so floating-point summation order never decides a rule.
const RULE_TOLERANCE = 1e-9;

// A shape's rolls hold, per Substat type a Substat Roll rule names, the index of its roll plus one in a base-16 digit.
const ROLL_BASE = 16;

const bit = (type: SubstatType) => 1 << SUBSTAT_TYPES.indexOf(type);
const has = (types: number, type: SubstatType) => (types & bit(type)) !== 0;
const typesOf = (types: number) => SUBSTAT_TYPES.filter((type) => has(types, type));
const popCount = (types: number) => typesOf(types).length;

/** A roll in the forward pass: what it adds to the Echo Score, its chance, and its digit in a shape's rolls. */
interface PassRoll {
  readonly score: number;
  readonly chance: number;
  readonly digits: number;
}

/**
 * The states of the pass that share their Substat types and the roll digits later rules read (the source's TunedEcho
 * without its Echo Score), keyed by the pair of numbers. Its table holds one entry per Echo Score rounded to 12
 * decimals, with columns for the chance, the chance-weighted sum of unrounded Echo Scores and the lowest unrounded Echo
 * Score merged into it. While a later rule reads the Echo Score, an entry is a state of the source's pass; after that,
 * the entries are what the source keeps per state for the Successful Echoes' distribution.
 */
interface Shape {
  readonly types: number;
  readonly rolls: number;
  readonly table: SortedTable;
}

const CHANCE = 0;
const SCORE_SUM = 1;
const MIN_SCORE = 2;

/** Shapes keyed by their Substat types, then by their roll digits. */
class ShapeMap<T> {
  readonly #byTypes = new Map<number, Map<number, T>>();

  get(types: number, rolls: number): T | undefined {
    return this.#byTypes.get(types)?.get(rolls);
  }

  set(types: number, rolls: number, value: T): void {
    let byRolls = this.#byTypes.get(types);
    if (!byRolls) this.#byTypes.set(types, (byRolls = new Map()));
    byRolls.set(rolls, value);
  }

  *entries(): Generator<[types: number, rolls: number, value: T]> {
    for (const [types, byRolls] of this.#byTypes)
      for (const [rolls, value] of byRolls) yield [types, rolls, value];
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
  let shapes: Shape[] = [
    {
      types: 0,
      rolls: 0,
      table: {
        scores: Float64Array.of(0),
        columns: [Float64Array.of(1), Float64Array.of(0), Float64Array.of(0)],
      },
    },
  ];
  const discards = Array.from({ length: MAX_TUNE_STAGE + 1 }, () => new CompensatedSum());

  for (let tuneStage = 1; tuneStage <= lastRuleStage; tuneStage++) {
    const ruleGroups = context.ruleGroupsAt(tuneStage);
    const typeChance = 1.0 / (SUBSTAT_TYPES.length - tuneStage + 1);
    const next = new ShapeMap<Run[]>();

    for (const shape of shapes) {
      signal?.throwIfAborted();
      const chanceBelow = chancesBelow(shape.table);
      const length = shape.table.scores.length;
      for (const type of SUBSTAT_TYPES) {
        if (has(shape.types, type)) continue;
        const types = shape.types | bit(type);
        for (const roll of context.rollsAt(tuneStage, type)) {
          const rolls = shape.rolls + roll.digits;
          const chance = typeChance * roll.chance;
          // Rule Groups whose Substat Count and Substat Roll rules pass; their other rules read the Echo Score.
          const scoreGroups: CompiledGroup[] = [];
          let passesAll = ruleGroups.length === 0;
          for (const group of ruleGroups) {
            if (!group.shapeRules.every((rule) => rule(types, rolls))) continue;
            if (group.scoreRules.length === 0) passesAll = true;
            else scoreGroups.push(group);
          }
          let start = length;
          if (passesAll) start = 0;
          else if (scoreGroups.length > 0)
            start = firstPassing(shape.table.scores, roll.score, (score) =>
              scoreGroups.some((group) => group.scoreRules.every((rule) => rule(types, score))),
            );
          discards[tuneStage]!.add(chance * chanceBelow[start]!);
          if (start === length) continue;

          const keptRolls = context.keptRolls(rolls, tuneStage + 1);
          let runs = next.get(types, keptRolls);
          if (!runs) next.set(types, keptRolls, (runs = []));
          runs.push({ table: shape.table, start, shift: roll.score, chance });
        }
      }
    }

    shapes = [];
    for (const [types, rolls, runs] of next.entries())
      shapes.push({ types, rolls, table: mergedRuns(runs) });
    onProgress?.(tuneStage / MAX_TUNE_STAGE);
  }

  // No rule reads the Tune Stages after the last one with rules, so every state left is Successful, and finishes with
  // any of the missing types.
  signal?.throwIfAborted();
  const successSum = new CompensatedSum();
  const scoreSum = new CompensatedSum();
  let lowestScore = Number.MAX_VALUE;
  for (const { types, table: shapeTable } of shapes) {
    const { average, min } = context.scoreAddedToFinish(types);
    const chances = shapeTable.columns[CHANCE]!;
    const sums = shapeTable.columns[SCORE_SUM]!;
    const mins = shapeTable.columns[MIN_SCORE]!;
    for (let i = 0; i < chances.length; i++) {
      successSum.add(chances[i]!);
      scoreSum.add(sums[i]! + chances[i]! * average);
      lowestScore = Math.min(lowestScore, mins[i]! + min);
    }
  }
  const anySuccessful = shapes.length > 0;
  const successfulEchoScores = anySuccessful
    ? successfulEchoScoresOf(shapes, context, signal)
    : null;
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
    successfulEchoScores,
  };
}

// The chance of a shape's entries below each index, with the total last.
function chancesBelow(table: SortedTable): Float64Array {
  const chances = table.columns[CHANCE]!;
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
 * up, so the entries that pass are a suffix of the ascending table, found by bisection.
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

/** A shape's entries from `start` on, after a roll that adds `shift` to the Echo Score, with the roll's chance. */
interface Run {
  readonly table: SortedTable;
  readonly start: number;
  readonly shift: number;
  readonly chance: number;
}

/**
 * The runs that tune into one shape, merged: each entry's Echo Score is rounded to 12 decimals, which keeps a run in
 * order, and entries with exactly equal Echo Scores combine.
 */
function mergedRuns(runs: readonly Run[]): SortedTable {
  const count = runs.length;
  const runScores = runs.map((run) => run.table.scores);
  const runChances = runs.map((run) => run.table.columns[CHANCE]!);
  const runSums = runs.map((run) => run.table.columns[SCORE_SUM]!);
  const runMins = runs.map((run) => run.table.columns[MIN_SCORE]!);
  const shifts = Float64Array.from(runs, (run) => run.shift);
  const rollChances = Float64Array.from(runs, (run) => run.chance);
  const at = Int32Array.from(runs, (run) => run.start);
  let capacity = 0;
  for (const run of runs) capacity += run.table.scores.length - run.start;
  const scores = new Float64Array(capacity);
  const chances = new Float64Array(capacity);
  const sums = new Float64Array(capacity);
  const mins = new Float64Array(capacity);
  const heap = new RunHeap(count);
  for (let r = 0; r < count; r++)
    heap.push(r, roundTo12Decimals(runScores[r]![at[r]!]! + shifts[r]!));
  let n = -1;
  let last = NaN;
  while (heap.size > 0) {
    const r = heap.topRun;
    const score = heap.topKey;
    const i = at[r]!;
    const shift = shifts[r]!;
    const chance = rollChances[r]!;
    const entryChance = runChances[r]![i]!;
    const keptChance = entryChance * chance;
    const keptSum = (runSums[r]![i]! + entryChance * shift) * chance;
    const keptMin = runMins[r]![i]! + shift;
    if (score === last) {
      chances[n]! += keptChance;
      sums[n]! += keptSum;
      if (keptMin < mins[n]!) mins[n] = keptMin;
    } else {
      scores[++n] = last = score;
      chances[n] = keptChance;
      sums[n] = keptSum;
      mins[n] = keptMin;
    }
    const source = runScores[r]!;
    if (i + 1 < source.length) {
      at[r] = i + 1;
      heap.advanceTop(roundTo12Decimals(source[i + 1]! + shift));
    } else heap.popTop();
  }
  const length = n + 1;
  return {
    scores: scores.slice(0, length),
    columns: [chances.slice(0, length), sums.slice(0, length), mins.slice(0, length)],
  };
}

// The expected Tuning Cost per started Echo, divided by the Success Rate.
function costPerSuccessfulEcho(
  discardRates: readonly number[],
  successRate: number,
): CostPerSuccessfulEcho {
  let exp = 0;
  let tuners = 0;
  let shellCredits = 0;
  const add = (cost: TuningCost, rate: number) => {
    exp += cost.exp * rate;
    tuners += cost.tuners * rate;
    shellCredits += cost.shellCredits * rate;
  };
  for (let tuneStage = 1; tuneStage <= MAX_TUNE_STAGE; tuneStage++)
    add(tuningCost(tuneStage, true), discardRates[tuneStage]!);
  add(tuningCost(MAX_TUNE_STAGE, false), successRate);
  return {
    echoes: 1 / successRate,
    exp: exp / successRate,
    tuners: tuners / successRate,
    shellCredits: shellCredits / successRate,
  };
}

// The source returns no distribution; this follows the golden exporter's SuccessfulEchoScores. Each Substat type set
// is finished once, from an Echo Score of 0, and shifted by every Echo Score of the states with that set; the final
// Echo Scores are rounded to 12 decimals so that those differing only by summation order merge. Shifting the sets that
// share a finishing table together gives exactly the same Echo Scores.
function successfulEchoScoresOf(
  shapes: readonly Shape[],
  context: RuleContext,
  signal: AbortSignal | undefined,
): SuccessfulEchoScores {
  // Type sets that share a finishing table are finished together.
  const currentByFinishing = new Map<SortedFinishingEchoScores, ShiftedRun[]>();
  for (const { types, table } of shapes) {
    const finishing = context.finishingTable(types);
    let current = currentByFinishing.get(finishing);
    if (!current) currentByFinishing.set(finishing, (current = []));
    current.push({ scores: table.scores, chances: table.columns[CHANCE]!, shift: 0, scale: 1 });
  }
  const finalRuns: ShiftedRun[] = [];
  for (const [finishing, runs] of currentByFinishing) {
    signal?.throwIfAborted();
    const current = mergedShiftedRuns(runs, false);
    // Every pair of a current and a finishing Echo Score; the one with fewer entries shifts the other.
    const [shifts, shifted] =
      current.scores.length <= finishing.scores.length
        ? [current, finishing]
        : [finishing, current];
    for (let i = 0; i < shifts.scores.length; i++)
      finalRuns.push({
        scores: shifted.scores,
        chances: shifted.chances,
        shift: shifts.scores[i]!,
        scale: shifts.chances[i]!,
      });
  }
  signal?.throwIfAborted();
  const { scores, chances: summed } = mergedShiftedRuns(finalRuns, true);

  let total = 0;
  for (const chance of summed) total += chance;
  const chances = summed.map((chance) => chance / total);
  const atOrAbove = new Float64Array(scores.length + 1);
  for (let i = scores.length - 1; i >= 0; i--) atOrAbove[i] = atOrAbove[i + 1]! + chances[i]!;
  const chanceAtOrAbove = (score: number) =>
    clamp01(atOrAbove[firstAtOrAbove(scores, score - SCORE_TOLERANCE)]!);

  return {
    best: scores.at(-1)!,
    worst: scores[0]!,
    average: averageOf(scores, chances),
    median: medianOf(scores, chances),
    distribution: thresholdsOf(scores).map((threshold) => ({
      threshold,
      chance: chanceAtOrAbove(threshold),
    })),
  };
}

/** Ascending Echo Scores with their chances, all shifted by an Echo Score and scaled by a chance. */
interface ShiftedRun {
  readonly scores: Float64Array;
  readonly chances: Float64Array;
  readonly shift: number;
  readonly scale: number;
}

/** The runs merged, combining exactly equal Echo Scores; rounded to 12 decimals after the shift when asked. */
function mergedShiftedRuns(
  runs: readonly ShiftedRun[],
  round: boolean,
): { scores: Float64Array; chances: Float64Array } {
  const scoreOf = (run: ShiftedRun, i: number) =>
    round ? roundTo12Decimals(run.shift + run.scores[i]!) : run.shift + run.scores[i]!;
  let capacity = 0;
  for (const run of runs) capacity += run.scores.length;
  const scores = new Float64Array(capacity);
  const chances = new Float64Array(capacity);
  const at = new Int32Array(runs.length);
  const heap = new RunHeap(runs.length);
  runs.forEach((run, r) => {
    if (run.scores.length > 0) heap.push(r, scoreOf(run, 0));
  });
  let n = -1;
  let last = NaN;
  while (heap.size > 0) {
    const r = heap.topRun;
    const score = heap.topKey;
    const run = runs[r]!;
    const i = at[r]!;
    const chance = run.scale * run.chances[i]!;
    if (score === last) chances[n]! += chance;
    else {
      scores[++n] = last = score;
      chances[n] = chance;
    }
    if (i + 1 < run.scores.length) {
      at[r] = i + 1;
      heap.advanceTop(scoreOf(run, i + 1));
    } else heap.popTop();
  }
  return { scores: scores.slice(0, n + 1), chances: chances.slice(0, n + 1) };
}

type ShapeRule = (types: number, rolls: number) => boolean;
type ScoreRule = (types: number, score: number) => boolean;

/** A Rule Group split into the rules that read only the Substat types and rolls, and those that read the Echo Score. */
interface CompiledGroup {
  readonly shapeRules: readonly ShapeRule[];
  readonly scoreRules: readonly ScoreRule[];
}

/** What the rules of one Upgrade Strategy read besides the Echo, and which parts of it they read from each Tune Stage on. */
class RuleContext {
  readonly #table: SubstatWeightTable;
  readonly #cache: FinishingTableCache;
  // The digit of each Substat type a Substat Roll rule names in a shape's rolls.
  readonly #rollSlots = new Map<SubstatType, number>();
  // Indexed by Tune Stage, with an extra entry past the last: the roll digits rules at that Tune Stage or later read.
  readonly #slotsReadFrom: Set<number>[] = Array.from(
    { length: MAX_TUNE_STAGE + 2 },
    () => new Set(),
  );
  // Indexed by Tune Stage, then Substat type.
  readonly #rollsAt: Map<SubstatType, PassRoll[]>[];
  readonly #ruleGroupsAt: CompiledGroup[][];
  readonly #finishing = new Map<number, SortedFinishingEchoScores>();
  readonly #addedToFinish = new Map<number, { average: number; min: number }>();

  constructor(
    table: SubstatWeightTable,
    byStage: readonly (readonly (readonly UpgradeRule[])[])[],
    cache: FinishingTableCache,
  ) {
    this.#table = table;
    this.#cache = cache;
    for (let tuneStage = MAX_TUNE_STAGE; tuneStage >= 1; tuneStage--) {
      this.#slotsReadFrom[tuneStage] = new Set(this.#slotsReadFrom[tuneStage + 1]);
      for (const rule of byStage[tuneStage]!.flat()) {
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

  finishingTable(types: number): SortedFinishingEchoScores {
    let finishing = this.#finishing.get(types);
    if (!finishing) {
      finishing = this.#cache.finishingTable(this.#table, types);
      this.#finishing.set(types, finishing);
    }
    return finishing;
  }

  /** What finishing an Echo with these Substat types adds to its Echo Score: on average, and at least. */
  scoreAddedToFinish(types: number): { average: number; min: number } {
    let added = this.#addedToFinish.get(types);
    if (!added) {
      added = this.#calculateScoreAddedToFinish(types);
      this.#addedToFinish.set(types, added);
    }
    return added;
  }

  #compile(rules: readonly UpgradeRule[]): CompiledGroup {
    const shapeRules: ShapeRule[] = [];
    const scoreRules: ScoreRule[] = [];
    for (const rule of rules) {
      switch (rule.kind) {
        case 'substatCount': {
          const bits = rule.substatTypes.map(bit);
          shapeRules.push((types) => {
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
              (roll) => roll.value >= minValue - RULE_TOLERANCE,
            ) + 1;
          shapeRules.push(
            (types, rolls) =>
              (types & typeBit) !== 0 && lowestDigit > 0 && digitOf(rolls, slot) >= lowestDigit,
          );
          break;
        }
        case 'echoScore': {
          const lowest = rule.minEchoScore - RULE_TOLERANCE;
          scoreRules.push((_, score) => score >= lowest);
          break;
        }
        case 'targetChance': {
          const { targetScore } = rule;
          const lowest = rule.minChancePercent / 100 - RULE_TOLERANCE;
          scoreRules.push(
            (types, score) =>
              this.finishingTable(types).chanceAtOrAbove(targetScore - score) >= lowest,
          );
          break;
        }
      }
    }
    return { shapeRules, scoreRules };
  }

  #calculateScoreAddedToFinish(types: number): { average: number; min: number } {
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
        digits: (index + 1) * ROLL_BASE ** slot,
      }));
    }
    return scoreRolls(type, this.#table).map((roll) => ({ ...roll, digits: 0 }));
  }
}

function digitOf(rolls: number, slot: number): number {
  return Math.floor(rolls / ROLL_BASE ** slot) % ROLL_BASE;
}
