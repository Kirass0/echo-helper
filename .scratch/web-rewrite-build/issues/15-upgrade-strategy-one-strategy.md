# 15: Upgrade Strategy: one strategy, rules and results

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§8 "Header", "No Weight Table", "One strategy", §10, §15 "Rules")

**Look:** match variant D of the [ticket 11 prototype](../../web-rewrite/prototypes/11-visual-direction/index.html) (`?variant=D&strat=single#upgrade-strategy` and `&strat=unfinished`): `upgradeStrategy()`, `stagesEditor()`, `ruleRow()` and `resultsPanel()`, both themes. Behaviour: variant D of the [ticket 08 prototype](../../web-rewrite/prototypes/08-upgrade-strategy/index.html).

**What to build:** A player picks a Substat Weight Table on the Upgrade Strategy tab, writes rules for each Tune Stage, and sees live the Discard Rate at each stage and the results panel: Success Rate, where Echoes end, average cost per Successful Echo and the Successful Echoes' Echo Scores. The pass runs in the worker.

**Blocked by:** 04 (Core plain port: Upgrade Strategy pass), 09 (Term and icon tooltips), 13 (Custom Weight Tables)

**Status:** done

- [x] Header picker: the two groups plus "New Custom Weight Table…" with a sliders button beside it; reads "Choose a Weight Table…" only while no table is selected, and once a table is picked there's no way back to none; a newly saved Custom table started here becomes the strategy's table
- [x] No Weight Table: the stages and results are replaced by the one line from ticket 17, the strategy is kept underneath, the example picker and Compare are disabled (placeholders until 16 and 17), and nothing is calculated; while Upgrade Strategy has no table, adding a table on Echo Evaluation also picks it here
- [x] All five stages in one column ("Tune Stage N/5 (+5N)" with the stage-colour dot), each with its Discard Rate as a small stage-colour bar and "x% discarded here" (Discard Rate tooltip) or "nothing discarded"
- [x] Rules listed directly: rules in a box joined by "and", boxes separated by "or"; "+ and", "+ or" and "+ add a rule" are `<button>`s styled as links; the term Rule Group never appears
- [x] A new rule is an unfinished Substat Count rule (N = 1, no Substats) and focuses its first field; the kind picker followed by its phrase: "at least [N 1–5] of [pick Substats]" (multi-select popover, closes on click outside or focus leaving), "[Substat] at least [value select]", "at least [V]", "at least [P]% chance to reach a Target Score of [V]"
- [x] Switching kind keeps every kind's fields; × ("Remove this rule") removes a rule and an emptied box disappears; × moves focus to the previous rule's × in that stage, or to "+ add a rule"; impossible rules are allowed
- [x] Unfinished rules are highlighted with "Pick at least one Substat.", "Enter an Echo Score.", "Enter a chance in %." or "Enter a Target Score."; invalid numbers show "Enter a number of 0 or more." / "Enter a chance from 0 to 100."; the previous results stay faded with "Results are from before your last change. Finish the highlighted rule at Tune Stage N/5 (+5N) to update them." naming the first such stage
- [x] Results panel: Success Rate (large, tooltip); an unlabelled, `aria-hidden` "where Echoes end" stacked bar with a segment per discarding stage plus a gold Successful segment, 2px gaps and a legend entry per segment; "Average cost per Successful Echo" (Cost per Successful Echo tooltip) with Echoes started, Echo EXP, Tuners, Shell Credits; "Average Echo Score of Successful Echoes" and "Lowest Echo Score of a Successful Echo"; with Success Rate 0 the cost and Echo Score parts read "No Echo passes every Tune Stage."
- [x] Every valid change recalculates at once with no button or debounce; threshold and rule edits on an unchanged table rebuild no finishing tables
- [x] Number formats as in spec §17; a Playwright smoke test builds a one-rule strategy and sees a Success Rate

## Comments

**2026-11-22, implementation notes:** the strategy starts empty and lives in memory until tickets 16 ("Crit first" on a first visit) and 18 (remembered). "Start from an example" offers only "Choose…" and "Compare with another strategy" does nothing yet; both are disabled with no table. Renames and deletions of Custom tables in either tab's weights dialog reach the other tab through `src/customTables/tableEvents.ts`. Against the ticket 11 prototype (`npm run compare:prototype` now sets up `strategy-one` and `strategy-unfinished`), two differences are on purpose: a stage with rules that discards 0% reads "nothing discarded", and the "where Echoes end" bar has no caption (both spec §8).
