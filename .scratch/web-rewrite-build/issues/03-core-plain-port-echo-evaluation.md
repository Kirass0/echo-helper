# 03: Core plain port: Echo Score and Echo Evaluation calculation

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§3, §4) · [ADR 0002](../../../docs/adr/0002-results-are-calculated-exactly.md)

**What to build:** The first half of the TypeScript Core, as a plain `Map`-based port of the source `EchoHelper.Core` (`..\EchoHelperClaude`, commit `53ce242` or later). Given a Substat Weight Table and a partly tuned Echo, with optional Target Score and ER Target Score, it gives every Echo Evaluation result exactly, never by sampling. It has no React or DOM imports and runs in Node.

**Blocked by:** 01 (Scaffold, CI gate and deploy of the app shell)

**Status:** ready-for-agent

- [ ] Game data ported as it stands at `53ce242`: each Substat type's eight values and tier weights, Tuning Costs per Tune Stage (Echo EXP, Tuners, Shell Credits) and the Discard refund (75% EXP, 30% Tuners, no Shell Credits)
- [ ] Reference Rolls computed (the lowest value whose cumulative integer tier weight × 2 ≥ the total), exposed by one function; a test pins all 13 values listed in spec §3
- [ ] Echo Score is bit-exact with the source: each contribution is `weight * (value / referenceRoll)`, summed in the source's Substat order and never quantised; kept Echo Scores are rounded to 12 decimals as .NET `Math.Round(x, 12)` (banker's rounding); comparisons treat scores within `1e-9` as equal
- [ ] Whole-table distribution (behind Top Percent) and finishing tables (behind Echo Evaluation)
- [ ] Results for an Echo at any Tune Stage 0–5: Echo Score, Top Percent, ER Top Percent, Target Chance, ER Target Chance, Best, Worst, Average and Median Echo Score, and the distribution points; at 5/5, Reached / Not reached
- [ ] Every source Core test in this area that doesn't touch file IO is ported one for one, with the same hand-derived expectations
- [ ] `EchoEvaluationSimulator` is ported with its own seeded RNG and agrees with the exact calculation within a statistical tolerance
- [ ] Glossary names are used throughout (`echoScore`, `substatWeightTable`, `targetScore`, …)
