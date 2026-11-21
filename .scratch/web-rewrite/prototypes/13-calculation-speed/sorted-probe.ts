import { TABLES } from './bench';
import { EchoValueDistribution } from './core';
import { distributionSorted } from './sorted';
const pick = ['Mornye', 'Lily (Echo)', 'Calcharo', 'Hsin (EF)', 'Jinhsi', 'Iuno (subDPS)'];
const time = (fn: () => unknown) => { fn(); const t0 = performance.now(); fn(); return performance.now() - t0; };
const rows: unknown[] = [];
for (const name of pick) {
  const table = TABLES.find(t => t.name === name)!;
  const a = EchoValueDistribution.of(table), b = distributionSorted(table);
  let maxDiff = 0;
  for (let i = 0; i < a.echoValues.length; i += 97) {
    const ev = a.echoValues[i];
    maxDiff = Math.max(maxDiff, Math.abs(a.topPercent(ev) - b.atOrAbove[i + 1]), Math.abs(a.erTopPercent(ev) - b.withErAtOrAbove[i + 1]));
  }
  rows.push({ table: name, distinct: a.echoValues.length, sameCount: a.echoValues.length === b.echoValues.length, maxDiff,
    mapMs: +time(() => EchoValueDistribution.of(table)).toFixed(1), sortedMs: +time(() => distributionSorted(table)).toFixed(1) });
}
const out = JSON.stringify(rows, null, 1);
if (typeof document !== 'undefined') document.getElementById('out')!.textContent = navigator.userAgent + '\n' + out; else console.log(out);
