# 12: Remember Echo Evaluation

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§12)

**What to build:** A player who reloads the page, or opens it in another browser tab, finds Echo Evaluation as they left it: the same Substats, listed tables, table in focus and targets. Damaged or outdated stored data is salvaged quietly, and a table that no longer exists drops out without fuss.

**Blocked by:** 02 (Visual tokens, theme switch and the stored-entry foundation), 10 (Several Weight Tables in the list)

**Status:** done

- [ ] The Echo Evaluation entry uses the stored-entry mechanism from ticket 02 and holds the Substats in slot order, the listed tables in order (by name), the table in focus, and Target Score / ER Target Score per table name, including targets for unlisted tables and for built-ins that have left the catalogue
- [ ] Written whenever that part changes; other tabs take on changes through the `storage` event
- [ ] Salvage: a slot with an unknown type or a value outside its set is emptied; bad targets are cleared; a missing or bad focus falls back to the first listed table
- [ ] A listed table that no longer exists (a built-in gone with a deploy) disappears silently: its row is removed, focus moves to the next row or the row above, and with no rows left the first-open prompt shows
- [ ] The player is told nothing about salvage
- [ ] Vitest covers salvage and the vanished-table rule; a Playwright test reloads and finds the same state
