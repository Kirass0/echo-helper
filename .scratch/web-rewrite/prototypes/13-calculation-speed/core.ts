// THROWAWAY benchmark port of the hot paths of the C# Core (source commit 53ce242):
// Echo (rolls), EchoValueDistribution, FinishingEchoValues, EchoCalculator.EvaluateEcho, UpgradeStrategyPass.
// Not proven equal; written to do the same amount of work. Do not reuse.

export const TYPES = [
  'Atk_Percent', 'Atk_Flat', 'Def_Percent', 'Def_Flat', 'Hp_Percent', 'Hp_Flat',
  'Basic_Attack', 'Skill', 'Heavy', 'Liberation', 'Energy_Regen', 'Critical_Rate', 'Critical_Damage',
] as const;
export type SubstatType = (typeof TYPES)[number];
export const ER = TYPES.indexOf('Energy_Regen');
export const MAX = 5;
const TOL = 1e-9;

const REF: Record<SubstatType, number> = {
  Atk_Percent: 8.6, Atk_Flat: 40, Def_Percent: 10.9, Def_Flat: 50, Hp_Percent: 8.6, Hp_Flat: 430,
  Basic_Attack: 8.6, Skill: 8.6, Heavy: 8.6, Liberation: 8.6, Energy_Regen: 9.2, Critical_Rate: 7.5, Critical_Damage: 15,
};
const W = [680, 777, 2039, 2428, 1748, 1457, 582, 291];
const WC = [2333, 2333, 2333, 800, 800, 800, 300, 300];
const STD = [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6];
const VALUES: Record<SubstatType, number[]> = {
  Critical_Rate: [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5],
  Critical_Damage: [12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21],
  Hp_Flat: [320, 360, 390, 430, 470, 510, 540, 580],
  Def_Percent: [8.1, 9, 10, 10.9, 11.8, 12.8, 13.8, 14.7],
  Energy_Regen: [6.8, 7.6, 8.4, 9.2, 10, 10.8, 11.6, 12.4],
  Atk_Flat: [30, 30, 40, 40, 50, 50, 60, 60],
  Def_Flat: [40, 40, 50, 50, 60, 60, 70, 70],
  Atk_Percent: STD, Hp_Percent: STD, Liberation: STD, Skill: STD, Heavy: STD, Basic_Attack: STD,
};

export interface PossibleRoll { value: number; chance: number }
const POSSIBLE: PossibleRoll[][] = TYPES.map(t => {
  const w = t === 'Critical_Rate' || t === 'Critical_Damage' ? WC : W;
  const total = w.reduce((a, b) => a + b, 0);
  const byValue = new Map<number, number>();
  VALUES[t].forEach((v, tier) => byValue.set(v, (byValue.get(v) ?? 0) + w[tier]));
  return [...byValue].map(([value, sum]) => ({ value, chance: sum / total }));
});
export const possibleRolls = (type: number) => POSSIBLE[type];

export type Weights = Float64Array; // indexed like TYPES
export interface Table { name: string; weights: Weights }
export function tableOf(name: string, weights: Partial<Record<string, number>>): Table {
  return { name, weights: Float64Array.from(TYPES, t => weights[t] ?? 0) };
}

export const echoValueOf = (type: number, value: number, table: Table) => table.weights[type] * (value / REF[TYPES[type]]);

export function echoValueRolls(type: number, table: Table): { ev: number; chance: number }[] {
  const m = new Map<number, number>();
  for (const r of POSSIBLE[type]) {
    const ev = echoValueOf(type, r.value, table);
    m.set(ev, (m.get(ev) ?? 0) + r.chance);
  }
  return [...m].map(([ev, chance]) => ({ ev, chance }));
}

