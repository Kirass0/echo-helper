# How a new player learns the app

Type: grilling
Status: resolved
Blocked by: 06, 07, 08
Map: [Echo Helper web rewrite](../map.md)

## Question

What does a first-time visitor see, and how does the app teach its concepts?

Decide the landing state and defaults (which tab, which Value Table, an example Echo or an empty form), where explanations live (inline help, tooltips, a guide page, worked examples), how much is explained up front versus on demand, and how the meaning of numbers like Top Percent and Target Chance is made plain next to the result itself.

Input from [Which roll value each Substat type is normalised by](15-reference-roll-values.md): the Reference Rolls (what a weight means, and the 13 values) are explained in the help text only, not in the weight editor.

## Comments

- 2026-11-17: Input from [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md): the Echo Evaluation first-open state is decided: no table and no Substats, with a prompt in the results area pointing at the real Weight Table picker below (not a one-off chooser screen). Boxes without a number show '—' plus a short reason ('Set a Target Score below', 'No Energy Regen'). The chart's vertical axis is chance per 1/60-of-range band and is labelled as such; its meaning needs explaining in the help.

- 2026-11-17: Input from [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md): the app ships example Upgrade Strategies in a "Start from an example" picker, with Echo Score thresholds set as a Top x% of the selected Substat Weight Table and worked out on load. Which strategy (an example or empty) a first-time visitor sees on the Upgrade Strategy tab is left here. The prototype explains Success Rate and the "where Echoes end" bar in one line of small text each.

- 2026-11-19: Input from the new Built-in Value Table catalogue, whose weights mostly come from [docs/substat-weights.md](../../../docs/substat-weights.md) (see the comment in [The built-in Value Table catalogue and its credits](04-value-table-catalogue-and-credits.md)). The help text (not the first visit) has to explain:
  - **How the Crit Rate weight works:** it is the worth of one roll while Crit Rate is still below 100% (see [Crit Rate is measured without the 100% clamp](../../../docs/substat-weights.md#crit-rate-is-measured-without-the-100-clamp)). It does not shrink as a build nears the cap, so the player must know that Crit Rate past 100% is worth nothing.
  - **Edge cases in individual tables:** Jingran's HP weights are 0 because the HP bonus caps at 50k HP and is normally easy to reach. Sigrika's table keeps an Energy Regen weight because her damage grows with Energy Regen and it is hard to max out.
  - **Credits:** a simple "thanks to..." mention of ChemX32, Maygi and riley with their links (decided in ticket 04), not a claim that the weights come from them.

## Answer

Decided with the owner on 2026-11-19. The source app explains almost nothing (two tooltips: the stale warning and Copy Results), so all of this is new.

**First visit (nothing remembered)**
- The app opens on **Echo Evaluation**, in the empty state decided in [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md).
- **Upgrade Strategy** opens with the **"Crit first"** example loaded and **no Substat Weight Table** selected. "Crit first" uses only Substat Count and Substat Roll rules, so it needs no table, and the player sees real Discard Rates straight away. Rules and examples that need a table (Echo Score, Target Chance, Top x% thresholds) say so until a table is picked. No table is ever chosen by default, on either tab.
- **Target Score starts empty** when a table is added with nothing remembered for it (no pre-fill). The "Set a Target Score below" state stays as ticket 07 decided.
- **No guided tour and no welcome popup.**

**Purpose line**
- Each tab has one permanent line under it saying what the tab is for, ending in a small "How it works" link to that tab's section of About. It can't be dismissed and nothing is stored for it.

**Tooltips on less-clear terms**
- A term with a tooltip is marked by a **dotted underline on the term itself** (like the "conservative" tooltip on myrtle.moe), not by a separate ⓘ. It opens on hover on desktop and on tap on a phone, and a tap elsewhere closes it.
- A tooltip is **plain text, one or two short sentences, with no links**. The long explanation lives in About.
- Terms with a tooltip:
  - Echo Evaluation: Substat Weight Table, Echo Score, Target Score, ER Target Score, Target Chance, ER Target Chance, Top Percent, ER Top Percent, Median Echo Score, and the chart's vertical axis ("chance per band").
  - Upgrade Strategy: Discard Rate (a share of all Echoes started, not of those that reached the stage), Success Rate, Target Chance as a rule kind, and the cost per Successful Echo.
- No tooltip, because they are clear to a player: Substat, Tune Stage, Average Echo Score, Best Echo Score, Substat Count, Substat Roll, the Echo Score rule, Echoes started, EXP, Tuners, Shell Credits.
- Results are **not** explained by always-visible sentences in each box (that option was rejected). The one-line small texts under Success Rate and the "where Echoes end" bar in the ticket 08 prototype give way to tooltips.

**The About tab**
- A third tab, **About** (`#about`), last in the tab bar. Its sections, in order, each with an anchor:
  1. **What Echo Helper does**: the two tabs in two or three sentences.
  2. **Evaluating an Echo**: a short walkthrough (pick a table, enter Substats, set a Target Score) and every result explained, including the chart.
  3. **Echo Score and Reference Rolls**: the formula, the 13 Reference Rolls as a small table, one worked example (e.g. Crit Rate 8.1 at weight W adds W × 8.1 / 7.5).
  4. **Substat Weight Tables**: Built-in tables are baselines, not answers; how the weights are worked out; the Crit Rate weight is the worth of a roll below 100% and Crit Rate past 100% is worth nothing; notes on individual tables (Jingran's HP weights are 0 because the HP bonus caps at 50k HP; Sigrika keeps an Energy Regen weight); Custom tables.
  5. **Upgrade Strategies**: rules joined by "and" and "or", the four rule kinds, Discard Rate versus Success Rate, the Discard refund (75% of EXP, 30% of Tuners, no Shell Credits), and the cost per Successful Echo.
  6. **Credits**: "thanks to..." ChemX32, Maygi and riley, with links (ticket 04).
  7. **Disclaimer**: the fan-project text. Its wording, and whether it also appears elsewhere, belongs to [Hosting and delivery on GitHub Pages](12-hosting-and-delivery.md).

**What the spec fixes**
- The **exact wording** of every tooltip, both purpose lines and every empty-state or missing-input prompt is fixed in the spec, settled in [The exact wording of the app's short texts](17-short-text-wording.md).
- About is fixed only as the outline above plus the facts each section must state. Its prose is written during the build and reviewed in the real app.

## Comments (after resolution)

- 2026-11-21: Changed by [The exact wording of the app's short texts](17-short-text-wording.md). Upgrade Strategy with no Weight Table now shows only "Pick a Substat Weight Table above to build an Upgrade Strategy." in place of the stages and results. The example picker and Compare are disabled. "Crit first" is kept underneath. While Upgrade Strategy has no table, adding one on Echo Evaluation also picks it there, and once a table is picked the player can't go back to none. These tooltips were dropped: Median Echo Score, "chance per band", the Target Chance rule kind, and "Where Echoes end" (whose label also goes).
