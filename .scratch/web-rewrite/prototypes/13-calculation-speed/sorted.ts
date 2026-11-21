// THROWAWAY: the same Top Percent distribution as EchoValueDistribution.of, but each "Echo Score -> chance"
// table is a pair of sorted Float64Arrays merged in order, instead of a Map keyed by doubles.
import { TYPES, ER, MAX, Table, echoValueRolls } from './core';

interface Sorted { keys: Float64Array; vals: Float64Array; n: number }
const EMPTY: Sorted = { keys: new Float64Array(0), vals: new Float64Array(0), n: 0 };

// Merges a and b (both ascending), adding the chances of exactly equal Echo Scores.
function merge(a: Sorted, b: Sorted): Sorted {
  const keys = new Float64Array(a.n + b.n), vals = new Float64Array(a.n + b.n);
  let i = 0, j = 0, n = 0;
  const ak = a.keys, av = a.vals, bk = b.keys, bv = b.vals;
  while (i < a.n || j < b.n) {
    let k: number, v: number;
    if (j >= b.n || (i < a.n && ak[i] < bk[j])) { k = ak[i]; v = av[i++]; }
    else if (i >= a.n || bk[j] < ak[i]) { k = bk[j]; v = bv[j++]; }
    else { k = ak[i]; v = av[i++] + bv[j++]; }
    if (n > 0 && keys[n - 1] === k) vals[n - 1] += v; else { keys[n] = k; vals[n++] = v; }
  }
  return { keys: keys.subarray(0, n), vals: vals.subarray(0, n), n };
}

// The table shifted by one roll: every Echo Score plus the roll's, every chance times the roll's. Stays ascending
// except where floating-point addition makes neighbours equal, which merge() tolerates as long as order holds.
function shift(t: Sorted, ev: number, chance: number): Sorted {
  const keys = new Float64Array(t.n), vals = new Float64Array(t.n);
  for (let i = 0; i < t.n; i++) { keys[i] = t.keys[i] + ev; vals[i] = t.vals[i] * chance; }
  return { keys, vals, n: t.n };
}

function mergeAll(parts: Sorted[]): Sorted {
  while (parts.length > 1) {
    const next: Sorted[] = [];
    for (let i = 0; i < parts.length; i += 2) next.push(i + 1 < parts.length ? merge(parts[i], parts[i + 1]) : parts[i]);
    parts = next;
  }
  return parts[0] ?? EMPTY;
}

export function distributionSorted(table: Table) {
  const bySize: Sorted[] = [{ keys: Float64Array.of(0), vals: Float64Array.of(1), n: 1 }];
  for (let s = 1; s <= MAX; s++) bySize.push(EMPTY);
  const order = [...TYPES.keys()].filter(t => t !== ER).concat(ER);
  let withEr = EMPTY;
  for (const type of order) {
    const rolls = echoValueRolls(type, table);
    if (type === ER) withEr = mergeAll(rolls.map(r => shift(bySize[MAX - 1], r.ev, r.chance)));
    for (let size = MAX; size >= 1; size--) {
      if (bySize[size - 1].n === 0) continue;
      bySize[size] = mergeAll([bySize[size], ...rolls.map(r => shift(bySize[size - 1], r.ev, r.chance))]);
    }
  }
  const full = bySize[MAX];
  let setCount = 0;
  for (let i = 0; i < full.n; i++) setCount += full.vals[i];
  const above = new Float64Array(full.n + 1), aboveEr = new Float64Array(full.n + 1);
  let j = withEr.n - 1;
  for (let i = full.n - 1; i >= 0; i--) {
    above[i] = above[i + 1] + full.vals[i] / setCount;
    let er = 0;
    while (j >= 0 && withEr.keys[j] > full.keys[i]) j--;
    if (j >= 0 && withEr.keys[j] === full.keys[i]) er = withEr.vals[j];
    aboveEr[i] = aboveEr[i + 1] + er / setCount;
  }
  return { echoValues: full.keys, atOrAbove: above, withErAtOrAbove: aboveEr };
}
