# 23: Live region and reduced motion

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§15 "Live region", "Reduced motion")

**What to build:** A screen-reader user hears one short line when results settle, and hears the unfinished-rule and failure messages when they appear. A player who asks for reduced motion gets no transitions or animations anywhere.

**Blocked by:** 19 (Calculation scheduling, pending display, cache budget and failure), 20 (About tab), 22 (Tablet and phone layout: Upgrade Strategy)

**Status:** done

- [x] One polite live region speaks one line about 1 s after results settle: on Echo Evaluation the focused table's Target Chance (Reached / Not reached at 5/5), or its Echo Score if it has no Target Score; on Upgrade Strategy the Success Rate, or A's and B's while comparing
- [x] The unfinished-rule message and the calculation failure are announced when they appear; "Calculating…" is never announced
- [x] `prefers-reduced-motion: reduce` turns off every transition and animation: bar transitions, the sheet slide-in, the accordion, and smooth scrolling for the "Results" link and About anchors (which then jump)
- [x] The pending fade still applies but appears instantly
- [x] Component tests for the announcement text and its settle delay
