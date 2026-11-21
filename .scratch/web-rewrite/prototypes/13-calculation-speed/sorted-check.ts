import { TABLES } from './bench';
import { EchoValueDistribution } from './core';
import { distributionSorted } from './sorted';
for (const name of ['Calcharo', 'Jinhsi', 'Iuno (subDPS)']) {
  const t = TABLES.find(x => x.name === name)!;
  const a = EchoValueDistribution.of(t), b = distributionSorted(t);
  let keyMismatch = 0, d = 0, dEr = 0;
  for (let i = 0; i < a.echoValues.length; i++) {
    if (a.echoValues[i] !== b.echoValues[i]) keyMismatch++;
    d = Math.max(d, Math.abs(a.atOrAbove[i] - b.atOrAbove[i])); dEr = Math.max(dEr, Math.abs(a.withErAtOrAbove[i] - b.withErAtOrAbove[i]));
  }
  console.log(name, { keyMismatch, maxDiffAtOrAbove: d, maxDiffErAtOrAbove: dEr });
}
