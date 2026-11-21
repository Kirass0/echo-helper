# 11: Echo distribution chart

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§2, §7 "Distribution chart", §15 "Charts")

**What to build:** Under the result boxes, the player sees how the Echo's final Echo Score could land for every listed table at once. The table in focus is drawn in colour against its target lines, and the other tables are drawn as grey lines.

**Blocked by:** 10 (Several Weight Tables in the list)

**Status:** ready-for-agent

- [ ] Own SVG component on `d3-scale` and `d3-shape` only
- [ ] Shown whenever at least one table is listed, including at 5/5, where each table is a single band
- [ ] Horizontal axis "Final Echo Score" from the lowest Worst to the highest Best Echo Score across all listed tables, widened to include every listed table's Target Score and ER Target Score (empty targets add nothing); vertical axis "Chance" per band; 60 equal bands with the same edges for every table
- [ ] Focused table: accent line with 18% fill; other tables: grey lines; focused Target Score as a dashed vertical line and ER Target Score as a dotted teal line, with no labels on the lines
- [ ] A fixed single-line legend above the chart names the focused table (truncated, full name in a tooltip), "Other tables", "Target Score" and "ER Target Score"
- [ ] Switching focus never moves or rescales the axis; editing a target may
- [ ] `role="img"` with a one-sentence generated label, e.g. "Echo distribution for Cantarella: final Echo Score from 8.2 to 31.5, Target Score 20 at 34% chance."
- [ ] Component test for the axis range across several tables and the generated label
