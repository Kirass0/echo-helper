# How the new calculation is proven equal to the old one

Type: grilling
Status: resolved
Blocked by: 02
Map: [Echo Helper web rewrite](../map.md)

## Question

How does the spec guarantee that Echo Value, Top Percent, Target Chance, Discard Rates and Tuning Cost in the web app match the source project's `EchoHelper.Core`?

Under a Blazor reuse this may be nearly free. Under a port, decide between porting the existing tests, exporting golden values from the C# Core, keeping the sampling simulator as an oracle (source ADR 0003), or a mix. Also decide whether the source project stays the reference afterwards or the web app becomes the only implementation.

## Answer

Decided with the owner in a grilling session on 2026-11-16.

- **What "equal" means:** every result (Echo Value, Top Percent, Target Chance, Discard Rates, Tuning Cost) agrees with the C# Core within `1e-9`, the tolerance the Core already uses for its own comparisons. Bit-for-bit equality is not required.
- **How the Core is ported:** a structural, file-by-file translation of `EchoHelper.Core` that keeps the exact-calculation method ("Echo Value → chance" tables), the `1e-9` comparisons and the 12-decimal rounding of kept Echo Values. It is not a redesign.
  - The method's rationale is carried into this repo as [ADR 0002](../../../docs/adr/0002-results-are-calculated-exactly.md), copied from the source project's ADR 0003.
  - Performance changes come later, behind the same tests, and only if [How fast the ported calculation runs in a browser](13-calculation-speed-in-the-browser.md) calls for them.
- **The proof has three parts, all in Vitest:**
  1. **Ported tests.** The 70 Core tests that do not touch file IO are ported one for one with the same hand-derived expectations. The 15 `ValueTableFile` tests are not ported here; loading Value Tables is reshaped by [The built-in Value Table catalogue and its credits](04-value-table-catalogue-and-credits.md) and [How users add and edit their own Value Tables](05-custom-value-tables.md).
  2. **Sampling oracles.** Both simulators (`EchoEvaluationSimulator`, `UpgradeStrategySimulator`) are ported with their own seeded random generator. They check the TypeScript calculation against TypeScript sampling with a statistical tolerance. They cannot reproduce the C# samples, because .NET's `Random` is not available.
  3. **Golden fixtures.** Results exported once from the C# Core, committed as JSON, which the TypeScript Core must reproduce within `1e-9`. This is the only part that compares new code with old on realistic inputs.
- **Golden fixture inputs:** the 28 Value Tables in the source repo's `data/valueTables.json` as of 2026-11-16. Each fixture carries its own copy of its input table, so the fixtures prove the calculation and stay valid whatever the built-in catalogue becomes. The owner's `%AppData%` copy (29 tables) is not used.
- **Golden fixture coverage:**
  - **Per Value Table (all 28):** the Echo Value distribution behind Top Percent, sampled at a fixed list of Echo Values.
  - **Echo Evaluation (about 5 tables):** a fixed set of partly tuned Echoes at each Tune Stage from 0 to 5, with and without Targets, recording Echo Value, Top Percent, Target Chance, best, worst, average, median and the distribution points.
  - **Upgrade Strategy (about 5 tables):** the owner's one saved strategy (4 Upgrade Rules, in `%AppData%\EchoHelper\settings.json`) plus about 6 written ones. Between them they use every Upgrade Rule type, several Rule Groups per Tune Stage, an impossible rule and an empty strategy. Recorded: success rate, Discard Rates per Tune Stage, Tuning Cost and the kept Echo Value distribution.
  - The implementing agent writes the synthetic Echoes and strategies; the spec fixes only these coverage rules.
- **The exporter:** a small C# console project committed at `tools/golden-export/`, referencing the source Core by path without editing it. The owner runs it once by hand. It is never run in CI; CI runs only the Vitest side against the committed JSON. It is kept afterwards, with a note that its output matches only the game data of the day it was run.
- **Rounding and summation order:** the spec names the hazards (`Math.Round(x, 12)` is banker's rounding in .NET and has no JavaScript built-in; summation order differs) and the tolerance, and leaves the code to the implementer. The golden fixtures are the judge. A different midpoint rule moves a kept Echo Value by at most `1e-12`.
- **Acceptance:** the port is accepted when the ported tests, both oracles and every golden fixture pass in CI on every change. No fixture is skipped or loosened beyond `1e-9`. A fixture that cannot be met is raised to the owner, not adjusted by the agent.
- **Afterwards:** parity is proven once, at port time. From then on the two projects are independent: no sync and no cross-check, and the owner may or may not keep the WPF project updated. When the web app's game data changes, the fixtures are regenerated from the TypeScript Core and serve as regression snapshots. Rerunning the exporter against an equally updated WPF project is an optional cross-check, never a requirement. No ADR records this; nothing in it is hard to reverse.

## Comments

**2026-11-16, from [Which roll value each Substat type is normalised by](15-reference-roll-values.md).**

- **The fixtures are exported from the patched source Core**, commit `53ce242` or later (Crit Rate 7.5, Crit Damage 15, Flat DEF 50). The 28 input tables are unchanged.
- **One departure from the structural port:** the web Core computes each Reference Roll from the possible values and tier weights and keeps no table. A test pins the 13 computed values to the source constants.
- **Flat DEF must be covered.** The source project has no test that weights Flat DEF, so the fixtures are its only check. "Mornye" is the one input table that weights it. It is already in the per-table Top Percent fixtures; it must also be one of the Echo Evaluation tables, with at least one Echo that holds a Flat DEF Substat.
- **Summation order, sharpened.** With the new values, some Substat sets that used to differ in the last bit by summation order now sum identically, and a source test relies on that behaviour (`EchoValueDistributionTests.cs`, "same Substats in a different order"). The port keeps the source's summation order and the per-Substat formula exactly as parenthesised: `weight * (value / referenceRoll)`. This matters wherever Echo Scores are compared for equality or grouped, such as the "Echo Score → chance" tables.

**2026-11-20, from [Whether the TypeScript Core may use faster data structures than the C# one](19-faster-core-data-structures.md).**

- **The port is no longer required to be structural.** Any data structure and any chance-summation order is allowed; the ported tests, both oracles and the golden fixtures within `1e-9` are the only judge. The fixtures, their coverage and the acceptance rule are unchanged.
- **Echo Score arithmetic stays exactly as above**: `weight * (value / referenceRoll)` and the source's Substat order, so Echo Scores are bit-identical and group the same way.
- **The plain port is written first** and then kept in the tests as an exact reference, compared with the fast Core within `1e-9` on generated inputs in CI.

**2026-11-21, from the owner after [Assemble the spec](22-assemble-the-spec.md).**

- **An agent runs the exporter, not the owner.** All work is local and the source project is on the same machine, so the implementing agent writes `tools/golden-export/`, runs it once against the source at `53ce242` or later, and commits the JSON. It is still never run in CI.
