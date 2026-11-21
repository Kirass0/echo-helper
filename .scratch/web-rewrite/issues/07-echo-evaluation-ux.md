# How Echo Evaluation looks and behaves

Type: prototype
Status: resolved
Blocked by: 06
Map: [Echo Helper web rewrite](../map.md)

## Question

What should the Echo Evaluation screen be for someone opening the app for the first time?

Prototype against the source `EchoHelper.Wpf/Views/EchoEvaluationView.xaml` and its view models: entering an Echo's Substats and values, choosing Value Tables, setting Target Value and ER Target Value, the per-table results (Echo Value, Top Percent, Target Chance, Best and Worst Echo Value, the ER variants) and the shared distribution chart.

Decide along the way whether the three Value Table limit survives, whether results update live or on a button, and what the screen shows before anything is entered.

## Comments

- 2026-11-17: Prototype at [`prototypes/07-echo-evaluation/PROTOTYPE-echo-evaluation.html`](../prototypes/07-echo-evaluation/PROTOTYPE-echo-evaluation.html) (double-click; `?variant=A|B|C|D`). A: side by side (close to WPF). B: one table in focus, Echo as tune slots. C: one sortable row per table. D: B revised over two rounds with the owner; D is the chosen layout. The calculation in it is an exact enumeration bucketed to 0.01, not the Core port. This repo is not a git repository, so the prototype stays in `.scratch/` as the primary source instead of on a throwaway branch.

## Answer

The screen is built around **one Substat Weight Table in focus**, because evaluating against one table at a time is the common case. Comparing tables is still possible, but secondary. The layout is variant D of the prototype.

**Your Echo (left column on desktop)**
- Five tune slots, labelled by the Echo Level that reveals them (+5 … +25), with the Tune Stage shown as "Tune Stage 2/5 (+10)".
- The next empty slot reads "Add the Substat revealed at +N". Clicking it opens a grid of the Substat types not already on the Echo, then the type's possible values as buttons. Back and Cancel step out.
- A filled slot shows type and value, a settings (cog) button and a remove button. The cog reopens the same type-then-value picking for that slot, with the current pick marked, so a Substat can be corrected in place.
- Slots after the next one show as "not tuned yet".

**Results for the table in focus (top of the right column)**
- Headed by the table's name, with the "Custom" tag where it applies. Everything is a box, there is no sentence-style verdict, and no box ever disappears.
- Row 1, larger: Target Chance, ER Target Chance.
- Row 2: Echo Score, Top Percent, ER Top Percent.
- Row 3: Median Echo Score, Average Echo Score, Best Echo Score.
- Worst Echo Score is dropped: it mostly repeats the current Echo Score and isn't useful otherwise.
- A box without a number shows "—" and why, e.g. "Set a Target Score below", "No Energy Regen", "Echo Score is 0".
- At 5/5, Target Chance and ER Target Chance become Target Score / ER Target Score with "Reached" / "Not reached". Median, Average and Best show the final Echo Score, and the chart is replaced by a "Fully tuned: the Echo Score is final" note.

**Distribution chart (under the results, partly tuned Echoes only)**
- Shows the chance of each final Echo Score: horizontal axis is the final Echo Score, vertical axis is the chance per band. The range is cut into **60 equal bands** (1/60 of the range on screen), and the axis label says so.
- The owner prefers this higher-resolution shape to fixed 1-point bands and to the WPF "chance to reach" log-axis step chart. The chart conveys shape and spread; exact chances live in the boxes.
- Every listed table is drawn: the one in focus in colour, the others in grey. Target Score is a dashed vertical line and ER Target Score a dotted one.

**Substat Weight Tables list (below the results)**
- The only place tables are picked. It is an aligned table with one header row, and the other rows hold only controls and numbers.
- Columns: Weight Table, Target Score, ER Target Score, Echo Score, Target Chance, ER Target Chance, then a settings (cog) button and remove. At 5/5 the two chance columns show Reached / Not reached.
- The table name in each row is itself the picker: two groups, Custom first, then Built-in, as decided in [How users add and edit their own Value Tables](05-custom-value-tables.md). Swapping it replaces that row's table in place without adding a second one, and the targets remembered for the new table come with it.
- Target Score and ER Target Score are edited in the row, so every listed table's targets stay visible. Each table keeps its own.
- Clicking elsewhere on a row puts that table in focus. Adding a table, or saving a new Custom one, puts it in focus.
- Below the list is an add picker with the same two groups, minus tables already listed, plus "New Custom Weight Table…".
- On a narrow screen the list scrolls sideways (phone layout is still in the fog).

**The Weight Table editor** is a **dialog**, opened by a row's cog. A Built-in table shows its weights read-only with Duplicate. A Custom table offers Edit (Save / Cancel draft), Duplicate and Delete. Validation is as in ticket 05. Deleting a Custom table removes its row.

**Decided along the way**
- **No limit** on the number of Weight Tables (the WPF limit of three is gone).
- **Results are live:** they recalculate on every Substat change, table change and keystroke in a target box, with no Calculate button. The prototype's enumeration took ~16 ms per table for a fresh Echo in Node. Worker and stale-result handling remain [Whether calculations need a worker, progress and stale-result handling](14-calculation-responsiveness.md)'s call, but the button option is ruled out for this tab.
- **First open:** no table and no Substats. The results area shows a short prompt, "Pick a Substat Weight Table below to see how this Echo scores for that Resonator", which points at the real picker in the list, so the first act teaches the control (variant A's empty state, not B's one-off grid). The Echo slots can be filled before a table is chosen. Removing the last table returns to this state.
- **Deferred to the visual direction:** the cog icon needs a redesign; its role (open settings for this item) stays.

## Comments (after resolution)

- 2026-11-21: Changed by [The exact wording of the app's short texts](17-short-text-wording.md). The chart is headed "Echo distribution", with axes "Final Echo Score" and "Chance" (the label no longer names the 1/60 bands). At 5/5 the chart stays, showing single bands, and the "Fully tuned" note is dropped. Top Percent boxes show their number even at Echo Score 0, so the "Echo Score is 0" reason is gone. The first-open prompt is now "Pick a Substat Weight Table for your Resonator below."
- 2026-11-21: The distribution chart's horizontal axis now spans every listed table: the lowest Worst to the highest Best Echo Score of all of them, plus the Target Score and ER Target Score of every listed table (not only the one in focus). That way switching focus never moves or rescales the axis, and the 60 bands keep the same edges for every table. Editing a target in any row may move the axis, which is fine, because only switching focus has to keep it still. An empty target box adds nothing to the range.

- 2026-11-21: Changed by [How far accessibility and keyboard use go](20-accessibility-and-keyboard.md): each Weight Table row is also a keyboard tab stop before its controls; Enter or Space puts it in focus. Mouse behaviour is unchanged.

- 2026-11-21: Changed by [Assemble the spec](22-assemble-the-spec.md). A target box holding something other than a number of 0 or more shows "Enter a number of 0 or more." and counts as empty. Removing a Substat moves the later ones up a slot. A new Custom table saved from this tab is added as a focused row.
