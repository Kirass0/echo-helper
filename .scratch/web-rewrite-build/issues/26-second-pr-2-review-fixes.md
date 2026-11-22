# 26: Fixes from the second PR #2 review

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§3 "Caching"; §5 "The weights dialog"; §7 "Your Echo", "Results for the table in focus", "Substat Weight Tables list"; §13 "Layout stability"; §15 "Focus moves", "Charts"). Look: variant D of the [ticket 11 prototype](../../web-rewrite/prototypes/11-visual-direction/index.html). Behaviour and the dialog's drafts: variant D of the [ticket 07 prototype](../../web-rewrite/prototypes/07-echo-evaluation/PROTOTYPE-echo-evaluation.html). Check the screen items with [`docs/agents/ui-review.md`](../../../docs/agents/ui-review.md) (`npm run compare:prototype`).

**What to build:** the findings the owner picked from the second review of PR #2 (`main...web-rewrite-ui` at `1d3917e`), plus the code-review findings handed off on 2026-11-22 (1, 2, 3, 5 and 6; finding 4, the worker queue stalling when a job throws, is out of scope and noted on ticket 19). Each bug fix gets a test that fails first. A Target Score edit becomes a lookup. The chart's label describes the focused table. Focus isn't lost after a delete. The dialog closes cleanly when its table vanishes. The Edit draft's title comes from the prototype. Infinite and exponent-form numbers are handled. The tune slots, result boxes and Weight Table list match the ticket 11 prototype. Two code clean-ups.

**Blocked by:** None (can start immediately)

**Status:** done

**Calculation**

- [x] A Target Score or ER Target Score edit is a lookup, as §3 asks ("a Target Score edit or a changed value of an existing Substat is a lookup"). Today `src/calculation/echoEvaluationJob.ts` calls `shiftedFinishingEchoScores` (`src/core/finishingEchoScores.ts`) on every run. That copies the whole finishing table and walks it twice, even when only a target changed. Keep the shifted table for the current Echo Score, so a target edit reads chances from it without rebuilding.
- [x] A test shows a target-only edit builds no new table, in the style of the existing `built` counter in `echoEvaluationJob.test.ts`
- [x] Results stay identical: the golden and fast-versus-plain suites still pass within `1e-9`

**Distribution chart**

- [x] The generated `role="img"` label gives the focused table's own range, from its Worst to its Best Echo Score, not the shared axis (`labelOf` in `src/evaluation/EchoDistributionChart.tsx` uses `bands.from` / `bands.to`). Editing another row's target no longer changes it. §15's example: "Echo distribution for Cantarella: final Echo Score from 8.2 to 31.5, Target Score 20 at 34% chance."

**Weights dialog**

- [x] After a Custom table is deleted, focus doesn't fall to `<body>` (today the opener, the deleted row's sliders button, is gone with its row). Focus goes to the sliders button of the row that took the deleted row's place: the next row, or the row above if it was last; the add picker if no row is left (as §7's removal and §15's × rules). When the opener still exists (e.g. the add picker), focus goes back to it as today. A component test covers it.
- [x] The Edit draft's title is "Edit X" (e.g. "Edit Encore (my rotation)"), with no Custom tag, instead of "X [Custom]". New and Duplicate drafts keep "New Custom Weight Table", and viewing a table keeps "X [Custom]": both are what variant D of the ticket 07 prototype shows.
- [x] When the open table vanishes (a Custom table deleted in another tab, §12), the dialog closes silently through the same path as Close, whether it is viewing the table, confirming its delete, or showing an Edit draft of it (unsaved edits are discarded; Save never creates it anew). Focus follows the delete rule above. Today the dialog renders nothing while the parent still thinks it is open, so later sliders presses open nothing until reload.
- [x] After that, the next sliders press (or "New Custom Weight Table…") opens the dialog again. A component test shows both steps.

**Numbers**

- [x] An entry that parses to a non-finite number (e.g. "1" followed by 400 zeros) is invalid and shows the existing "Enter a number of 0 or more." error, in a weight field and in a Target Score / ER Target Score box (§5: "a finite number of 0 or more"). Today it becomes `Infinity`: a saved table is dropped on reload as unreadable, and the chart's SVG gets NaN.
- [x] Edit and Duplicate drafts write each weight as plain decimal text (no exponent), so an untouched weight never shows a field error. The text reads back as exactly the same number: e.g. `1e-7` → `0.0000001`, `1e21` → `1000000000000000000000`. A huge but finite weight still round-trips and saves.

**Your Echo**

- [x] Every slot carries its "+5" … "+25" label on the left, the next empty slot included (§7: "Five tune slots, labelled +5 … +25"). The next empty slot reads "Add the Substat revealed at +N" next to its label instead of "+ Add…", as in the prototype.

**Result boxes**

- [x] Check whether the boxes can be shorter: row 1 is about 105px in the app against about 75px in the prototype, and rows 2–3 about 85px against 60–80px. They are probably tall so they never resize (§13: "Boxes keep their size whether they show a number, Reached / Not reached, or '—' with a reason"). Make them as small as possible while each box still keeps one fixed size for every content it can show. If the current height is already the smallest that holds, leave it and say so in a comment.

