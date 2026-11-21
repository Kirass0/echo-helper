import { TABLES, examples, echoAt } from './bench';
import { EchoValueDistribution, evaluateEcho, calculateUpgradeStrategy } from './core';
const t = (label: string, fn: () => unknown) => { const t0 = performance.now(); fn(); console.log(label, (performance.now() - t0).toFixed(1), 'ms'); };
for (const table of [TABLES[0], TABLES[6]]) {
  console.log('==', table.name);
  t('dist cold', () => EchoValueDistribution.of(table));
  t('dist warm', () => EchoValueDistribution.of(table));
  const d = EchoValueDistribution.of(table);
  for (let s = 0; s < 5; s++) t('eval ' + s, () => evaluateEcho(echoAt(s), table, 10, 10));
  for (const [n, s] of examples(d)) t('strat ' + n, () => calculateUpgradeStrategy(s, table));
}
