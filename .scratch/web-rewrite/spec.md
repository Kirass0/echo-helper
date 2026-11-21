# Spec: Echo Helper web app

The destination of [Echo Helper web rewrite](map.md). This spec states the final behaviour only. Where a later ticket changed an earlier one, only the result is written here. Each section links the tickets that hold the reasons, and the tickets stay the record of why. Terms are those of [`GLOSSARY.md`](../../GLOSSARY.md), in the UI and in code (`echoScore`, `substatWeightTable`, `targetScore`, `successRate`).

Assembled on 2026-11-21. Decisions taken with the owner while assembling are marked **(assembly)** and listed in [§19](#19-decisions-taken-while-assembling).

**Sources this spec points to instead of copying:**

- [ADR 0001](../../docs/adr/0001-typescript-port-instead-of-blazor-webassembly.md): a TypeScript port, not Blazor WebAssembly.
- [ADR 0002](../../docs/adr/0002-results-are-calculated-exactly.md): results are calculated exactly, not sampled, and its amendment that the tables may be built in any way.
- Exact on-screen wording: the Answer of [The exact wording of the app's short texts](issues/17-short-text-wording.md) (ticket 17). Its draft, [`drafts/17-short-texts.md`](drafts/17-short-texts.md), is superseded and must not be used. [§10](#10-short-texts) lists only the texts added or changed after ticket 17.
- Prototypes (throwaway; their numbers are approximations, not the Core):
  - [`prototypes/07-echo-evaluation/PROTOTYPE-echo-evaluation.html`](prototypes/07-echo-evaluation/PROTOTYPE-echo-evaluation.html) (variant D): Echo Evaluation behaviour.
  - [`prototypes/08-upgrade-strategy/index.html`](prototypes/08-upgrade-strategy/index.html) (variant D): Upgrade Strategy behaviour and the example strategies' definitions.
  - [`prototypes/11-visual-direction/index.html`](prototypes/11-visual-direction/index.html) (variant D, "Chosen"): desktop look, palettes and tokens.
  - [`prototypes/16-phone-layout/index.html`](prototypes/16-phone-layout/index.html), seen through [`frame.html`](prototypes/16-phone-layout/frame.html) (B, plus C for strategy results and About): phone layout.
  - Where a prototype and this spec disagree, this spec wins.
- Weight method: [`docs/substat-weights.md`](../../docs/substat-weights.md).
- Source project (read-only reference): `%USERPROFILE%\source\repos\EchoHelperClaude`, commit `53ce242` or later.

---

## 1. Product

- **Audience:** a Wuthering Waves player who knows the game (Echoes, Substats, tuning) but has never seen this tool. The app works on first open with no setup and explains its own concepts.
- **What it does:** three tabs. **Echo Evaluation** scores an Echo against one or more Substat Weight Tables. **Upgrade Strategy** works out Discard Rates, Success Rate and Tuning Cost for an Upgrade Strategy, and compares two. **About** explains everything.
- **Constraints:** purely static (no backend, no accounts), all calculation in the browser, desktop-first but working down to 320px, English only, text only (no game imagery).
- Out of scope: see [§18](#18-out-of-scope).

## 2. Stack and project shape

From [Which stack the web app is built on](issues/02-stack.md) and ADR 0001.

- TypeScript in `strict` mode; React with built-in state only (`useState`, `useReducer`, context); Vite; npm.
- Plain CSS Modules with custom properties. No component library, no Tailwind. A headless library may be added only if a dialog, popover or tooltip needs it; native `<dialog>` is the default ([§15](#15-accessibility-and-keyboard)).
- **Core** is a plain TypeScript module with no React or DOM imports. It runs in Node for tests and in a Web Worker in the app.
- Charts are own SVG components on `d3-scale` and `d3-shape` only. Observable Plot is the fallback if owning axes and tooltips proves too costly.
- No router. The tab lives in the URL hash: `#evaluation`, `#strategy`, `#about`, and `#about-<section>` for an About section. An empty or unknown hash opens Echo Evaluation **(assembly)**.
- ESLint (TypeScript and React hooks rules) and Prettier.
- Tests: Vitest for Core, including the oracles, fixtures and fast-versus-plain suite ([§3](#3-core-and-parity)); Vitest with React Testing Library for components; Playwright for a handful of smoke tests per tab in Chromium, including a phone-width check.

## 3. Core and parity

From [How the new calculation is proven equal to the old one](issues/03-core-parity.md), [Whether the TypeScript Core may use faster data structures than the C# one](issues/19-faster-core-data-structures.md), [Which roll value each Substat type is normalised by](issues/15-reference-roll-values.md) and ADR 0002.

**Method.** Exact calculation through "Echo Score → chance" tables, as in the source `EchoHelper.Core`: the whole-table distribution behind Top Percent, the finishing tables behind Echo Evaluation, and the Upgrade Strategy pass. It never samples. Comparisons treat Echo Scores within `1e-9` as equal.

**Freedom and its limits.**

- Any data structure and any summation order for chances is allowed anywhere in Core.
- The whole-table distribution and the finishing tables are expected to use sorted typed arrays: each roll shifts a sorted table, and the shifted tables are merged in order, combining exactly equal Echo Scores. The pass's state map drops its string key; its replacement is the implementer's call.
- **Echo Scores stay bit-exact with the source.** Each Substat's contribution is `weight * (value / referenceRoll)`, parenthesised exactly so, and the contributions are added in the source's Substat order. Scores are never quantised to a grid.
- Kept Echo Scores are rounded to 12 decimals as `Math.Round(x, 12)` does in .NET, which is banker's rounding and has no JS built-in. The midpoint rule may differ by at most `1e-12`; the fixtures judge.
- The `TunedEcho` struct key becomes a composite numeric or string key.

**Reference Rolls are computed, not tabled.** A Substat type's Reference Roll is the lowest of its possible values whose cumulative integer tier weight × 2 ≥ the total tier weight. A test pins the 13 computed values: Crit Rate 7.5, Crit Damage 15, Flat DEF 50, ATK% / HP% / Basic Attack / Heavy Attack / Resonance Skill / Resonance Liberation DMG Bonus 8.6, DEF% 10.9, Energy Regen 9.2, Flat HP 430, Flat ATK 40. The About table reads the values from the same function.

**Order of work.**

1. Write the plain `Map`-based port first and make it pass parts 1–3 below.
2. Replace it in the shipped Core with the fast versions.
3. Keep the plain port in the test code (~450 lines) as an exact reference.

**Proof, all in Vitest, run in CI on every change:**

1. **Ported tests:** the 70 source Core tests that don't touch file IO, one for one, with the same hand-derived expectations. The 15 `ValueTableFile` tests are replaced by the catalogue check ([§4](#4-game-data-and-the-built-in-catalogue)).
2. **Sampling oracles:** `EchoEvaluationSimulator` and `UpgradeStrategySimulator`, ported with their own seeded RNG and checked against the exact calculation with a statistical tolerance.
3. **Golden fixtures:** JSON exported once from the C# Core and committed. The TypeScript Core must reproduce every value within `1e-9`.
   - Inputs: the 28 tables in the source's `data/valueTables.json` as of 2026-11-16. Each fixture carries its own input table.
   - Per table (all 28): the Echo Score distribution behind Top Percent, sampled at a fixed list of Echo Scores.
   - Echo Evaluation (about 5 tables, **"Mornye" required**, with at least one Echo holding Flat DEF): partly tuned Echoes at every Tune Stage 0–5, with and without targets. Recorded: Echo Score, Top Percent, Target Chance, Best, Worst, Average and Median Echo Score, and the distribution points.
   - Upgrade Strategy (about 5 tables): the owner's saved strategy (4 rules, from `%AppData%\EchoHelper\settings.json`) plus about 6 written ones. Between them they cover every rule kind, several Rule Groups at one stage, an impossible rule and an empty strategy. Recorded: Success Rate, Discard Rate per stage, Tuning Cost, and the Successful Echoes' Echo Score distribution. The distribution is no longer checked or calculated, and the four Cost per Successful Echo fields are compared within `1e-9` relative to their size ([§19](#19-decisions-taken-while-assembling), 2026-11-21).
   - The implementing agent writes the synthetic Echoes and strategies.
   - The fixture loader maps the C# field names to the glossary names.
4. **Fast versus plain:** the fast Core against the plain reference within `1e-9` on generated inputs. These are random Weight Tables (including Custom-style weights), Echoes at every Tune Stage, and strategies using every rule kind.

**Exporter.** A small C# console project at `tools/golden-export/` references the source Core by path, without editing it. The implementing agent writes it and runs it once, locally, against the source project at `%USERPROFILE%\source\repos\EchoHelperClaude` (commit `53ce242` or later), then commits the JSON. CI never runs it. It is kept with a note that its output matches only that day's game data.

**Acceptance.** Every ported test, both oracles, every fixture and the fast-versus-plain suite pass. Nothing is skipped or loosened beyond `1e-9`. A fixture that can't be met is raised to the owner, not adjusted.

**Afterwards.** Parity is proven once. When the web app's game data changes, the fixtures are regenerated from the TypeScript Core as regression snapshots. Rerunning the exporter against an equally updated WPF project is an optional cross-check.

**Caching** (in memory in the worker, never persisted):

- Finishing tables are keyed by a Weight Table's weights and the Echo's Substat type set. Values only shift them.
- Echo Evaluation keeps the latest finishing table per listed Weight Table, so a Target Score edit or a changed value of an existing Substat is a lookup. A fresh (0/5) Echo reuses that table's whole-table distribution.
- Upgrade Strategy keeps the pass's finishing tables while the Weight Table is unchanged, so threshold and rule edits rebuild none of them.
- Eviction and limits: [§11](#11-calculation-in-a-web-worker).

## 4. Game data and the built-in catalogue

From [The built-in Value Table catalogue and its credits](issues/04-value-table-catalogue-and-credits.md), [Which roll value each Substat type is normalised by](issues/15-reference-roll-values.md) and [Hosting and delivery on GitHub Pages](issues/12-hosting-and-delivery.md).

**Game data.** Each Substat type's eight possible values and tier weights, the Tuning Costs per Tune Stage (Echo EXP, Tuners, Shell Credits) and the Discard refund (75% of EXP, 30% of Tuners, no Shell Credits) are ported as they stand in the source Core at commit `53ce242`. They are trusted as current and not re-verified.

**Catalogue file.**

- One JSON file in the repo: an array of `{ "name", "weights" }`. Weights are keyed by Substat type name, and a missing type means 0. It is imported into the bundle at build time.
- A table carries nothing else: no id, source, note, date or suggested targets. The name is its identity.
- One Resonator may have several tables ("Aemeath", "Aemeath (FB)"), and a table need not belong to a Resonator ("Energy Regen").
- File order means nothing. Pickers sort alphabetically.
- If a built-in is renamed, whatever was remembered under its old name is lost.
- Starting contents: a copy of the owner's 61-table `%AppData%\EchoHelper\valueTables.json`.
- To update, the owner edits the file and pushes to `main`. CI validates it and the deploy publishes it.

**Catalogue check** (a Vitest test that blocks the deploy):

- no unknown Substat type or property;
- every weight a finite number of 0 or more;
- names not empty, at most 40 characters, and unique ignoring case;
- the catalogue not empty.

**Credits.** One general mention, in About: "thanks to" ChemX32 ([DPR spreadsheet](https://docs.google.com/spreadsheets/d/1eoCTrwYIsRpacvL3KrcQpR5rwY3pbJ6gEljZdBj_DHs)), Maygi ([DPS Calculator spreadsheet](https://docs.google.com/spreadsheets/d/1vTbG2HfkVxyqvNXF2taikStK-vJJf40QrWa06Fgj17c)) and riley ([calculator](https://riley31415.github.io/wuwa_calc/)), with links. It doesn't claim the weights come from them, and no table records a source.

## 5. Custom Substat Weight Tables

From [How users add and edit their own Value Tables](issues/05-custom-value-tables.md), with later changes from tickets 07, 17 and **(assembly)**.

**What a Custom table is.**

- A Custom table is an independent copy of any table (built-in or custom), or a blank table. It records no origin and is not touched when a built-in changes.
- Built-in tables are read-only.
- There is no limit on how many a player makes.

**Rules for a table.**

- **Weights:** all 13 Substat types are shown. Each must be a finite number of 0 or more, and an empty field means 0. There is no upper limit. All zeros is allowed.
- **Name:** trimmed, not empty, and unique among all tables ignoring case. The field accepts at most 40 characters, and a paste is cut at 40, so there is no error for length.
- **Default names:** "X (copy)", then "X (copy 2)" and so on; a blank table is "New Weight Table", then "New Weight Table 2". The name field is ready to edit straight away.

**The weights dialog.**

- One dialog, opened by the sliders button wherever a table is picked: each Echo Evaluation row or card, and beside the Upgrade Strategy picker **(assembly)**.
- A Built-in table shows its weights read-only with "Built-in tables can't be changed. Duplicate it to make your own." and Duplicate.
- A Custom table offers Edit, Duplicate and Delete.
- Edit opens a draft with Save and Cancel. Calculations only see saved tables. A draft with a rejected field can't be saved, and each problem is shown at its field. Escape with unsaved edits acts as Cancel, with no prompt.
- Duplicate and "New Custom Weight Table…" both open a draft of the new table. Cancel creates nothing.

**Where a newly saved table goes (assembly).**

- Opened from Echo Evaluation, it is added as a new row at the end of the list and put in focus.
- Opened from Upgrade Strategy, it becomes the strategy's Weight Table.

**Delete.**

- Always allowed, after "Delete 'X'? This can't be undone." No undo.
- It also forgets the targets remembered under that name.
- Every place that used the table behaves as for a vanished table ([§12](#12-persistence)).

**Rename.** Renaming a Custom table carries everything remembered under the old name to the new one: targets, list rows and the strategy's table.

**Name taken by a new built-in.** The built-in keeps the name. On load, the Custom table is renamed "X (custom)" (then "X (custom 2)"), what was remembered follows it, and a one-time notice says so.

**Pickers.**

- Every table picker is one list in two labelled groups: "Custom" first, then "Built-in", each alphabetical. The Custom group is hidden while empty.
- Outside a picker, a Custom table's name carries a small "Custom" tag.

## 6. App shell

From tickets 09, 12, 16, 17 and 21.

**Header (desktop).**

- Left: "Echo Helper" (no subtitle), then the tabs Echo Evaluation, Upgrade Strategy and About.
- Right: "Updated 20 Nov 2026", the build date stamped at build time in UTC **(assembly)** with the month spelled out, as plain muted text on every tab; then the theme button at the far right.
- Tabs are text with a 3px accent underline on the open tab.

**Header (phone, ≤600px).** Row 1 holds the name on the left and the date and theme button on the right. Row 2 holds the three tabs.

**Purpose line.**

- Under the tab bar on Echo Evaluation and Upgrade Strategy (not About), always shown and never dismissable.
- Each ends in a "How it works" link to that tab's About section.
- Wording is in ticket 17.

**Browser tab title.** "Echo Helper — Wuthering Waves Echo tuning calculator", on every tab.

**One-time notices.**

- A slim bar under the header, one line each, closed with ×. A notice shows once and never again, even if not closed.
- There are two: the "(custom)" rename and lost Custom tables. Wording is in ticket 17.

**First visit** (nothing stored).

- The app opens on Echo Evaluation, empty.
- Upgrade Strategy holds "Crit first" and has no Weight Table.
- No tour, no welcome popup, and no table chosen by default.

## 7. Echo Evaluation

From [How Echo Evaluation looks and behaves](issues/07-echo-evaluation-ux.md) and its later comments, plus tickets 09, 11, 14, 16, 17 and 20. The layout is variant D of the ticket 07 prototype, with the look of ticket 11.

**Layout (desktop, above 820px).**

- Left column: Your Echo.
- Right column, top to bottom: results for the table in focus, the distribution chart, and the "Substat Weight Tables" list.

### Your Echo

- Five tune slots, labelled +5 … +25, under the current "Tune Stage N/5 (+5N)".
- **Empty slots.**
  - The next empty slot reads "Add the Substat revealed at +N".
  - Clicking it opens, inside the slot, a grid of the Substat types not already on the Echo. Picking a type shows that type's distinct possible values as buttons. Back and Cancel step out, and the grid has no heading.
  - Later slots read "not tuned yet".
- **Filled slots.**
  - A filled slot shows the type and value, a pencil ("Change the Substat at +N") and a × ("Remove X").
  - The pencil reopens the same picking with the current pick marked, so the Substat is corrected in place.
  - Removing a Substat moves the later Substats up one slot **(assembly)**.
- Slots can be filled before any table is chosen.
- Long Substat names wrap. Icon buttons keep a slot to two lines at desktop width.

### Results for the table in focus

- Headed by the table's name, with a "Custom" tag where it applies, and with the reserved "Calculating…" slot ([§11](#11-calculation-in-a-web-worker)).
- Eight boxes. None ever disappears or changes size.
  - Row 1, larger: **Target Chance**, **ER Target Chance**.
  - Row 2: **Echo Score**, **Top Percent**, **ER Top Percent**. The labels are the full glossary terms **(assembly)**. The value reads "Top " plus the percentage, e.g. "Top 5.00%".
  - Row 3: **Median Echo Score**, **Average Echo Score**, **Best Echo Score**.
  - Worst Echo Score is not shown.
- A box without a number shows "—" and a reason: "Set a Target Score below", "Set an ER Target Score below", or "No Energy Regen" (the ER boxes, when the Echo has no Energy Regen).
- Top Percent and ER Top Percent always show their number, even at Echo Score 0, where it is just under 100%.
- **At 5/5:**
  - The first row becomes Target Score / ER Target Score, showing "Reached" or "Not reached". "No Energy Regen" still applies to the ER box.
  - Median, Average and Best show the final Echo Score.
- **No table listed** (first open, or after the last is removed): the results area shows only the first-open prompt from ticket 17 (bold line plus small line).

### Distribution chart ("Echo distribution")

- Shown whenever at least one table is listed, including at 5/5, where each table is a single band.
- **Axes.**
  - Horizontal: "Final Echo Score". It spans every listed table, from the lowest Worst to the highest Best Echo Score of all of them, and includes every listed table's Target Score and ER Target Score. An empty target adds nothing.
  - Vertical: "Chance", the chance per band.
  - The range is cut into 60 equal bands with the same edges for every table. The bands are explained only in About.
- **Drawing.**
  - The table in focus is a filled area: accent line, 18% fill.
  - Other listed tables are grey lines.
  - The focused table's Target Score is a dashed vertical line and its ER Target Score a dotted teal line. Target lines carry no labels; a single-line legend above the chart names them.
  - A long table name in the legend is truncated, with the full name in a tooltip.
- Switching focus never moves or rescales the axis. Editing a target may.

### Substat Weight Tables list

- **The only place tables are picked on this tab.** It is an aligned table with one header row.
- **Columns:**
  - Weight Table: the row's own picker, plus the Custom tag.
  - Target Score, ER Target Score: inputs.
  - Echo Score, Target Chance, ER Target Chance: at 5/5 the chance columns read Reached / Not reached.
  - Sliders ("Weights of X") and × ("Remove X").
  - On desktop the column headers may wrap onto two lines.
- **The row picker.**
  - It uses the two groups from [§5](#5-custom-substat-weight-tables).
  - Swapping replaces the row's table in place, and the targets remembered for the new table come with it.
  - Swapping doesn't change whether that row is in focus.
- **Focus.**
  - Clicking a row outside its controls puts that table in focus.
  - Using a row's controls never changes focus.
  - Adding a table puts it in focus.
- **Targets.**
  - Each table keeps its own Target Score and ER Target Score, remembered per table name even while unlisted.
  - A table with nothing remembered starts with empty targets (no pre-fill).
  - A target box holding something other than a number of 0 or more shows a field error and counts as empty **(assembly)**.
- **Add picker** below the list: the same two groups minus tables already listed, then "New Custom Weight Table…". It reads "Choose a Weight Table…" while the list is empty and "Add another Weight Table…" after.
- **No limit** on the number of listed tables.
- Removing the focused row moves focus to the next row, or to the row above if it was last.

### Behaviour

- **Live:** every change recalculates at once, including each keystroke in a target box. There is no Calculate button and no debounce.

## 8. Upgrade Strategy

From [How Upgrade Strategy looks and behaves](issues/08-upgrade-strategy-ux.md) and its later comments, plus tickets 09, 14, 16, 17, 18, 20 and **(assembly)**. The layout is variant D of the ticket 08 prototype, with the look of ticket 11.

### Header

- **Substat Weight Table picker:**
  - two groups plus "New Custom Weight Table…", with a sliders button beside it **(assembly)**;
  - reads "Choose a Weight Table…" only while no table is selected;
  - once a table is picked, there is no way back to none.
- "Start from an example" (placeholder "Choose…").
- "Compare with another strategy".

### No Weight Table

- The stages and the results panel are replaced by the one line from ticket 17. The strategy is kept underneath. The example picker and Compare are disabled.
- Nothing is calculated.
- **While Upgrade Strategy has no table, adding a table on Echo Evaluation also picks it here.** This covers the first visit and a strategy whose table vanished. There is no "first visit" flag.

### One strategy

- **Stages.**
  - All five Tune Stages in one column, each "Tune Stage N/5 (+5N)" with its stage-colour dot.
  - Beside each stage: its Discard Rate as a small bar in the stage colour and "x% discarded here" (the term has the Discard Rate tooltip), or "nothing discarded" at 0%.
- **Rules at a stage.**
  - A stage's rules are listed directly. Rules in one box are joined by "and"; another box, after the word "or", is another way to pass. The term Rule Group never appears.
  - The links are "+ and" (in a box), "+ or" (below the boxes), and "+ add a rule" (the only content of an empty stage).
  - A new rule starts as an unfinished Substat Count rule: N = 1, no Substats **(assembly, as in the prototype)**.
- **A rule** is a kind picker followed by its fields as a phrase:
  - Substat Count: "at least [N] of [Substats]". N is a select of 1–5. The Substats are a multi-select popover with the placeholder "pick Substats".
  - Substat Roll: "[Substat] at least [value]". The Substat is a select of the 13 types, and the value a select of that type's distinct possible values.
  - Echo Score: "at least [V]". V is a number input.
  - Target Chance: "at least [P]% chance to reach a Target Score of [V]". Both are number inputs.
- **Editing rules.**
  - Switching kind keeps every kind's fields.
  - × ("Remove this rule") removes a rule, and removing a box's last rule removes the box.
  - Impossible rules are allowed.

**Unfinished and invalid rules.**

- A rule is unfinished while a required field is empty. It is highlighted with "Pick at least one Substat.", "Enter an Echo Score.", "Enter a chance in %." or "Enter a Target Score."
- A rule field holding an invalid number is unfinished as well, and shows a field error instead **(assembly)**. Invalid means not a number, an Echo Score or Target Score below 0, or a chance outside 0–100.
- While any rule is unfinished, the previous results stay on screen, faded, with "Results are from before your last change. Finish the highlighted rule at Tune Stage N/5 (+5N) to update them." It names the first such stage.

**Results panel** (beside the stages on desktop):

- **Success Rate**, large, with its tooltip.
- **Where Echoes end:** a stacked bar with no label. It has one segment per stage that discards (stage colours) and a gold Successful segment, 2px gaps in the panel colour, and a legend entry for each segment.
- **"Average cost per Successful Echo"** (with the Cost per Successful Echo tooltip): Echoes started, Echo EXP, Tuners, Shell Credits.
- **Echo Scores of Successful Echoes:** "Average Echo Score of Successful Echoes" and "Lowest Echo Score of a Successful Echo".
- **When nothing succeeds:** with a Success Rate of 0, the cost and Echo Score parts are replaced by "No Echo passes every Tune Stage." **(assembly, prototype wording)**.

### Example strategies

- The four examples are defined exactly as in the ticket 08 prototype's `EXAMPLES`:
  - Keep every Echo;
  - Crit first;
  - Double crit, or one great crit roll;
  - Chance to reach a Top 5% Echo.
- **Top x% thresholds.** Thresholds are written as "the Echo Score of a Top x% Echo for the selected Weight Table". They are worked out from that table's distribution when the example is loaded, rounded to 1 decimal. From then on they are ordinary numbers: changing the table later doesn't change them, and loading the example again recomputes them.
  - While the distribution is pending, those boxes are empty and faded with "Calculating…", and results wait.
  - A newer example or table choice supersedes a pending one.
- **Confirm before replacing (assembly).** If the strategy being replaced holds at least one rule, the app first asks "Replace your current strategy with 'X'? This can't be undone." with Replace and Cancel. An empty strategy is replaced without asking. In compare mode this applies to each strategy's own picker.

### Comparing two strategies

- **Starting and stopping.**
  - "Compare with another strategy" makes the current strategy Strategy A and adds an empty Strategy B beside it. At most two.
  - The header's Weight Table applies to both.
  - "Stop comparing" keeps A and discards B.
- **Each strategy's panel.**
  - Headed "Strategy A" / "Strategy B", with its own example picker and an Edit/Done button.
  - In Edit, a strategy looks like the one-strategy editor, Discard Rates included.
  - In Done, it shows one summary line per stage, e.g. "at least 1 of Crit Rate, Crit Damage or Crit Rate at least 9.3", or "every Echo keeps tuning" for an empty stage. **Each line ends with that stage's "x% discarded here" (or "nothing discarded"), and the summary ends with a Success Rate line (assembly).**
- **"B compared with A"**, a table below both strategies.
  - Columns: Strategy A, Strategy B, B compared with A.
  - Rows: Echoes started per Successful Echo, Echo EXP per Successful Echo, Tuners per Successful Echo, Shell Credits per Successful Echo, Average Echo Score of Successful Echoes, Lowest Echo Score of a Successful Echo.
  - **There is no Success Rate row (assembly):** Echoes started per Successful Echo carries the same information.
- **Pills** show the **relative change** of B against A, to 1 decimal ("+12.3%") **(assembly)**.
  - Green means better and red means worse. Lower is better for the four cost rows; higher is better for the two Echo Score rows.
  - A ▲ (better) or ▼ (worse) sits before the pill, outside it, and hidden text reads "better" or "worse".
  - Equal values get a grey pill with no arrow.
  - If either side has no value (no Successful Echoes), the cell is empty.
- **Paired chart** below the table: per stage and for Successful, A in the accent and B in grey, with an A/B legend only. It has no heading and is `aria-hidden`.

### Behaviour

- Every valid change recalculates at once. There is no button and no debounce.
- Persistence of both strategies: [§12](#12-persistence).

## 9. About

From [How a new player learns the app](issues/09-first-run-and-explanations.md), tickets 04, 12, 15, 16 and 17.

**Structure.**

- A third tab, `#about`, with seven sections. Each has an anchor `#about-<section>`, and "How it works" links go there.
- On desktop: a sticky side panel listing the sections, with the current one marked by an accent bar.
- On a phone: an accordion of `<details>` elements. More than one may be open, and a link to a section opens it and scrolls to it.

**Content.** The spec fixes only the outline and the facts each section must state. The prose is written during the build and reviewed in the real app.

1. **What Echo Helper does:** the two tabs, in two or three sentences.
2. **Evaluating an Echo:** a walkthrough (pick a table, enter Substats, set a Target Score), and every result explained, including the chart: final Echo Score across, chance per band up, 60 equal bands over the range of all listed tables, the table in focus in colour.
3. **Echo Score and Reference Rolls:**
   - the formula;
   - what a Reference Roll is (the chance-weighted median roll);
   - the 13 values as a small table, read from Core;
   - one worked example: Crit Rate 8.1 at weight W adds W × 8.1 / 7.5.
4. **Substat Weight Tables:**
   - Built-in tables are baselines for one team, rotation and setup, not correct answers, and can be duplicated and edited;
   - how the weights are worked out (from `docs/substat-weights.md`);
   - the Crit Rate weight is the worth of one roll while Crit Rate is below 100%, and Crit Rate past 100% is worth nothing;
   - per-table notes: Jingran's HP weights are 0 because the HP bonus caps at 50k HP and is normally easy to reach; Sigrika keeps an Energy Regen weight (2.23) because her damage grows with Energy Regen and it is hard to max out;
   - Custom tables.
5. **Upgrade Strategies:**
   - rules joined by "and" and "or", and the four rule kinds;
   - Discard Rate (a share of all Echoes started) versus Success Rate;
   - the Discard refund (75% of EXP, 30% of Tuners, no Shell Credits);
   - the cost per Successful Echo.
6. **Credits:**
   - the "thanks to" mention ([§4](#4-game-data-and-the-built-in-catalogue));
   - a link to the GitHub repo, naming its Issues as the place for feedback and table requests.
7. **Disclaimer**, exactly:
   > Echo Helper is a fan-made tool. It is not affiliated with or endorsed by Kuro Games. Wuthering Waves and its game data belong to Kuro Games. Results are calculated from game data as of the app's last update, and the built-in Substat Weight Tables are baselines, not correct answers. Use them as guidance.

   It appears only here; there is no footer line.

## 10. Short texts

**Source.** Every tooltip, purpose line, prompt, picker placeholder, box reason, rule message, notice, editor message, icon label, header text and the page title is worded in the Answer of [The exact wording of the app's short texts](issues/17-short-text-wording.md). Use it verbatim.

**Tooltips.**

- They are plain text with no links.
- A term with a tooltip has a dotted underline on the term itself (no ⓘ). It opens on hover, keyboard focus or tap, and closes on a tap elsewhere or Escape.
- Width: at most 290px, or `calc(100vw - 20px)` on narrower screens. It sits below the term, or above if there is no room.
- Eleven terms have one. Eight are on Echo Evaluation: Substat Weight Table, Echo Score, Target Score, ER Target Score, Target Chance, ER Target Chance, Top Percent, ER Top Percent. Three are on Upgrade Strategy: Discard Rate on "discarded here", Success Rate, and Cost per Successful Echo.

**Texts added or changed after ticket 17 (assembly):**

| Where | Text |
|---|---|
| Invalid Target Score / ER Target Score, or a rule's Echo Score or Target Score field | "Enter a number of 0 or more." (the editor's existing text) |
| Invalid chance in a Target Chance rule | "Enter a chance from 0 to 100." |
| Results with Success Rate 0 | "No Echo passes every Tune Stage." |
| Loading an example over a strategy with rules | "Replace your current strategy with 'X'? This can't be undone." with Replace and Cancel |
| Box labels, row 2 | "Top Percent", "ER Top Percent" (not "Top %") |
| Compare summary, end of each stage line | "x% discarded here" / "nothing discarded" |
| Compare summary, last line | "Success Rate x%" |
| Phone chart legend | the table name (truncated), "Others", "Target", "ER" (from ticket 16) |

The desktop chart legend names the focused table, "Other tables", "Target Score" and "ER Target Score" **(assembly)**.

## 11. Calculation in a Web Worker

From [Whether calculations need a worker, progress and stale-result handling](issues/14-calculation-responsiveness.md).

**One worker.** A single dedicated Web Worker runs all Core work for both tabs, cheap lookups included. The main thread never runs Core, and there is no pool.

**Jobs.**

- Newest input wins. Each edit sends a request that replaces any queued one.
- Work is split into one job per Weight Table, or per strategy when comparing. Each result is posted as soon as it's ready.
- Between jobs, outdated work is dropped. A running job finishes and its outdated result is discarded.
- The worker is never terminated to cancel, and there is no Cancel action.
- **Job order:**
  1. the visible tab before the hidden one (the hidden tab still calculates);
  2. in Echo Evaluation, the focused table first, then the list top to bottom;
  3. in Upgrade Strategy, A before B.

**Pending display.**

- Nothing changes for the first ~300 ms.
- After that, each still-pending result fades and shows "Calculating…" in an always-reserved slot. That means each table row and the chart on Echo Evaluation, and each strategy's results (including the phone's sticky bar) on Upgrade Strategy.
- The fade is the same as the unfinished-rule fade. There is no progress bar, and no stale warning beyond the unfinished-rule message.

**Cache budget.**

- Caches are evicted least-recently-used under a fixed budget of about 10M entries (~250–300 MB); the exact figure is the implementer's call.
- The focused table's caches are never evicted.
- An evicted table is recalculated on demand, with the pending fade.

**Failure.**

- If a job throws or runs out of memory, the app restarts the worker once and retries.
- If that fails too, each affected results area shows "Couldn't calculate this. Reload the page to try again." The rest of the app keeps working, and nothing is reported anywhere.

**Expected speed** (guidance only; there is no CI performance test; fast desktop, Chrome, median / worst table):

| Calculation | Median | Worst table |
|---|---|---|
| Whole-table distribution | ~50 ms | ~0.6 s |
| Fresh Echo (0/5) | ~50 ms | ~0.7 s |
| Echo at 1/5 | ~3 ms | ~35 ms |
| Target Chance strategy | ~0.2 s | ~1 s |
| Substat Roll / Echo Score strategy | ~150 ms | ~0.6 s |

Lookups are instant. Laptops are 1.5–3× slower, phones more. Measurements: [research/13](research/13-calculation-speed-in-the-browser.md).

## 12. Persistence

From [What the browser remembers](issues/10-persistence.md), [What happens to stored data that no longer fits](issues/18-outdated-stored-data.md), [How the player switches between dark and light](issues/21-theme-switch.md) and ticket 17.

**Four `localStorage` JSON entries,** each with its own version number:

1. **Custom Weight Tables:** all saved ones. Drafts are never stored.
2. **Echo Evaluation:** the Substats in slot order, the listed tables in order (by name), the table in focus, and Target Score / ER Target Score per table name. Targets are kept for unlisted tables and for built-ins that have left the catalogue.
3. **Upgrade Strategy:**
   - the selected table (by name);
   - Strategy A exactly as held, unfinished rules included. Every rule stores the fields of all four kinds.
   - while comparing, Strategy B.
4. **Theme:** Dark or Light.

**Not stored:**

- the open tab (the hash keeps it);
- Edit/Done mode: strategies come back as Done, except one holding an unfinished rule, which opens in Edit;
- open dialogs, pickers and drafts;
- the phone's A | B switch;
- anything about first-run teaching.

Nothing goes in cookies, IndexedDB or the URL.

**Saving and syncing.**

- An entry is written whenever its part changes. There is no Save button for screen state.
- Other open tabs take on a change through the `storage` event, read by the same rules as on load.
- If storage is blocked, full or throwing, the app works fully and remembers nothing, silently.

**Forgetting.**

- There is no reset action. Clearing site data is the way.
- Deleting a Custom table forgets its targets.
- Renaming a Custom table carries everything along.

**Each entry is handled on its own;** a problem with one never resets another.

- **Older version:** chained migration steps vN → vN+1 run on load, and the result is written back. If there is no step, or a step fails, only that entry is reset.
- **Broken JSON:** the whole entry is dropped.
- **Parsed but invalid:** salvaged at the smallest unit.
  - Custom tables: a table with a bad weight, an empty name or a name over 40 characters is dropped. A duplicate name is renamed with the "(custom 2)" rule.
  - Echo Evaluation: a slot with an unknown type or a value outside its set is emptied. Bad targets are cleared. A missing or bad focus falls back to the first listed table.
  - Upgrade Strategy: an unknown Substat is removed from its rule, which may leave it unfinished. A non-number field is cleared. A bad Strategy B is dropped and compare mode is left.
  - Theme: anything unreadable means Dark.
- **The player is told nothing,** except for lost Custom tables: a one-time notice ("1 Custom Weight Table couldn't be read and was removed." / "N Custom Weight Tables … were removed.").
- **A table that no longer exists:** a built-in gone with a deploy, or a Custom table deleted in another tab. It disappears **silently**.
  - Echo Evaluation: its row is removed. Focus moves to the next row (or the row above). With no rows left, the first-open prompt shows.
  - Upgrade Strategy: the picker falls back to no table and the no-table state applies ([§8](#8-upgrade-strategy)). The rules keep every number.
- **Entry from a newer version** (an old tab left open across a deploy): it is ignored silently, never read and never written. That part of the tab works from memory, unsaved, until reload. The other entries save normally.

## 13. Visual direction and themes

From [The visual direction](issues/11-visual-direction.md), [How the player switches between dark and light](issues/21-theme-switch.md) and ticket 20. **Tokens:** take them from the `body.vD.light` and `body.vD.dark` palettes in the ticket 11 prototype, plus the additions below.

**Base look.**

- Calm, bordered panels: 1px border, 10px corners, no shadows.
- Result boxes on a soft grey surface with 6px corners. The first row of boxes has large bold numbers.
- 20px spacing on desktop.

**Colour.**

- One indigo accent, `#3346c8` light and `#8f9cff` dark. It marks the table in focus, links, the focused row and the primary button.
- Energy Regen elements are teal, `#0e7f7f` / `#46c8c8`. The light teal is darkened slightly where it is text on the grey box surface.
- **Tune Stage colours,** one per stage everywhere a stage appears (dot, Discard Rate bar, "where Echoes end" segment):
  - light `#9fd8cf #62bdb5 #4697ad #5a74b0 #7455a6`;
  - dark `#2c625d #36817d #3f87a3 #6279c4 #8d6fd0`.
- **Successful is gold,** `#d99a22` / `#f0b84a`.
- The paired chart uses the accent for A and grey for B.
- The comparison pills are green and red with their signs and arrows.
- **New token `--field-line`:** the border of text inputs, selects and pickers, at least 3:1 against their background in both themes. It is separate from the panel `--line`.

**Type.** Onest for everything, with tabular figures for numbers. It is self-hosted in the bundle.

**Icons.** Icon buttons are thin-stroke and muted, each with an accessible label and a tooltip (labels in ticket 17):

- sliders for a table's weights;
- pencil to change a Substat;
- × to remove, which turns red on hover;
- sun / moon for the theme.

**Themes.**

- Only Dark and Light. There is no "System" option, and the OS setting is ignored. The first open is always dark.
- The theme button sits at the header's far right and shows a sun while dark and a moon while light. About does not repeat it.
- Switching is instant, with no transition.
- CSS `color-scheme` follows the theme. There is no `theme-color` meta tag.
- A tiny inline script in `index.html` applies the stored theme before first paint. It is the only code outside the bundle.

**Layout stability.**

- Switching focus, swapping a row's table, editing a target, adding or removing a Substat, or recalculating moves or resizes nothing around it. Only the content inside a fixed space changes.
- Boxes keep their size whether they show a number, Reached / Not reached, or "—" with a reason.
- The chart legend has a fixed single line.
- The prototype's legend wrapping and resizing chance boxes are known bugs, not intended behaviour.

## 14. Tablet and phone layout

From [How both tabs work on a phone](issues/16-phone-layout.md). See the ticket 16 prototype (B, plus C for strategy results and About).

**Widths.**

- Above 820px: the desktop layout.
- 601–820px (tablet): one column. On Upgrade Strategy the results sit above the stages. The Weight Table list is the desktop table, scrolling sideways.
- 600px and below (phone): as follows.
- Nothing breaks at 320px.

**Phone sizes.** Page padding and gaps 12px, panel padding 14px, large numbers 26px.

**Phone, Echo Evaluation.**

- The order is Your Echo, then results, then the list.
- **Echo slots.** Full width. The type grid opens inside the slot, two across. Value buttons are four across, with Back and Cancel below.
- **Result boxes.**
  - Target Chance and ER Target Chance share row 1. The other six are three across, in two rows, with smaller numbers.
  - Labels are the full glossary terms and may wrap to two lines.
  - Boxes have a fixed minimum height.
- **Chart.** Drawn at 360 units wide with 4 axis ticks. The one-line legend uses the short names in [§10](#10-short-texts).
- **The list as cards.**
  - One card per table:
    - line 1: the picker, Custom tag, sliders and ×;
    - line 2: the Target Score and ER Target Score inputs, labelled above;
    - line 3: Echo Score, Target Chance and ER Target Chance, which read Reached / Not reached at 5/5.
  - Tapping a card outside its controls puts it in focus. The focused card gets the accent border, a tint and a left bar.
  - The add picker sits below the cards.
  - Nothing on this tab scrolls sideways.

**Phone, Upgrade Strategy.**

- **Header.** The Weight Table picker (with its sliders), the example picker and Compare each take a full-width line.
- **Stages.** Stacked. Each shows its name with the dot, the Discard Rate bar and "x% discarded here" above its rules.
- **Rule rows.** Line 1 holds "and" (if any), the kind picker, and × at the right edge. The phrase wraps on the lines below; the Target Chance phrase takes three lines at 360px.
- **Results.**
  - The full results panel sits **below** the stages, with the unfinished-rule message at its top.
  - A **sticky bar at the bottom of the screen** shows the Success Rate, the "where Echoes end" bar and a "Results" link that scrolls to the panel. It fades with "Calculating…" like the panel.
  - The page gets bottom padding so the bar never covers the last stage.
- **Comparing** (offered on a phone).
  - A "Strategy A | Strategy B" switch under the header shows one strategy at a time, in its summary or Edit view.
  - "B compared with A" follows below, each row stacked: the label, then A, B and the pill.
  - The paired chart labels its stages "1/5" … "5/5" and "Succ.".
  - There is no sticky bar while comparing.

**Popups on a phone.**

- Every popup is a bottom sheet: the Substat Count picker, the weights dialog and Custom editor, the delete and example-replace confirmations, and any other dialog.
- A sheet has a grab handle and a title, and fills at most 85% of the height, scrolling inside.
- The Substat list inside has one checkbox per line, with 18px boxes and a Done button.
- Tapping the dimmed area or pressing Escape closes a sheet.
- On desktop, popups are an anchored popover (the Substat picker, which closes on a click outside) or a centred dialog.

**About on a phone.** An accordion ([§9](#9-about)).

## 15. Accessibility and keyboard

From [How far accessibility and keyboard use go](issues/20-accessibility-and-keyboard.md). There is no WCAG target, audit or CI check; only the following.

**Controls.**

- Tabs are `<a>` links with `aria-current`.
- "+ and", "+ or" and "+ add a rule" are `<button>`s styled as links.
- The phone A | B switch is two buttons with `aria-pressed`.
- The About accordion uses `<details>`/`<summary>`.
- Every dialog and bottom sheet is a `<dialog>` opened with `showModal()`.
- There are no custom ARIA widgets and no arrow-key navigation. The keyboard model is Tab, Shift+Tab, Enter, Space and Escape.

**Focus moves.**

- **Echo slots:**
  - "Add the Substat revealed at +N" moves focus to the first type button, and the pencil to the current pick.
  - Picking a type moves focus to the first value button.
  - Picking a value moves focus to the next empty slot's Add button, or to this slot's pencil if no slot is empty.
  - Escape acts as Cancel and returns focus to the opener.
  - A slot's × moves focus to the Add button of the next empty slot (after the later Substats have moved up).
- **Weight Table rows and cards:**
  - Each row is its own tab stop, placed before its controls, with the focus ring around the whole row. Enter or Space puts it in focus, and the focused row has `aria-current="true"`.
  - Order: row → name picker → Target Score → ER Target Score → sliders → ×.
  - A row's × moves focus to the next row's ×, or to the add picker.
- **Rules:**
  - A new rule focuses its first field.
  - A rule's × moves focus to the × of the rule before it in that stage, or to "+ add a rule" if the stage is now empty.

**Popups.**

- Escape closes every popup and returns focus to its opener.
- The popover also closes when focus leaves it.
- Escape in the editor with unsaved edits acts as Cancel.

**Tooltips.**

- Each underlined term is a `<button>` styled as text, linked by `aria-describedby`.
- Its tooltip shows on focus, hover and tap, stays open while the pointer is over it, and Escape closes it without moving focus.
- Icon buttons show their tooltip on focus too.

**Charts.**

- The distribution chart has `role="img"` and a one-sentence generated label, e.g. "Echo distribution for Cantarella: final Echo Score from 8.2 to 31.5, Target Score 20 at 34% chance."
- The "where Echoes end" bar and the paired chart are `aria-hidden`; their numbers are also on screen as text ([§8](#8-upgrade-strategy)).
- There is no data table.

**Colour.** Colour is never the only carrier: stage dots sit by stage names, Discard bars have text, "where Echoes end" segments have gaps and legend entries, and pills have arrows and hidden text.

**Live region.**

- One polite live region speaks one line about 1 s after results settle:
  - Echo Evaluation: the focused table's Target Chance (Reached / Not reached at 5/5), or its Echo Score if it has no Target Score;
  - Upgrade Strategy: the Success Rate, or A's and B's while comparing.
- The unfinished-rule message and the calculation failure are announced when they appear.
- "Calculating…" is never announced.

**Reduced motion.**

- `prefers-reduced-motion: reduce` turns off every transition and animation: bar transitions, the sheet slide-in, the accordion, and smooth scrolling for the "Results" link and About anchors, which then jump.
- The pending fade still applies, but appears instantly.

**Hit areas.** Icon buttons and link-buttons get at least 24×24px through padding. There are no 44px targets.

## 16. Hosting, CI and delivery

From [Hosting and delivery on GitHub Pages](issues/12-hosting-and-delivery.md).

**Repo and site.**

- Public repo `Kirass0/echo-helper`, served at `https://kirass0.github.io/echo-helper/`. Vite `base` is `/echo-helper/`, and there is no custom domain.
- MIT licence. The catalogue's weights are credited, with no separate licence.

**Deploy workflow.**

- One GitHub Actions workflow, run on push to `main` and by `workflow_dispatch`. It deploys with `upload-pages-artifact` / `deploy-pages`, and the Pages source is "GitHub Actions". There is no `gh-pages` branch.
- **Gate, in order:**
  1. `npm ci`
  2. type check
  3. ESLint
  4. Prettier check
  5. Vitest: Core tests, both oracles, golden fixtures, fast versus plain, the catalogue check, components
  6. `vite build`
  7. Playwright in Chromium against the built output, including the phone width
- It deploys only if every step passes; otherwise the live site stays on the last good build.
- Pull requests run the same checks without deploying.
- `main` has no branch protection. The owner pushes directly, and agents' work arrives as PRs.

**Updates.**

- A plain redeploy. All data is bundled, so the hashed file names change.
- Pages caches `index.html` for ~10 min, so players get the update on their next reload after that.
- There is no service worker, offline mode, update notice or runtime fetch.

**Privacy.** No analytics, no cookies, no third-party requests, so no privacy notice is needed.

## 17. Number formats (assembly)

| Figure | Format |
|---|---|
| Echo Score, Median / Average / Best Echo Score, Successful Echoes' Echo Scores | 2 decimals |
| Target Chance, ER Target Chance, Top Percent, ER Top Percent | 2 decimals with "%" ("<0.01%" above 0 but below that, "0%" for exactly 0); Top Percent and ER Top Percent prefixed "Top " ("Top 5.00%") |
| Success Rate, Discard Rate | 1 decimal ("<0.1%" for anything above 0 and below that) |
| Echoes started per Successful Echo | 2 decimals |
| Echo EXP, Tuners, Shell Credits | whole numbers with thousands separators |
| Top x% example thresholds | rounded to 1 decimal when loaded |
| Comparison pills | relative change to 1 decimal with sign ("+12.3%", "−4.0%") |
| Substat values | as the game shows them (e.g. 8.1, 430) |

These follow the ticket 11 prototype's `pct`, `pct1`, `sc` and `int` helpers.

## 18. Out of scope

From the map:

- an owned-Echo inventory;
- sharing links;
- import or export of Custom tables or of the stored state;
- a library of named strategies;
- Strategy Code and Copy Results;
- game imagery;
- localisation;
- backend, accounts and sync;
- re-verifying game data against the live game.

## 19. Decisions taken while assembling

Raised with the owner on 2026-11-21 while assembling. They are recorded as comments on the tickets they change.

**Decided by the owner:**

1. The box labels are the full terms "Top Percent" / "ER Top Percent". This replaces ticket 06's "Top %".
2. Comparison pills show the relative change. The Success Rate row is dropped from "B compared with A", because Echoes started per Successful Echo carries the same information.
3. Success Rate and per-stage Discard Rates appear in compare mode in each strategy's summary, so the paired chart can stay `aria-hidden`.
4. Upgrade Strategy's picker is the same as Echo Evaluation's (two groups and "New Custom Weight Table…"), with a sliders button beside it.
5. A newly saved Custom table goes where it was started from: a new focused row on Echo Evaluation, or the strategy's table on Upgrade Strategy.
6. Picking an example over a strategy that has rules asks for confirmation first. The automatic "Crit first" only ever loads when nothing is stored.
7. The number formats in [§17](#17-number-formats-assembly).
8. An invalid number in a target box or rule field shows a field error.

**Decided by the owner on 2026-11-21, while reviewing the Core:**

9. The Core drops the Successful Echoes' Echo Score distribution. The app never shows it ([§8](#8-upgrade-strategy) shows only the Average and Lowest Echo Score), the C# Core never returned it (only the golden exporter derived it), and carrying every distinct Echo Score to the end made some strategies take seconds. The pass now drops the Echo Score once no later rule reads it, as the C# pass does, and keeps the Average and Lowest exact. The golden fixtures keep the field, but the tests no longer read it. Recorded on tickets 04, 05 and 06.
10. The four Cost per Successful Echo fields (Echoes, EXP, Tuners, Shell Credits) are compared within `1e-9` relative to their size, in the golden and fast-versus-plain suites. They divide Tuning Costs in the hundreds of thousands by the Success Rate, so no summation order other than the C# one meets an absolute `1e-9` (ticket 07). Every other value is still compared within an absolute `1e-9`.

**Smaller defaults taken from the prototypes, for the owner to veto:**

- Removing a Substat moves the later ones up.
- A new rule is an unfinished Substat Count with N = 1.
- Substat Count's N is a select of 1–5, and a Substat Roll value is a select of the type's distinct values.
- The texts "No Echo passes every Tune Stage.", "Enter a chance from 0 to 100.", and the desktop legend names.
- An unknown hash opens Echo Evaluation.
- The build date is stamped in UTC.

## 20. Owner tasks outside the build

These block nothing in the build.

- **Catalogue recheck before public launch.**
  - Rescale weights copied from Maygi's sheet: Crit Rate and Crit Damage × 7.5/8.1, Flat DEF × 50/40.
  - Rescale weights copied from ChemX32's sheet: DEF% × 10.9/10.0.
  - Round to 2 decimals, and complete the catalogue.
- ~~**Create the public repo** `Kirass0/echo-helper` and set Pages to "GitHub Actions".~~ Done on 2026-11-21.
