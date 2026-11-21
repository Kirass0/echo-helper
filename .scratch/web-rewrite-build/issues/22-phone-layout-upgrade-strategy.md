# 22: Tablet and phone layout: Upgrade Strategy

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§14 "Phone, Upgrade Strategy", "Popups on a phone")

**What to build:** Upgrade Strategy works on a tablet and a phone. A player editing rules on a phone always sees the Success Rate in a sticky bar and can jump to the full results, and they can compare two strategies one at a time with an A | B switch. Follow the ticket 16 prototype (B, plus C for strategy results).

**Blocked by:** 17 (Compare two strategies), 19 (Calculation scheduling, pending display, cache budget and failure), 21 (Tablet and phone layout: Echo Evaluation, and bottom sheets)

**Status:** ready-for-agent

- [ ] Tablet (601–820px): one column with the results above the stages
- [ ] Phone header: the Weight Table picker (with its sliders), the example picker and Compare each take a full-width line
- [ ] Stages stacked, each showing its name with the dot, the Discard Rate bar and "x% discarded here" above its rules
- [ ] Rule rows: line 1 holds "and" (if any), the kind picker and × at the right edge; the phrase wraps below (the Target Chance phrase takes three lines at 360px)
- [ ] The Substat Count picker and the example-replace confirmation are bottom sheets on a phone
- [ ] Full results panel below the stages with the unfinished-rule message at its top; a sticky bottom bar shows the Success Rate, the "where Echoes end" bar and a "Results" link that scrolls to the panel; the bar fades with "Calculating…" like the panel; bottom padding stops it covering the last stage
- [ ] Comparing: a "Strategy A | Strategy B" switch (two buttons with `aria-pressed`) under the header shows one strategy at a time in its summary or Edit view; "B compared with A" rows stacked (label, then A, B and the pill); the paired chart labels stages "1/5" … "5/5" and "Succ."; no sticky bar while comparing
- [ ] Nothing breaks at 320px; a Playwright phone-width test checks there's no horizontal scroll on Upgrade Strategy
