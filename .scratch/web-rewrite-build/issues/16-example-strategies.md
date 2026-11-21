# 16: Example strategies

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§6 "First visit", §8 "Example strategies")

**What to build:** A player who doesn't know where to start loads one of four example strategies from "Start from an example". A first-time visitor finds "Crit first" already in place. Thresholds written as "Top x%" are worked out for the selected Weight Table when the example loads.

**Blocked by:** 15 (Upgrade Strategy: one strategy, rules and results)

**Status:** ready-for-agent

- [ ] "Start from an example" (placeholder "Choose…") offers Keep every Echo; Crit first; Double crit, or one great crit roll; Chance to reach a Top 5% Echo, defined exactly as in the ticket 08 prototype's `EXAMPLES`
- [ ] Top x% thresholds are the Echo Score of a Top x% Echo for the selected table, worked out from its distribution when loaded and rounded to 1 decimal; afterwards they are ordinary numbers (a later table change doesn't touch them; loading again recomputes them)
- [ ] While the distribution is pending, those boxes are empty and faded with "Calculating…" and results wait; a newer example or table choice supersedes a pending one
- [ ] Replacing a strategy with at least one rule first asks "Replace your current strategy with 'X'? This can't be undone." with Replace and Cancel; an empty strategy is replaced without asking
- [ ] First visit (nothing stored): Upgrade Strategy holds "Crit first" with no Weight Table; the automatic load happens only then
- [ ] Vitest for the threshold rounding and supersede logic
