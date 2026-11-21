// THROWAWAY benchmark driver. Same workloads as Bench.cs.
import tablesJson from './valueTables.json';
import {
  TYPES, Table, tableOf, EchoValueDistribution, evaluateEcho, calculateUpgradeStrategy, Strategy, Rule, Echo,
} from './core';

const T = (name: string) => TYPES.indexOf(name as any);
const CR = T('Critical_Rate'), CD = T('Critical_Damage');
const now = () => performance.now();

export const TABLES: Table[] = (tablesJson as { name: string; weights: Record<string, number> }[]).map(t => tableOf(t.name, t.weights));

// The four example strategies of the Upgrade Strategy prototype; thresholds are Top x% scores of the table.
export function examples(dist: EchoValueDistribution): [string, Strategy][] {
  const count = (n: number, ...types: number[]): Rule => ({ kind: 'count', n, types });
  const t5 = dist.topScore(0.05), t10 = dist.topScore(0.10);
  return [
    ['Keep every Echo', [[], [], [], [], []]],
    ['Crit first', [[], [[count(1, CR, CD)]], [], [[count(2, CR, CD)]], []]],
    ['Double crit, or one great crit roll', [[], [], [[count(2, CR, CD)], [{ kind: 'roll', type: CR, min: 9.3 }], [{ kind: 'roll', type: CD, min: 18.6 }]], [], [[{ kind: 'score', min: t10 }]]]],
    ['Chance to reach a Top 5% Echo', [
      [[{ kind: 'chance', percent: 5, target: t5 }]], [[{ kind: 'chance', percent: 8, target: t5 }]],
      [[{ kind: 'chance', percent: 12, target: t5 }]], [[{ kind: 'chance', percent: 20, target: t5 }]],
      [[{ kind: 'score', min: t5 }]]]],
  ];
}

// The Echo typed in, one Substat at a time: Crit Rate 8.1, Crit Damage 16.2, ATK% 9.4, Liberation 8.6.
const FULL: [number, number][] = [[CR, 8.1], [CD, 16.2], [T('Atk_Percent'), 9.4], [T('Liberation'), 8.6]];
export const echoAt = (stage: number): Echo => ({ substats: FULL.slice(0, stage) });

const once = (fn: () => unknown) => { const t0 = now(); fn(); return now() - t0; };

// Average ms per call: one warm-up call, then repeat until minMs has passed (at least once).
// Heavy calls (over 20 ms) are timed once, after the global warm-up; light ones are repeated.
function timeIt(fn: () => unknown, minMs: number): number {
  const first = once(fn);
  if (first > 20) return first;
  let n = 0; const t0 = now(); let t = t0;
  do { fn(); n++; t = now(); } while (t - t0 < minMs);
  return (t - t0) / n;
}

function summary(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const r = (x: number) => Math.round(x * 100) / 100;
  return { median: r(s[s.length >> 1]), min: r(s[0]), max: r(s[s.length - 1]), total: r(s.reduce((a, b) => a + b, 0)) };
}

export function runAll(log: (s: string) => void = () => {}) {
  const out: Record<string, unknown> = {};
  // Cold: the very first calls in a fresh page/process, before any warm-up (what the first load feels like).
  const first = TABLES[0];
  const cold: Record<string, number> = {};
  cold.distribution = once(() => EchoValueDistribution.of(first));
  cold.evaluateFreshEcho = once(() => evaluateEcho(echoAt(0), first, 10, 10));
  const d0 = EchoValueDistribution.of(first);
  for (const [name, s] of examples(d0)) cold['strategy: ' + name] = once(() => calculateUpgradeStrategy(s, first));
  out.coldFirstTable = { table: first.name, ...Object.fromEntries(Object.entries(cold).map(([k, v]) => [k, Math.round(v * 100) / 100])) };
  log('cold done');

  const dist: number[] = [];
  const evalByStage: number[][] = [[], [], [], [], []];
  const strat: Record<string, number[]> = {};
  const checks: Record<string, number> = {};
  let checksum = 0;
  const perTable: Record<string, unknown>[] = [];
  for (const table of TABLES) {
    let d!: EchoValueDistribution;
    dist.push(timeIt(() => { d = EchoValueDistribution.of(table); }, 50));
    const row: Record<string, unknown> = { table: table.name, distinctScores: d.echoValues.length, dist: Math.round(dist[dist.length - 1] * 10) / 10 };
    perTable.push(row);
    const t5 = d.topScore(0.05);
    checksum += d.topPercent(t5) + d.erTopPercent(t5);
    for (let s = 0; s < 5; s++) {
      let e!: { chance?: number | null };
      evalByStage[s].push(timeIt(() => { e = evaluateEcho(echoAt(s), table, t5, t5); }, 50));
      row['eval' + s] = Math.round(evalByStage[s][evalByStage[s].length - 1] * 10) / 10;
      checksum += e.chance ?? 0;
    }
    for (const [name, s] of examples(d)) {
      const chance = name.startsWith('Chance');
      let r!: ReturnType<typeof calculateUpgradeStrategy>;
      const ms = timeIt(() => { r = calculateUpgradeStrategy(s, table); }, 50);
      (strat[name] ??= []).push(ms);
      row[name] = Math.round(ms * 10) / 10;
      checksum += r.successRate + (r.averageKept ?? 0);
      if (chance) checks.chanceFinishingTables = r.finishingTablesBuilt;
    }
    log(table.name);
  }
  out.tables = TABLES.length;
  out['Top Percent distribution (one table)'] = summary(dist);
  evalByStage.forEach((xs, s) => { out[`evaluateEcho at ${s}/5 (one table)`] = summary(xs); });
  for (const [name, xs] of Object.entries(strat)) out[`strategy: ${name} (one table)`] = summary(xs);
  out.checks = checks;
  out.perTable = perTable;
  out.checksum = checksum;
  return out;
}
