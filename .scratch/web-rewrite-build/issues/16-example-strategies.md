# 16: Example strategies

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§6 "First visit", §8 "Example strategies")

**Look:** match the "Start from an example" picker in the header of variant D of the [ticket 11 prototype](../../web-rewrite/prototypes/11-visual-direction/index.html) (`?variant=D&strat=single#upgrade-strategy`, `upgradeStrategy()`).

**What to build:** A player who doesn't know where to start loads one of four example strategies from "Start from an example". A first-time visitor finds "Crit first" already in place. Thresholds written as "Top x%" are worked out for the selected Weight Table when the example loads.

**Blocked by:** 15 (Upgrade Strategy: one strategy, rules and results)

**Status:** done

- [x] "Start from an example" (placeholder "Choose…") offers Keep every Echo; Crit first; Double crit, or one great crit roll; Chance to reach a Top 5% Echo, defined exactly as in the ticket 08 prototype's `EXAMPLES`
- [x] Top x% thresholds are the Echo Score of a Top x% Echo for the selected table, worked out from its distribution when loaded and rounded to 1 decimal; afterwards they are ordinary numbers (a later table change doesn't touch them; loading again recomputes them)
- [x] While the distribution is pending, those boxes are empty and faded with "Calculating…" and results wait; a newer example or table choice supersedes a pending one
- [x] Replacing a strategy with at least one rule first asks "Replace your current strategy with 'X'? This can't be undone." with Replace and Cancel; an empty strategy is replaced without asking
- [x] First visit (nothing stored): Upgrade Strategy holds "Crit first" with no Weight Table; the automatic load happens only then
- [x] Vitest for the threshold rounding and supersede logic

## Comments

**2026-11-22, implementation notes:** the Echo Score of a Top x% Echo is the lowest real Echo Score whose Top Percent is at most x (`WholeTableDistribution.echoScoreOfTopPercent`). It is worked out in the worker by a third request kind, `topEchoScores`, which follows newest-input-wins like the others and runs before a queued strategy job. Thresholds are rounded to 1 decimal half up and written without a trailing zero ("13", not "13.0"). While they are pending, their fields are disabled and empty with an `aria-hidden` "Calculating…" beside them, the rule isn't flagged as unfinished, and no strategy is sent: the previous results stay faded, with no unfinished-rule message. A table change (or a table appearing) while pending re-sends for the new table. Nothing about the strategy is stored yet, so until ticket 18 every visit starts on "Crit first"; ticket 18 should load it only when nothing is stored. The example picker is sized to "Choose…" like the prototype. The replace confirmation is `src/ui/ConfirmDialog.tsx`, which ticket 17 can reuse for each strategy's own picker. The prototype comparison's `strategy-one` state no longer builds "Crit first" by hand.
