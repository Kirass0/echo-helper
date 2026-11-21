# What happens to stored data that no longer fits

Type: grilling
Status: resolved
Blocked by: 10
Map: [Echo Helper web rewrite](../map.md)

## Question

What does the app do when something it remembered can't be used as it is?

[What the browser remembers](10-persistence.md) stores three versioned `localStorage` entries (Custom Weight Tables, Echo Evaluation, Upgrade Strategy), saved automatically and kept in step across open tabs. Decide:

- **An entry from an older version:** whether it is migrated forward, and what a version that can't be migrated does. Is only that entry reset, or everything?
- **An entry that can't be read** (broken JSON, values out of range, such as a negative weight or an unknown Substat type): whether the whole entry is dropped or only the bad parts, and whether the player is told. A failed storage write already shows nothing.
- **A table that no longer exists** (a built-in renamed or removed from the catalogue, a Custom table deleted in another tab). On Echo Evaluation: what a listed row shows, and what happens if it was the table in focus. On Upgrade Strategy: what happens to the selected Weight Table, and to rules and results that need one.
- **A stored entry from a newer version** than the running app (an old cached copy of the app, see [Hosting and delivery on GitHub Pages](12-hosting-and-delivery.md)): whether the app reads it, ignores it, or avoids overwriting it.

Already settled: a renamed built-in loses what was remembered under its old name; a renamed Custom table carries it along; deleting a Custom table forgets its targets; a new built-in that takes a Custom table's name renames the Custom one to "(custom)" with a one-time notice ([How users add and edit their own Value Tables](05-custom-value-tables.md)).

## Comments

- 2026-11-20: Input from [Hosting and delivery on GitHub Pages](12-hosting-and-delivery.md): updates arrive by plain redeploy with no service worker, so an older app only runs in a tab left open across a deploy (until reloaded) or for about 10 minutes of `index.html` caching. Such a tab can meet a newer entry written by another, reloaded tab through the `storage` event. A renamed or removed built-in reaches stored state on the player's next reload after a deploy.
- 2026-11-20: [How the player switches between dark and light](21-theme-switch.md) adds a fourth stored entry, the theme. An old version or bad contents should mean dark.

## Answer

Decided with the owner in a grilling session on 2026-11-20. Each of the four stored entries (Custom Weight Tables, Echo Evaluation, Upgrade Strategy, theme) is handled on its own. A problem with one entry never resets another.

**An entry from an older version**
- Every change to an entry's format ships a migration step from vN to vN+1. On load the steps run in a chain, and the migrated entry is written back straight away.
- If an entry can't be migrated (no step exists, or a step fails), only that entry is reset, under the same rules as an unreadable entry below.

**An entry that can't be read**
- Broken JSON drops the whole entry.
- Values that parse but are invalid are salvaged at the smallest unit:
  - **Custom Weight Tables:** a table is dropped if it has a bad weight (negative, not finite, or an unknown Substat type), an empty name, or a name over 40 characters. A duplicate name (ignoring case) is renamed with the existing "(custom 2)" rule from [How users add and edit their own Value Tables](05-custom-value-tables.md).
  - **Echo Evaluation:** an Echo slot with an unknown Substat type, or a value outside that type's value set, is emptied. Bad Target Scores are cleared. A missing or bad focus falls back to the first listed table.
  - **Upgrade Strategy:** an unknown Substat is removed from a rule. If that leaves the rule unfinished, it is highlighted as usual. A field that isn't a number is cleared. A bad Strategy B is dropped, and the screen leaves compare mode.
  - **Theme:** anything unreadable means Dark (already settled in [How the player switches between dark and light](21-theme-switch.md)).
- Entries that arrive from another tab through the `storage` event are read by the same rules.
- **The player is told nothing**, except when Custom Weight Tables are lost. Those are the player's own work and can't be recovered, so the player gets a one-time notice ("1 Custom Weight Table couldn't be read and was removed"). It uses the same mechanism as the "(custom)" rename notice.

**A table that no longer exists**
- **Echo Evaluation:** the row is removed. If it was the table in focus, focus moves to the next row in list order, or to the row above when it was the last one. If no rows are left, the first-open prompt shows.
- **Upgrade Strategy:** the picker falls back to "no Weight Table", the same state as first open. Rules keep every number, and nothing is cleared. Results behave as decided in [How a new player learns the app](09-first-run-and-explanations.md): Substat Count and Substat Roll rules still give results, and rules that need a table (Echo Score, Target Chance) say so until one is picked.
- **Telling the player:** a built-in that disappeared with a deploy (renamed or removed from the catalogue, seen on the next reload) gets a one-time notice, for example "'X' is no longer a built-in Substat Weight Table and was removed from your list". The player didn't cause it. A Custom table deleted in another tab disappears silently, since the player deleted it.
- Remembered targets for a built-in that has gone stay in place (already settled in [What the browser remembers](10-persistence.md)).

**An entry from a newer version** (an old tab left open across a deploy meeting an entry written by a reloaded tab)
- The old tab ignores it silently. It doesn't read the entry and never writes to it, so newer data is never downgraded or overwritten. The tab keeps working from what it holds in memory. Its changes to that part aren't saved until it is reloaded. There is no notice or reload bar.
- The tab's other entries keep saving normally.

No ADR: each choice is easy to reverse, and none would surprise a reader. No new glossary terms.

## Comments (after resolution)

- 2026-11-21: Changed by [The exact wording of the app's short texts](17-short-text-wording.md). A built-in removed by a deploy now disappears silently, with no notice. A strategy whose table vanished shows the no-table state: rules are kept but hidden behind "Pick a Substat Weight Table above to build an Upgrade Strategy.", and no results are calculated. Adding a table on Echo Evaluation while the strategy has none also picks it there.
