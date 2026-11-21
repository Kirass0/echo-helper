# Whether the TypeScript Core may use faster data structures than the C# one

Type: grilling
Status: resolved
Map: [Echo Helper web rewrite](../map.md)

## Question

A straight port of the Core's "Echo Score → chance" tables (a `Map` keyed by doubles) takes seconds in a browser on most of the new catalogue. Building the same table from sorted arrays was 10–17× faster and beat the C# Core. It gave identical Echo Scores, with chances differing by ≤ 7e-18 because the summation order changed. See [How fast the ported calculation runs in a browser](13-calculation-speed-in-the-browser.md).

[How the new calculation is proven equal to the old one](03-core-parity.md) settled on a structural port that keeps the source's summation order, proven by ported tests and golden fixtures within `1e-9`. Should the TypeScript Core instead be free to use different data structures and summation orders where it is equal within `1e-9`? If so, where: the whole-table distribution, `FinishingEchoValues`, the Upgrade Strategy pass's state map. And what changes in ADR 0002, the parity proof and the golden fixtures? Also decide whether finishing tables are cached across recalculations (per Substat Weight Table and Substat type set), since a Target Score change then needs only lookups.

The answer feeds [Whether calculations need a worker, progress and stale-result handling](14-calculation-responsiveness.md).

## Answer

Decided with the owner in a grilling session on 2026-11-20. Performance estimates below extrapolate from [How fast the ported calculation runs in a browser](13-calculation-speed-in-the-browser.md) (fast desktop, Chrome); only the sorted-array distribution was measured.

- **Results are judged, not structure.** The TypeScript Core may use any data structure and any summation order for chances. It is accepted when the 70 ported tests, both sampling oracles and every golden fixture agree within `1e-9`, nothing loosened. This replaces "structural port, source summation order kept" from [How the new calculation is proven equal to the old one](03-core-parity.md).
- **Echo Scores stay bit-exact with the source.** Each Substat's contribution is `weight * (value / referenceRoll)` as parenthesised, and Substats are added in the source's order, so every Echo gets the same double as in C#. The "Echo Score → chance" tables group scores by exact equality and a ported test relies on it. Quantising scores to a grid (possibly another 2–3×) is ruled out.
- **Scope of the freedom:** the whole Core.
  - The whole-table distribution and `FinishingEchoValues` are expected to be built from sorted typed arrays, each roll shifting a sorted table and the shifted tables merged in order with exactly equal Echo Scores combined (the measured design, [research](../research/13-calculation-speed-in-the-browser.md)).
  - The Upgrade Strategy pass's state map drops its string key; the replacement is the implementer's call (not measured).
  - No speed target is set here; that belongs to [Whether calculations need a worker, progress and stale-result handling](14-calculation-responsiveness.md).
- **Caching finishing tables**, in memory only, never persisted, keyed by the Substat Weight Table's weights and the Echo's Substat type set (a finishing table depends on the Echo's values only through an offset):
  - Echo Evaluation keeps the latest table per listed Weight Table, so a Target Score edit, or a changed value of an existing Substat, is a lookup. A fresh Echo (0/5) reuses that Weight Table's whole-table distribution instead of building it a second time.
  - Upgrade Strategy keeps the pass's finishing tables while the Weight Table is unchanged, so editing a threshold or rule rebuilds none of them; they are dropped when the weights change.
  - Memory: a fresh Echo's table on Mornye is ~3.8M entries × 3 doubles ≈ 90 MB; tables from 1/5 up are about 10–20× smaller. Hence one set per listed table, not every set ever seen.
- **Order of work and the exact reference:** the implementer first writes the plain `Map`-based port and makes it pass the ported tests and golden fixtures. The fast versions then replace it in the shipped Core, and the plain port stays in the test code (~450 lines) as an exact reference. A Vitest suite in CI compares fast against plain within `1e-9` on generated inputs: random Weight Tables (including Custom-table-style weights), Echoes at every Tune Stage, and strategies using every rule kind.
- **Expected speed (Chrome, fast desktop, median / worst table):** whole-table distribution ~50 ms / ~0.6 s (measured); fresh Echo ~50 ms / ~0.7 s; Echo at 1/5 ~3 / ~35 ms; Target Chance strategy ~0.2 / ~1 s; Substat Roll and Echo Score strategies perhaps ~150 ms / ~0.6 s. With caching, Target Score and threshold edits are near-instant. Laptops are likely 1.5–3× slower, phones more.
- **Records:** [ADR 0002](../../../docs/adr/0002-results-are-calculated-exactly.md) gets an amending paragraph; [How the new calculation is proven equal to the old one](03-core-parity.md) gets a comment pointing here. Golden fixtures, their coverage and the acceptance rule are unchanged.
