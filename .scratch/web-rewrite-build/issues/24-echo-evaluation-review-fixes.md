# 24: Echo Evaluation fixes from the PR #2 review

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§5 "The weights dialog", "Pickers"; §7 "Substat Weight Tables list"). Look: variant D of the [ticket 11 prototype](../../web-rewrite/prototypes/11-visual-direction/index.html).

**What to build:** Echo Evaluation and the weights dialog match the ticket 11 prototype where the build had drifted from it. The first-open prompt sits centred in a dashed box. The weights dialog reads as one column of Substat Weights with bars, closes on a click outside, and ends in a coloured Close button on the right. The Custom tag is coloured. The Substat Weight Tables list leaves enough room for a long Custom table name. The Substat Weight Table tooltip is on the "Weight Table" column header instead of the list's heading.

**Blocked by:** None (can start immediately)

**Status:** done

**First-open prompt**

- [x] Both lines ("Pick a Substat Weight Table for your Resonator below." and the small line under it) are centred inside a dashed-border box with 28px padding and muted text, as in the prototype's `.empty`

**Weights dialog: viewing a table**

- [x] All 13 Substats are in one column, each with its name, its weight and a bar to the right
- [x] Each bar is scaled to the table's largest weight
- [x] Rows are sorted heaviest first, with ties in the usual Substat order
- [x] A Substat weighted 0 is muted and has no bar. A table that is all zeros shows no bars.

**Weights dialog: the editor (Edit, Duplicate, New Custom Weight Table…)**

- [x] One column: the name field full width at the top, then one row per Substat with its input on the right. No bars.
- [x] Edit and Duplicate keep the row order the weights view showed when the button was pressed, and the order doesn't change while typing
- [x] "New Custom Weight Table…" uses the usual Substat order
- [x] After Save, the weights view sorts again by the saved weights

**Weights dialog: closing and buttons**

- [x] A click on the dimmed area outside the dialog does exactly what Escape does:
  - viewing weights or confirming a delete, it closes the dialog and focus goes back to the button that opened it
  - with unsaved edits, it acts as Cancel, with no prompt
- [x] The ✕ close button is removed from every screen of the dialog
- [x] Buttons are right-aligned, with the main action on the far right:
  - viewing: Delete · Edit · Duplicate · **Close** (Delete and Edit for Custom tables only). Close has the accent fill, like Save.
  - editor: Cancel · **Save**
  - delete confirmation: Cancel · **Delete** (red)
- [x] Opening the dialog still puts focus on its first real control

**Custom tag**

- [x] The tag is the prototype's accent pill everywhere it appears: list rows, the heading of the results for the table in focus, and the dialog title
  - `--acc-soft` background, `--acc` text, weight 600, fully rounded corners

**Substat Weight Tables list: room for the name**

- [x] The Target Score and ER Target Score boxes are about 4.4em wide
- [x] The result columns are no wider than their headers need
- [x] On desktop, the left column (Your Echo) is a fixed 330px instead of 300–380px
- [x] A target box holding an invalid value gets a red border. The row shows one error line ("Enter a number of 0 or more.") under its two target boxes.
  - the line may run across the result columns
  - it shows once even when both boxes are invalid
  - each row keeps one line free for it, so an error appearing moves nothing
- [x] At full desktop width (1220px), "Changli (my rotation)" with its Custom tag shows in full in its row picker
- [x] Column widths still don't change when focus moves, a table is swapped or a target is edited

**Tooltips**

- [x] The "Substat Weight Tables" heading is plain text
- [x] The "Weight Table" column header keeps its text and carries the Substat Weight Table tooltip (dotted underline)

**Spec and tests**

- [x] Spec §5 "The weights dialog" says a click outside acts as Escape, describes the one-column view with bars sorted heaviest first, and describes the editor order
- [x] Spec §7 "Substat Weight Tables list" describes the one error line per row
- [x] Component tests cover:
  - the sort order and muted zero rows in the view
  - the order the editor keeps
  - the click outside, both with and without unsaved edits
  - the absence of the ✕
  - the row's single error line
  - where the tooltip moved
- [x] An e2e check confirms "Changli (my rotation)" with its Custom tag isn't cut off at 1220px