**Substat Weight Tables list**

- [x] Column headers are right-aligned and wrap evenly over two lines, as in the prototype
- [x] Row pickers fit their content, in regular weight, instead of a fixed ~255px in bold. A long Custom table name still fits within the 330px column (ticket 24).
- [x] Rows sit about 52px apart, not ~62px, with a divider line under each row, as in the prototype. The reserved line for a target error (ticket 24) still doesn't move anything when an error appears. If both can't hold, the reserved line wins: rows sit as close to 52px as it allows, and the resulting spacing is noted under `## Comments`.
- [x] The sliders and × buttons are spaced as closely as in the prototype

**Code**

- [x] One shared Substat type guard (e.g. `isSubstatType`) and one shared name-and-weights check replace the separate copies:
  - `catalogueProblems` in `src/catalogue/catalogue.ts` and `readTable` in `src/customTables/customTablesEntry.ts`, which each declare `KNOWN_TYPES` and repeat the name and weight checks;
  - the `SUBSTAT_TYPES.includes(type as SubstatType)` check in `src/evaluation/echoEvaluationEntry.ts`.
- [x] The test "is the finishing table of a fresh Echo" in `src/core/finishingTableReuse.test.ts` asserts agreement within an explicit `1e-12` instead of `toBeCloseTo(…, 12)`, with a comment saying why the two paths aren't bit-identical: the fresh-Echo table sums with Energy Regen last (`TYPES_ER_LAST`, as C# `EchoValueDistribution`), the finishing table in `SUBSTAT_TYPES` order (as C#'s finishing table); both orders come from the C# source, and the `1e-9` comparison tolerance absorbs the ~1e-15 gap. Neither summation order changes (§3 bit-exact parity) and the fresh-Echo shortcut stays.
- [x] The dialog backdrop's `rgb(0 0 0 / 55%)` in `src/evaluation/WeightsDialog.module.css` becomes a custom property in the tokens, in both themes (§2: "Plain CSS Modules with custom properties")

**Done when**

- [x] `npm run compare:prototype` pairs show no difference left for the screen items above
- [x] typecheck, lint, format check, Vitest, build and Playwright all pass

## Comments

> *This was generated by AI during triage.*

**Triage (2026-11-22): bug, ready-for-agent.** Merged in the handoff's code-review findings 1, 2, 3 and 5 (finding 6 was already the delete-focus item; finding 4 is out of scope, see ticket 19). Each claim was checked against the code at `1d3917e`: `parseNonNegativeNumber` has no finiteness check; `draftWeights` uses `String(weight)`, which gives exponent form for tiny or huge weights; `WeightsDialog` returns `null` for a missing table while `EchoEvaluation` keeps its `dialog` state set, and `showModal` runs only on mount; focus on close goes only to the opener while it is still connected.

Owner's decisions:

- Focus after a delete goes to the sliders button of the row that took the deleted row's place, else the add picker.
- The ticket 07 prototype does use "New Custom Weight Table" (for New and Duplicate), so only the Edit title changes, to "Edit X".
- A table that vanishes while its dialog is open closes the dialog silently, an Edit draft included.
- Where the 52px row spacing and the reserved error line conflict, the reserved line wins.

Out of scope: the worker queue stalling when a job throws (ticket 19), changing either summation order, removing the fresh-Echo shortcut, and pushing or merging the branch.

**Implementation notes (2026-11-22)**

- **Row spacing:** rows sit 54px apart at 1220px, not 52px. The reserved line for a target error (0.8em × 1.2, plus 2px) needs that much under the target boxes, and the reserved line wins, as decided above. Cells have 6px above their content, with a divider line under each row.
- **Result boxes:** there are no fixed pixel heights any more. Each box stacks hidden copies of its tallest possible contents ("—" plus each reason it can give, under each label it can have) beneath what it shows, so it is exactly as tall as the tallest of them at the current width. At 1220px, row 1 is about 88px (was 106), row 2 about 77px (was 86) and row 3 about 59px (was 86). Row 1 stays taller than the prototype's 75px because it keeps room for "Set a Target Score below", which the prototype's sample never shows there. An e2e test checks that, at 1280, 1000 and 830px, no box changes size between reasons, numbers and 5/5 verdicts, nothing overflows, and every row is filled to its bottom edge by some content.
- **Row pickers** use `field-sizing: content`, so they fit the chosen table in Chromium. Browsers without it size a picker to its longest option, still capped at the cell's width. The long-name e2e check now asserts the picker isn't squeezed narrower than its name needs.
- **Chart label at 5/5:** the label gives the one final Echo Score, "final Echo Score 18.0", instead of a range from a score to the same score. Spec §15 now says so.
- **Not changed, outside this ticket:** in the 5/5 pair, the prototype's list headers fit on one line and its chance columns are headed "Target Score" / "ER Target Score". Its ER Top Percent value isn't teal, and its chart and results share one panel.
