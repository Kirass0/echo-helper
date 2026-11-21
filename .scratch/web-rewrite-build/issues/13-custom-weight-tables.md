# 13: Custom Weight Tables

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§5)

**What to build:** A player can look at any table's weights and make Custom Substat Weight Tables of their own, either by duplicating a built-in or Custom table or by starting blank. They can edit, rename and delete them, and a new table goes straight into the Echo Evaluation list. This ticket keeps Custom tables in memory; storing them is ticket 14.

**Blocked by:** 10 (Several Weight Tables in the list)

**Status:** done

- [ ] One weights dialog, opened by the sliders button on each Echo Evaluation row; native `<dialog>` with `showModal()`, centred on desktop
- [ ] A Built-in table shows its weights read-only with "Built-in tables can't be changed. Duplicate it to make your own." and Duplicate; a Custom table offers Edit, Duplicate and Delete
- [ ] Edit opens a draft with Save and Cancel; calculations only see saved tables; all 13 weights are shown, each a finite number ≥ 0 with empty meaning 0, no upper limit and all zeros allowed; a rejected field shows its problem at the field and blocks Save; Escape with unsaved edits acts as Cancel, with no prompt
- [ ] Name: trimmed, not empty, unique among all tables ignoring case; the field accepts at most 40 characters and a paste is cut at 40
- [ ] Duplicate and "New Custom Weight Table…" (at the end of the add picker) open a draft named "X (copy)", "X (copy 2)" … or "New Weight Table", "New Weight Table 2" …, with the name field ready to edit; Cancel creates nothing; a saved new table is added as a new row at the end of the list and put in focus
- [ ] Delete asks "Delete 'X'? This can't be undone.", has no undo, and forgets the targets remembered under that name; rows using it behave as for a vanished table
- [ ] Renaming carries the targets and list rows remembered under the old name to the new one
- [ ] Every table picker shows two labelled groups, "Custom" first (hidden while empty) then "Built-in", each alphabetical; outside a picker, a Custom table's name carries a small "Custom" tag (row and results heading)
- [ ] Wording from ticket 17's Answer; Escape closes the dialog and returns focus to its opener
- [ ] Component tests for the draft rules, default names and rename carry-over; a Playwright smoke test duplicates a built-in, edits a weight and sees the row update
