# The built-in Value Table catalogue and its credits

Type: grilling
Status: resolved
Map: [Echo Helper web rewrite](../map.md)

## Question

How are the built-in Value Tables stored, credited and updated?

- Which theorycrafters does each Value Table in the source `data/valueTables.json` come from, and do they need to be asked before their weights ship in a public app? (Only the owner knows this.)
- Is the credit per Value Table, per theorycrafter, or one credits page, and does it link out?
- Can one Resonator have several built-in Value Tables (different builds, different theorycrafters)?
- What is the catalogue file format in the repo, and what does the owner do to add a Resonator or correct a weight?
- Does a Value Table carry more than a name and weights now (a suggested Target Value and ER Target Value, a note, a date or game version)?

## Answer

Decided with the owner in a grilling session on 2026-11-16.

- **What a Built-in Value Table is:** a baseline, not a correct answer. Its weights come from a DPS calculation for one specific team, rotation and setup (enemy, weapon, Echoes, sequences); change any of those and the weights change. Two theorycrafters' tables for one Resonator can both be reasonable. The exact numbers matter little; the catalogue only has to be a sensible starting point that players can edit. `GLOSSARY.md` now says this under **Value Table** and the new term **Built-in Value Table**.
- **Sources** (revised 2026-11-19): most weights are the owner's own calculation with the method in [docs/substat-weights.md](../../../docs/substat-weights.md). Some old Resonators and edge cases are copied from another source and adjusted. The credited calculators:
  - ChemX32's DPR spreadsheet: <https://docs.google.com/spreadsheets/d/1eoCTrwYIsRpacvL3KrcQpR5rwY3pbJ6gEljZdBj_DHs>
  - Maygi's DPS Calculator spreadsheet: <https://docs.google.com/spreadsheets/d/1vTbG2HfkVxyqvNXF2taikStK-vJJf40QrWa06Fgj17c>
  - riley's calculator: <https://riley31415.github.io/wuwa_calc/>
- **Credits** (revised 2026-11-19): one general "thanks to..." mention of all three, with their links. It does not claim the weights come from them. No table records which source it came from. The authors are not asked beforehand; the mention is enough.
  - The credit sits with the text that explains how the app works (a readme or help document), next to a statement that the Built-in Value Tables are baselines for specific assumptions and can be edited. Where that text lives is decided by [What a first-time visitor sees and how concepts are explained](09-first-run-and-explanations.md).
- **Several tables for one Resonator:** allowed. A table has one unique name and nothing else identifies it ("Aemeath", "Aemeath (FB)"). There is no separate Resonator or variant field, and a table need not belong to a Resonator ("Energy Regen").
- **No stable id:** the name is the identity. If a Built-in Value Table is renamed, which should rarely happen, anything the browser remembered under the old name is simply lost. [What the browser remembers](10-persistence.md) builds on that.
- **What a table carries:** `name` and `weights` only. No suggested Target Value or ER Target Value, no note, date, game version or source.
- **File format:** one JSON file in the repo, in the source project's shape: an array of `{ "name", "weights" }`, weights keyed by Substat type name, a missing type meaning 0. It is bundled into the app at build time. The file's order carries no meaning; how tables are ordered where they are picked is a UX decision.
- **Updating:** the owner edits the file and pushes. CI checks the file and the deploy publishes it; visitors get the new catalogue on their next load. The CI wiring belongs to [Hosting and delivery on GitHub Pages](12-hosting-and-delivery.md).
- **The catalogue check** is a Vitest test that replaces the source's 15 `ValueTableFile` tests: unknown Substat type, weight that is not a finite number, empty or duplicate name, unknown property, empty catalogue.
- **Starting contents** (revised 2026-11-19): a copy of the owner's new 61-table file (`%AppData%\EchoHelper\valueTables.json`). Rechecking and completing the catalogue is an owner task before public launch; it blocks nothing in the build. The golden fixtures are unaffected, since they carry their own input tables.
- No ADR: built-in tables were fixed by the destination, and the rest is easy to reverse.

## Comments

- 2026-11-19: The owner finished the new catalogue: `%AppData%\EchoHelper\valueTables.json`, now 61 tables (was 29). This replaces the 29-table file as the starting contents. Most weights were calculated with the method in [docs/substat-weights.md](../../../docs/substat-weights.md); some old Resonators and edge cases were still copied from another source, after adjustment. Things that matter here and for [What a first-time visitor sees and how concepts are explained](09-first-run-and-explanations.md):
  - **Crit Rate weights mean "worth per roll while still below 100%".** Crit Rate is measured with the 100% clamp off (see [Crit Rate is measured without the 100% clamp](../../../docs/substat-weights.md#crit-rate-is-measured-without-the-100-clamp)), so its weight does not drop for builds near the cap. Players must be told that Crit Rate past 100% is worth nothing even though the weight says otherwise.
  - **Jingran:** gains damage from HP only up to 50k HP, which is normally easy to reach, so the HP weights are set to 0.
  - **Sigrika:** benefits from Energy Regen and it is not easy to max out, so the weights were copied from another source and the Energy Regen weight is kept (2.23).
  - Credits reworded (owner, 2026-11-19): kept, but as a simple "thanks to..." mention of ChemX32, Maygi and riley (<https://riley31415.github.io/wuwa_calc/>). The Answer above is updated.
