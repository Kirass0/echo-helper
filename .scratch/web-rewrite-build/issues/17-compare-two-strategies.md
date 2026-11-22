# 17: Compare two strategies

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§8 "Comparing two strategies", §11 "Job order", §15 "Colour")

**Look:** match variant D of the [ticket 11 prototype](../../web-rewrite/prototypes/11-visual-direction/index.html) (`?variant=D&strat=compare#upgrade-strategy`): `compareBlock()` and `upgradeStrategy()`, both themes. Behaviour: variant D of the [ticket 08 prototype](../../web-rewrite/prototypes/08-upgrade-strategy/index.html).

**What to build:** A player clicks "Compare with another strategy", builds Strategy B next to their current one (now Strategy A), and sees how B compares with A in cost and Echo Scores, as relative changes marked better or worse. Both use the header's Weight Table.

**Blocked by:** 16 (Example strategies)

**Status:** ready-for-agent

- [ ] "Compare with another strategy" turns the current strategy into Strategy A and adds an empty Strategy B beside it (at most two); "Stop comparing" keeps A and discards B
- [ ] Each panel is headed "Strategy A" / "Strategy B" with its own example picker (with its own Replace confirmation) and an Edit/Done button; Edit looks like the one-strategy editor including Discard Rates
- [ ] Done shows one summary line per stage, e.g. "at least 1 of Crit Rate, Crit Damage or Crit Rate at least 9.3", or "every Echo keeps tuning" for an empty stage; each line ends with "x% discarded here" / "nothing discarded"; the summary ends with "Success Rate x%"
- [ ] "B compared with A" table below both: columns Strategy A, Strategy B, B compared with A; rows Echoes started / Echo EXP / Tuners / Shell Credits per Successful Echo, Average Echo Score of Successful Echoes, Lowest Echo Score of a Successful Echo; no Success Rate row
- [ ] Pills show B's relative change against A to 1 decimal ("+12.3%", "−4.0%"): green better and red worse (lower is better for the four cost rows, higher for the two Echo Score rows), ▲ / ▼ outside the pill before it, hidden text "better" / "worse"; equal values get a grey pill with no arrow; an empty cell if either side has no Successful Echoes
- [ ] Paired chart below the table: per stage and for Successful, A in the accent and B in grey, with an A/B legend only, no heading, `aria-hidden`
- [ ] One job per strategy, A before B
- [ ] A Playwright smoke test starts comparing, loads an example into B and sees pills
