# 17: Compare two strategies

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§8 "Comparing two strategies", §11 "Job order", §15 "Colour")

**Look:** match variant D of the [ticket 11 prototype](../../web-rewrite/prototypes/11-visual-direction/index.html) (`?variant=D&strat=compare#upgrade-strategy`): `compareBlock()` and `upgradeStrategy()`, both themes. Behaviour: variant D of the [ticket 08 prototype](../../web-rewrite/prototypes/08-upgrade-strategy/index.html).

**What to build:** A player clicks "Compare with another strategy", builds Strategy B next to their current one (now Strategy A), and sees how B compares with A in cost and Echo Scores, as relative changes marked better or worse. Both use the header's Weight Table.

**Blocked by:** 16 (Example strategies)

**Status:** done

- [x] "Compare with another strategy" turns the current strategy into Strategy A and adds an empty Strategy B beside it (at most two); "Stop comparing" keeps A and discards B
- [x] Each panel is headed "Strategy A" / "Strategy B" with its own example picker (with its own Replace confirmation) and an Edit/Done button; Edit looks like the one-strategy editor including Discard Rates
- [x] Done shows one summary line per stage, e.g. "at least 1 of Crit Rate, Crit Damage or Crit Rate at least 9.3", or "every Echo keeps tuning" for an empty stage; each line ends with "x% discarded here" / "nothing discarded"; the summary ends with "Success Rate x%"
- [x] "B compared with A" table below both: columns Strategy A, Strategy B, B compared with A; rows Echoes started / Echo EXP / Tuners / Shell Credits per Successful Echo, Average Echo Score of Successful Echoes, Lowest Echo Score of a Successful Echo; no Success Rate row
- [x] Pills show B's relative change against A to 1 decimal ("+12.3%", "−4.0%"): green better and red worse (lower is better for the four cost rows, higher for the two Echo Score rows), ▲ / ▼ outside the pill before it, hidden text "better" / "worse"; equal values get a grey pill with no arrow; an empty cell if either side has no Successful Echoes
- [x] Paired chart below the table: per stage and for Successful, A in the accent and B in grey, with an A/B legend only, no heading, `aria-hidden`
- [x] One job per strategy, A before B
- [x] A Playwright smoke test starts comparing, loads an example into B and sees pills

## Comments

**2026-11-22, implementation notes:** each strategy is its own job. Upgrade Strategy and Top Echo Scores requests now carry `strategy: 'A' | 'B'` (`StrategyName` in `src/calculation/protocol.ts`); `Calculator.calculateUpgradeStrategy` and `topEchoScores` take it first. Newest input wins per kind and strategy: a request replaces only the queued one of its own strategy, and the worker runs the queued Top Echo Scores (A's, then B's) before the strategies (A, then B). One strategy alone is always A. Each strategy's draft, pending example and result live in `useStrategy` (`src/strategy/useStrategy.ts`), so A and B can both have an example pending at once. "Compare with another strategy" puts A in Done (Edit if it holds an unfinished rule) and an empty B in Edit; while comparing, the header's example picker gives way to each strategy's own, and "Stop comparing" takes Compare's place. Done is disabled while a strategy holds an unfinished rule, and a strategy holding one shows in Edit with the unfinished-rule message at the top of its panel; the comparison fades while either strategy waits. A pill reads "0.0%" and counts as equal when the change rounds to 0.0%; with A at 0 and B not (e.g. a Lowest Echo Score of 0) there's no relative change, so the cell is empty. A Substat Roll rule's value in a summary line is written without "%", as in the spec's example. `npm run compare:prototype` now sets up `strategy-compare`. Against the prototype, these differ on purpose (spec §8): no Success Rate row, relative-change pills with ▲/▼ outside them, no "Where Echoes end" heading over the paired chart, and summary lines ending with their Discard Rate plus a Success Rate line. One difference is left: a Substat Roll rule's Substat select is as wide as its longest option (as in one-strategy mode since ticket 15), so in a strategy's half the value wraps to the next line where the prototype's fits on one.
