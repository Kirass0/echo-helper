# 10: Several Weight Tables in the list

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§3 "Caching", §7 "Substat Weight Tables list", §11 "Job order", §15 "Weight Table rows")

**What to build:** A player compares one Echo against as many Substat Weight Tables as they like. The "Substat Weight Tables" list shows each table's Echo Score and chances side by side. Clicking a row puts that table in focus for the result boxes, and each table remembers its own targets while the page is open.

**Blocked by:** 08 (Score an Echo against one built-in table)

**Status:** ready-for-agent

- [ ] Aligned table with one header row and the columns Weight Table (row picker), Target Score, ER Target Score, Echo Score, Target Chance, ER Target Chance (Reached / Not reached at 5/5), sliders ("Weights of X", a placeholder until ticket 13) and × ("Remove X"); headers may wrap onto two lines
- [ ] The add picker below the list lists the tables not already listed and reads "Add another Weight Table…" once the list isn't empty; there is no limit on the number of rows
- [ ] The row picker swaps the row's table in place, brings that table's remembered targets, and doesn't change focus
- [ ] Focus: clicking a row outside its controls focuses it; using a row's controls never does; adding a table focuses it; removing the focused row moves focus to the next row, or to the row above if it was last
- [ ] Targets are remembered per table name even while the table is unlisted
- [ ] Keyboard: each row is its own tab stop before its controls, with the focus ring around the whole row; Enter or Space focuses it; the focused row has `aria-current="true"`; the order is row → picker → Target Score → ER Target Score → sliders → ×; a row's × moves focus to the next row's ×, or to the add picker
- [ ] The worker keeps the latest finishing table per listed table, so a target edit or a changed value of an existing Substat is a lookup; a fresh 0/5 Echo reuses the whole-table distribution
- [ ] Jobs run one per Weight Table, the focused table first and then the list top to bottom, each result posted as soon as it's ready
- [ ] Nothing moves or resizes when focus switches, a row's table is swapped or a target is edited
