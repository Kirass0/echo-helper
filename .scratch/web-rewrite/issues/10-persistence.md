# What the browser remembers

Type: grilling
Status: resolved
Blocked by: 05, 07, 08
Map: [Echo Helper web rewrite](../map.md)

## Question

What state survives a reload, where is it kept, and can it be moved between browsers?

The source app remembers the selected Value Tables and their order, the targets, and the Upgrade Strategy being edited (`EchoHelper.Wpf/Settings/AppSettings.cs`). Decide what the web app keeps (the Echo being evaluated, selections, targets, strategies, custom Value Tables), whether several named Upgrade Strategies can be saved, the storage used, and whether there is an export and import file for backup, given that sharing links are out of scope.

## Comments

- 2026-11-17: Input from [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md): Echo Evaluation state is now: the Echo's Substats in slot order, the listed Weight Tables in order, which one is in focus, and Target Score / ER Target Score per table (remembered per table name, restored when a table is swapped back in). There is no table limit.

- 2026-11-17: Input from [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md): the screen edits one strategy, and a second one only while comparing; "Stop comparing" discards Strategy B. Whether Strategy B survives a reload while comparing, and whether several named strategies can be saved, is left here. An example, once loaded, is ordinary rules with no tie to the example.

- 2026-11-19: Input from [How a new player learns the app](09-first-run-and-explanations.md): with nothing remembered, the app opens on Echo Evaluation (empty), and Upgrade Strategy starts with the "Crit first" example and no Weight Table. Whether the last open tab is remembered is left here. Nothing about first-run teaching needs storing: there is no tour, no welcome popup, and the purpose lines can't be dismissed. Target Score starts empty for a table with nothing remembered.

## Answer

Decided with the owner in a grilling session on 2026-11-19.

**What survives a reload**
- **Echo Evaluation:** everything on screen. That is the Echo's Substats in slot order, the listed Substat Weight Tables in order, which one is in focus, and the Target Score and ER Target Score remembered per table name. Targets are kept for tables that aren't currently listed, so they come back when the table is added again. Unlike the source, the Echo itself is remembered.
- **Upgrade Strategy:** the whole screen. That is the strategy being edited, exactly as held, unfinished rules included; the selected Weight Table, by name; and while comparing, Strategy B too, so the screen comes back still comparing. Each Upgrade Rule is saved with the fields of all four kinds, not only its current one, so switching kind after a reload brings back what was typed before (as in the source's `SavedUpgradeRule`). Edit/Done mode isn't saved. Strategies come back as Done, except one that holds an unfinished rule, which opens in Edit.
- **Custom Substat Weight Tables:** all of them.
- **Not stored:** the open tab (the URL hash already keeps it across a reload, and the bare address opens on Echo Evaluation), the Edit/Done mode, open dialogs and pickers, and anything about first-run teaching (ticket 09).

**No named strategies.** There is one working Upgrade Strategy, plus Strategy B while comparing, and the examples. There's no library of saved, named strategies; that is now under the map's Out of scope. A player keeps their own strategy while trying another one by comparing.

**Where and how**
- `localStorage`, with three JSON entries: Custom Weight Tables, Echo Evaluation, and Upgrade Strategy. Each carries a version number. Nothing goes in cookies, IndexedDB or the URL.
- Saving is automatic: an entry is written whenever its part changes. There's no Save button for screen state. The Save/Cancel draft in the Weight Table editor (ticket 05) is unchanged, and only a saved table is stored.
- **Several open tabs:** each tab listens for the browser's `storage` event and takes on the other tab's change straight away. A Custom table made in one tab appears in the other's pickers, and the other tab's next save doesn't erase it.
- **Storage unavailable** (blocked, full, or throwing in a private mode): the app works fully and simply remembers nothing. There's no notice and no repeated error.

**Forgetting**
- There's no reset action in the app. A player who wants a clean slate clears the site's data in their browser.
- **Deleting a Custom table** also forgets the targets remembered under its name, so a later table with the same name starts with empty targets. Targets remembered for a built-in that leaves the catalogue are left in place: they're harmless and come back if the table returns. Renaming a Custom table still carries everything along (ticket 05).

**No backup file.** There's no export or import of the stored state; that is added to the map's Out of scope line on import and export.

What the app does when a stored entry has an old version, can't be read, or names a table that no longer exists is left to [What happens to stored data that no longer fits](18-outdated-stored-data.md).

No ADR: `localStorage` is the obvious choice for a few KB of state, and every decision here is easy to reverse.

## Comments (after resolution)

- 2026-11-20: [How the player switches between dark and light](21-theme-switch.md) adds a fourth entry, the theme (Dark or Light), with the same versioning, saving, syncing across tabs and silent failure as the three above.
