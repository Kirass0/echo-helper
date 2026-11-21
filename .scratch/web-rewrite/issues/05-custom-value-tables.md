# How users add and edit their own Value Tables

Type: grilling
Status: resolved
Blocked by: 04
Map: [Echo Helper web rewrite](../map.md)

## Question

How does a player create, edit and remove Value Tables for their own use in the browser?

Decide the relation to the built-in catalogue (copy a built-in and change it, edit in place with a reset, or fully separate lists), how a custom table is told apart from a built-in one wherever tables are picked, what input is rejected, and what happens to a customised copy when the built-in it came from is updated.

## Answer

Decided with the owner in a grilling session on 2026-11-16.

- **The term:** a **Custom Value Table** is a Value Table a player made for their own use. `GLOSSARY.md` now defines it, and says a Built-in Value Table cannot be changed by a player.
- **Relation to the catalogue:** copy, not edit in place. Built-in Value Tables are read-only. A Custom Value Table is a separate table with its own name, made by duplicating any Value Table (built-in or custom) or by starting blank. Keeping the baseline beside the edited copy lets Echo Evaluation compare the two.
- **No tie to the original:** a Custom Value Table records no origin. When the built-in it was copied from changes, nothing happens to the copy: no notice, no diff, no reset to original. A player who wants the new baseline duplicates it again.
- **Weights:** the editor shows all 13 Substat types. A weight must be a finite number of 0 or more; an empty field means 0. Negatives are rejected (the source accepted them, but no test proves the calculation right for one and no built-in uses one). No upper limit. A table of all zeros is allowed.
- **Names:** trimmed, not empty, at most 40 characters, and different from every other Value Table name, built-in or custom, compared without regard to case.
- **Default names:** a duplicate of "Aemeath" starts as "Aemeath (copy)", then "Aemeath (copy 2)". A blank table starts as "New Value Table", then "New Value Table 2", with all weights 0. The name field is ready to edit straight away.
- **No limit** on the number of Custom Value Tables.
- **Saving:** an edit is a draft with Save and Cancel. Calculations only see saved tables. A draft with a rejected name or weight cannot be saved, and each problem is shown at its field.
- **Renaming a Custom Value Table:** everything the browser remembered under the old name follows to the new name. This differs from a renamed built-in, which loses it, because here the app performs the rename itself.
- **A new built-in takes a custom table's name:** the built-in keeps the name. On load the custom table is renamed to "<name> (custom)", then "<name> (custom 2)", what was remembered about it follows to the new name, and the player sees a one-time notice saying which table was renamed and why.
- **Deleting:** always allowed, after a confirmation that names the table; no undo. Every place that had the table selected then behaves as it does for any table that no longer exists, the same case as a renamed built-in. What each tab shows in that case belongs to the map's "Bad or outdated stored data" patch.
- **Telling the kinds apart:** wherever tables are picked there is one list in two labelled groups, the player's own tables first and built-ins second, each alphabetical. The own group is hidden while empty. Where a table's name appears outside a picker, a Custom Value Table carries a small "Custom" tag. The exact look belongs to [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md) and [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md).
- **The editor:** one Value Table editor, reachable from anywhere a table is picked. Opening a built-in shows its weights read-only with a Duplicate action; opening a custom table offers edit, duplicate and delete. Whether it is a dialog, a panel or a page is decided in the same two prototype tickets.
- **Import and export** of Custom Value Tables as a file is left out of the first version and listed under the map's Out of scope.
- Where Custom Value Tables are stored is decided by [What the browser remembers](10-persistence.md).
- No ADR: built-in plus custom tables were fixed by the destination, and the rest is easy to reverse.

## Comments (after resolution)

- 2026-11-21: Changed by [The exact wording of the app's short texts](17-short-text-wording.md). A blank table is named "New Weight Table", then "New Weight Table 2". The name field stops at 40 characters, so that limit has no error message.

- 2026-11-21: Changed by [Assemble the spec](22-assemble-the-spec.md). The weights dialog is also reachable from a sliders button beside the Upgrade Strategy picker. A newly saved Custom table (from Duplicate or "New Custom Weight Table…") goes where it was started from: a new focused row on Echo Evaluation, or the strategy's table on Upgrade Strategy.
