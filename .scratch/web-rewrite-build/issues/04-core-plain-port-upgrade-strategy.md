# 04: Core plain port: Upgrade Strategy pass

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§3, §4, §8)

**What to build:** The second half of the plain-port Core. Given a Substat Weight Table and an Upgrade Strategy (per Tune Stage, rules joined by "and" inside a Rule Group and by "or" between groups), it works out exactly the Discard Rate per stage, the Success Rate, the Tuning Cost per Successful Echo (with the Discard refund) and the Successful Echoes' Echo Score distribution.

**Blocked by:** 03 (Core plain port: Echo Score and Echo Evaluation calculation)

**Status:** done

- [x] All four rule kinds: Substat Count (at least N of a set of Substats), Substat Roll (a Substat at least a value), Echo Score (at least V), Target Chance (at least P% chance to reach Target Score V)
- [x] Several Rule Groups at one stage, impossible rules and an empty strategy are all handled
- [x] Outputs: Discard Rate per stage as a share of all Echoes started; Success Rate; Echoes started, Echo EXP, Tuners and Shell Credits per Successful Echo; Average and Lowest Echo Score of Successful Echoes; the Successful Echoes' distribution. "No Successful Echoes" is representable
- [x] The pass reuses its finishing tables, so threshold and rule edits on an unchanged Weight Table rebuild none of them
- [x] All remaining source Core tests that don't touch file IO are ported one for one (together with 03, the full 70)
- [x] `UpgradeStrategySimulator` is ported with its own seeded RNG and agrees with the exact calculation within a statistical tolerance

## Comments

- Owner decision, 2026-11-21 (spec §19, item 9): the Successful Echoes' Echo Score distribution (`successfulEchoScores`) is removed from the Core and from the plain reference, with its tests. The pass drops the Echo Score once no later rule reads it, as the C# pass does, and keeps the chance-weighted score sum and the minimum, so the Average and Lowest Successful Echo Score stay exact.