function lowerBound(xs: Float64Array, x: number): number {
  let lo = 0, hi = xs.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (xs[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
}
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// ===== EchoValueDistribution =====
export class EchoValueDistribution {
  private constructor(readonly echoValues: Float64Array, readonly atOrAbove: Float64Array, readonly withErAtOrAbove: Float64Array) {}

  static of(table: Table): EchoValueDistribution {
    const bySize: Map<number, number>[] = [new Map([[0, 1]])];
    for (let s = 1; s <= MAX; s++) bySize.push(new Map());
    const order = [...TYPES.keys()].filter(t => t !== ER).concat(ER);
    const withEr = new Map<number, number>();
    for (const type of order) {
      const rolls = echoValueRolls(type, table);
      if (type === ER) {
        for (const [ev, c] of bySize[MAX - 1]) for (const r of rolls) {
          const k = ev + r.ev; withEr.set(k, (withEr.get(k) ?? 0) + c * r.chance);
        }
      }
      for (let size = MAX; size >= 1; size--) {
        const larger = bySize[size];
        for (const [ev, c] of bySize[size - 1]) for (const r of rolls) {
          const k = ev + r.ev; larger.set(k, (larger.get(k) ?? 0) + c * r.chance);
        }
      }
    }
    const full = bySize[MAX];
    const entries = [...full].sort((a, b) => a[0] - b[0]);
    const n = entries.length;
    const evs = new Float64Array(n);
    let setCount = 0;
    for (let i = 0; i < n; i++) { evs[i] = entries[i][0]; setCount += entries[i][1]; }
    const above = new Float64Array(n + 1), aboveEr = new Float64Array(n + 1);
    for (let i = n - 1; i >= 0; i--) {
      above[i] = above[i + 1] + entries[i][1] / setCount;
      aboveEr[i] = aboveEr[i + 1] + (withEr.get(evs[i]) ?? 0) / setCount;
    }
    return new EchoValueDistribution(evs, above, aboveEr);
  }

  private firstHigher(ev: number) { return lowerBound(this.echoValues, ev + TOL); /* approx of BinarySearch semantics */ }
  topPercent(ev: number) { return clamp01(this.atOrAbove[this.firstHigher(ev)]); }
  erTopPercent(ev: number) { return clamp01(this.withErAtOrAbove[this.firstHigher(ev)]); }
  // The lowest Echo Score whose Top Percent is at most p, to one decimal (how example strategies set thresholds).
  topScore(p: number) {
    for (let i = 0; i < this.echoValues.length; i++) if (this.atOrAbove[i + 1] <= p) return Math.round(this.echoValues[i] * 10) / 10;
    return Math.round(this.echoValues[this.echoValues.length - 1] * 10) / 10;
  }
}

// ===== FinishingEchoValues =====
export interface Outcome { ev: number; withEr: number; withoutEr: number }
export class FinishingEchoValues {
  readonly echoValues: Float64Array;
  readonly atOrAbove: Float64Array;
  readonly withErAtOrAbove: Float64Array;
  constructor(readonly outcomes: Outcome[]) {
    const n = outcomes.length;
    this.echoValues = Float64Array.from(outcomes, o => o.ev);
    this.atOrAbove = new Float64Array(n + 1);
    this.withErAtOrAbove = new Float64Array(n + 1);
    for (let i = n - 1; i >= 0; i--) {
      this.atOrAbove[i] = this.atOrAbove[i + 1] + outcomes[i].withEr + outcomes[i].withoutEr;
      this.withErAtOrAbove[i] = this.withErAtOrAbove[i + 1] + outcomes[i].withEr;
    }
  }

  static of(typesMask: number, current: number, table: Table): FinishingEchoValues {
    let count = 0;
    for (let t = 0; t < TYPES.length; t++) if (typesMask & (1 << t)) count++;
    const toAdd = MAX - count;
    type Split = { w: number; wo: number };
    const bySize: Map<number, Split>[] = [new Map([[0, { w: 0, wo: 1 }]])];
    for (let s = 1; s <= toAdd; s++) bySize.push(new Map());
    for (let type = 0; type < TYPES.length; type++) {
      if (typesMask & (1 << type)) continue;
      const rolls = echoValueRolls(type, table);
      const isEr = type === ER;
      for (let size = toAdd; size >= 1; size--) {
        const larger = bySize[size];
        for (const [ev, split] of bySize[size - 1]) {
          const aw = isEr ? split.w + split.wo : split.w;
          const awo = isEr ? 0 : split.wo;
          for (const r of rolls) {
            const k = ev + r.ev;
            let c = larger.get(k);
            if (c === undefined) { c = { w: 0, wo: 0 }; larger.set(k, c); }
            c.w += aw * r.chance; c.wo += awo * r.chance;
          }
        }
      }
    }
    const finished = bySize[toAdd];
    let setCount = 0;
    for (const s of finished.values()) setCount += s.w + s.wo;
    const hasEr = (typesMask & (1 << ER)) !== 0;
    const outcomes: Outcome[] = [];
    for (const [ev, s] of finished) outcomes.push({
      ev: current + ev,
      withEr: (hasEr ? s.w + s.wo : s.w) / setCount,
      withoutEr: (hasEr ? 0 : s.wo) / setCount,
    });
    outcomes.sort((a, b) => a.ev - b.ev);
    return new FinishingEchoValues(outcomes);
  }

  private at(ev: number, chances: Float64Array) { return clamp01(chances[lowerBound(this.echoValues, ev - TOL)]); }
  chanceAtOrAbove(ev: number) { return this.at(ev, this.atOrAbove); }
  chanceWithErAtOrAbove(ev: number) { return this.at(ev, this.withErAtOrAbove); }
}

// ===== EchoCalculator.EvaluateEcho =====
export interface Echo { substats: [number, number][] } // [type, value]
const maskOf = (e: Echo) => e.substats.reduce((m, [t]) => m | (1 << t), 0);
export const echoValue = (e: Echo, table: Table) => e.substats.reduce((s, [t, v]) => s + echoValueOf(t, v, table), 0);

export function evaluateEcho(echo: Echo, table: Table, target: number | null, erTarget: number | null) {
  const current = echoValue(echo, table);
  const f = FinishingEchoValues.of(maskOf(echo), current, table);
  if (echo.substats.length === MAX) {
    return { current, reaches: target !== null ? f.chanceAtOrAbove(target) > 0 : null };
  }
  const o = f.outcomes;
  const worst = o[0].ev, best = o[o.length - 1].ev, gap = (best - worst) / 500;
  const thresholds = [worst];
  for (let i = 1; i < o.length; i++) if (o[i].ev - thresholds[thresholds.length - 1] >= gap) thresholds.push(o[i].ev);
  if (thresholds[thresholds.length - 1] < best) thresholds.push(best);
  let average = 0;
  for (const x of o) average += x.ev * (x.withEr + x.withoutEr);
  let below = 0, median = best;
  for (const x of o) { below += x.withEr + x.withoutEr; if (below >= 0.5 - TOL) { median = x.ev; break; } }
  const distribution = thresholds.map(t => ({ t, c: f.chanceAtOrAbove(t) }));
  const distributionEr = erTarget !== null ? thresholds.map(t => ({ t, c: f.chanceWithErAtOrAbove(t) })) : null;
  return {
    current, best, worst, average, median,
    chance: target !== null ? f.chanceAtOrAbove(target) : null,
    erChance: erTarget !== null ? f.chanceWithErAtOrAbove(erTarget) : null,
    distribution, distributionEr,
  };
}

// ===== UpgradeStrategyPass =====
export type Rule =
  | { kind: 'count'; n: number; types: number[] }
  | { kind: 'roll'; type: number; min: number }
  | { kind: 'score'; min: number }
  | { kind: 'chance'; percent: number; target: number };
export type Strategy = Rule[][][]; // [tuneStage-1][ruleGroup][rule]

interface Tuned { types: number; ev: number; lo: number; hi: number } // rolls: 4 bits per slot, slots 0-7 in lo, 8-15 in hi
interface StateChance { chance: number; evSum: number; minEv: number }
interface PassRoll { ev: number; chance: number; lo: number; hi: number }

const slotBits = (slot: number, nibble: number): [number, number] =>
  slot < 8 ? [(nibble << (slot * 4)) >>> 0, 0] : [0, (nibble << ((slot - 8) * 4)) >>> 0];
const roundTo12 = (x: number) => Math.round(x * 1e12) / 1e12;

class Context {
  rollSlots = new Int32Array(TYPES.length).fill(-1);
  evReadFrom: boolean[] = new Array(MAX + 2).fill(false);
  loReadFrom: number[] = new Array(MAX + 2).fill(0);
  hiReadFrom: number[] = new Array(MAX + 2).fill(0);
  rollsAt: PassRoll[][][];
  finishingByTypes = new Map<number, FinishingEchoValues>();
  addedByTypes = new Map<number, { average: number; min: number }>();

  constructor(readonly table: Table, strategy: Strategy) {
    let slotCount = 0;
    for (let stage = MAX; stage >= 1; stage--) {
      this.evReadFrom[stage] = this.evReadFrom[stage + 1];
      this.loReadFrom[stage] = this.loReadFrom[stage + 1];
      this.hiReadFrom[stage] = this.hiReadFrom[stage + 1];
      for (const rule of strategy[stage - 1].flat()) {
        if (rule.kind === 'score' || rule.kind === 'chance') this.evReadFrom[stage] = true;
        if (rule.kind === 'roll') {
          if (this.rollSlots[rule.type] < 0) this.rollSlots[rule.type] = slotCount++;
          const [lo, hi] = slotBits(this.rollSlots[rule.type], 15);
          this.loReadFrom[stage] = (this.loReadFrom[stage] | lo) >>> 0;
          this.hiReadFrom[stage] = (this.hiReadFrom[stage] | hi) >>> 0;
        }
      }
    }
    this.rollsAt = [];
    for (let stage = 0; stage <= MAX; stage++) this.rollsAt.push(TYPES.map((_, t) => this.rollsOf(t, stage)));
  }

  private reads(stage: number, slot: number) {
    const [lo, hi] = slotBits(slot, 15);
    return ((this.loReadFrom[stage] & lo) | (this.hiReadFrom[stage] & hi)) !== 0;
  }

  private rollsOf(type: number, stage: number): PassRoll[] {
    const slot = this.rollSlots[type];
    if (slot >= 0 && this.reads(stage, slot)) {
      return POSSIBLE[type].map((r, i) => { const [lo, hi] = slotBits(slot, i + 1); return { ev: echoValueOf(type, r.value, this.table), chance: r.chance, lo, hi }; });
    }
    return echoValueRolls(type, this.table).map(r => ({ ev: r.ev, chance: r.chance, lo: 0, hi: 0 }));
  }

  valueOf(e: Tuned, type: number): number | null {
    if (!(e.types & (1 << type))) return null;
    const slot = this.rollSlots[type];
    const word = slot < 8 ? e.lo : e.hi;
    const index = ((word >>> ((slot % 8) * 4)) & 15) - 1;
    return POSSIBLE[type][index].value;
  }

  prepareChances(typeSets: Iterable<number>) {
    for (const ts of typeSets) if (!this.finishingByTypes.has(ts)) this.finishingByTypes.set(ts, FinishingEchoValues.of(ts, 0, this.table));
  }
  chanceToReach(e: Tuned, target: number) { return this.finishingByTypes.get(e.types)!.chanceAtOrAbove(target - e.ev); }

  addedToFinish(types: number) {
    let a = this.addedByTypes.get(types);
    if (!a) {
      const missing = [...TYPES.keys()].filter(t => !(types & (1 << t)));
      let count = 0; for (let t = 0; t < TYPES.length; t++) if (types & (1 << t)) count++;
      const toAdd = MAX - count;
      const rolls = missing.map(t => echoValueRolls(t, this.table));
      const average = toAdd / missing.length * rolls.reduce((s, rs) => s + rs.reduce((s2, r) => s2 + r.ev * r.chance, 0), 0);
      const min = rolls.map(rs => Math.min(...rs.map(r => r.ev))).sort((x, y) => x - y).slice(0, toAdd).reduce((s, x) => s + x, 0);
      a = { average, min };
      this.addedByTypes.set(types, a);
    }
    return a;
  }

  passes(rule: Rule, e: Tuned): boolean {
    switch (rule.kind) {
      case 'count': { let n = 0; for (const t of rule.types) if (e.types & (1 << t)) n++; return n >= rule.n; }
      case 'roll': { const v = this.valueOf(e, rule.type); return v !== null && v >= rule.min - TOL; }
      case 'score': return e.ev >= rule.min - TOL;
      case 'chance': return this.chanceToReach(e, rule.target) >= rule.percent / 100 - TOL;
    }
  }
}

const TUNING = [[0, 0, 0], [4400, 10, 2440], [16500, 20, 5650], [39600, 30, 9960], [79100, 40, 15910], [142600, 50, 24260]];

export function calculateUpgradeStrategy(strategy: Strategy, table: Table) {
  let lastRuleStage = 0;
  for (let s = 1; s <= MAX; s++) if (strategy[s - 1].length > 0) lastRuleStage = s;
  const ctx = new Context(table, strategy);
  let states = new Map<string, [Tuned, StateChance]>([['0|0|0|0', [{ types: 0, ev: 0, lo: 0, hi: 0 }, { chance: 1, evSum: 0, minEv: 0 }]]]);
  const discard = new Array(MAX + 1).fill(0);

  for (let stage = 1; stage <= lastRuleStage; stage++) {
    const groups = strategy[stage - 1];
    const keepsEv = ctx.evReadFrom[stage + 1];
    const keptLo = ctx.loReadFrom[stage + 1], keptHi = ctx.hiReadFrom[stage + 1];
    const typeChance = 1 / (TYPES.length - stage + 1);
    const next = new Map<string, [Tuned, StateChance]>();
    if (groups.some(g => g.some(r => r.kind === 'chance'))) {
      const sets = new Set<number>();
      for (const [e] of states.values()) for (let t = 0; t < TYPES.length; t++) if (!(e.types & (1 << t))) sets.add(e.types | (1 << t));
      ctx.prepareChances(sets);
    }
    for (const [e, st] of states.values()) {
      for (let type = 0; type < TYPES.length; type++) {
        if (e.types & (1 << type)) continue;
        for (const roll of ctx.rollsAt[stage][type]) {
          const tuned: Tuned = { types: e.types | (1 << type), ev: e.ev + roll.ev, lo: (e.lo | roll.lo) >>> 0, hi: (e.hi | roll.hi) >>> 0 };
          const chance = typeChance * roll.chance;
          let pass = groups.length === 0;
          for (let g = 0; !pass && g < groups.length; g++) {
            let all = true;
            for (const rule of groups[g]) if (!ctx.passes(rule, tuned)) { all = false; break; }
            pass = all;
          }
          if (!pass) { discard[stage] += st.chance * chance; continue; }
          const kept: Tuned = { types: tuned.types, ev: keepsEv ? roundTo12(tuned.ev) : 0, lo: (tuned.lo & keptLo) >>> 0, hi: (tuned.hi & keptHi) >>> 0 };
          const key = `${kept.types}|${kept.ev}|${kept.lo}|${kept.hi}`;
          const add = st.chance * chance, addSum = (st.evSum + st.chance * roll.ev) * chance, addMin = st.minEv + roll.ev;
          const m = next.get(key);
          if (m) { m[1].chance += add; m[1].evSum += addSum; m[1].minEv = Math.min(m[1].minEv, addMin); }
          else next.set(key, [kept, { chance: add, evSum: addSum, minEv: addMin }]);
        }
      }
    }
    states = next;
  }

  let keptRate = 0, keptSum = 0, keptMin = Number.MAX_VALUE;
  for (const [e, st] of states.values()) {
    const a = ctx.addedToFinish(e.types);
    keptRate += st.chance; keptSum += st.evSum + st.chance * a.average; keptMin = Math.min(keptMin, st.minEv + a.min);
  }
  const anyKept = states.size > 0;
  keptRate = clamp01(keptRate);
  let exp = 0;
  for (let s = 1; s <= MAX; s++) exp += Math.floor(TUNING[s][0] * 0.25) * discard[s];
  exp += TUNING[MAX][0] * keptRate;
  return {
    successRate: keptRate,
    expPerKept: anyKept ? exp / keptRate : null,
    discards: discard.slice(1).map(clamp01),
    averageKept: anyKept ? keptSum / keptRate : null,
    minimumKept: anyKept ? keptMin : null,
    finishingTablesBuilt: ctx.finishingByTypes.size,
  };
}
