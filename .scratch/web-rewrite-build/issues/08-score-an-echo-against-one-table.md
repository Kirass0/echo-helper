# 08: Score an Echo against one built-in table

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§4, §7, §11, §17)

**What to build:** The first working path through Echo Evaluation. A player opens the app, enters their Echo's Substats slot by slot, chooses one built-in Substat Weight Table, optionally sets a Target Score and ER Target Score, and sees the eight result boxes update live. All calculation runs in a single Web Worker.

**Blocked by:** 02 (Visual tokens, theme switch and the stored-entry foundation), 03 (Core plain port: Echo Score and Echo Evaluation calculation)

**Status:** done

- [x] Built-in catalogue: one JSON file (array of `{ name, weights }`, missing type = 0), starting as a copy of the owner's 61-table `%AppData%\EchoHelper\valueTables.json`, imported into the bundle at build time; pickers sort it alphabetically
- [x] Catalogue check in Vitest (blocks the deploy): no unknown Substat type or property, every weight finite and ≥ 0, names non-empty, ≤ 40 characters and unique ignoring case, catalogue not empty
- [x] One dedicated Web Worker runs all Core work; the main thread never runs Core; newest input wins
- [x] Your Echo: five slots +5 … +25 under "Tune Stage N/5 (+5N)"; the next empty slot reads "Add the Substat revealed at +N" and opens an in-slot grid of types not already on the Echo, then that type's distinct values, with Back and Cancel; later slots read "not tuned yet"; filled slots show type and value, pencil (change in place, current pick marked) and × (remove; later Substats move up); slots can be filled before any table is chosen
- [x] Slot focus moves as in spec §15 (Add → first type, type → first value, value → next Add or this pencil, Escape → opener, × → next empty Add)
- [x] The add picker ("Choose a Weight Table…") lists the built-ins; choosing one lists it as a single row with Target Score and ER Target Score inputs and puts it in focus; an invalid target shows "Enter a number of 0 or more." and counts as empty; no pre-fill
- [x] Results headed by the table name, with the eight fixed-size boxes in three rows (Target Chance, ER Target Chance; Echo Score, Top Percent, ER Top Percent; Median, Average, Best Echo Score); "—" with reasons "Set a Target Score below", "Set an ER Target Score below", "No Energy Regen"; Top Percent always shown; at 5/5 the first row reads Reached / Not reached and the bottom row shows the final Echo Score
- [x] With no table listed, the results area shows only the first-open prompt from ticket 17
- [x] Number formats as in spec §17
- [x] Every change, including each keystroke in a target box, recalculates at once with no button and no debounce; boxes never move or resize
- [x] Component tests for slots and boxes; a Playwright smoke test enters an Echo, picks a table and sees a Target Chance
