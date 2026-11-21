# The exact wording of the app's short texts

Type: grilling
Status: resolved
Blocked by: 09
Map: [Echo Helper web rewrite](../map.md)

## Question

What exactly do the app's short texts say, word by word?

[How a new player learns the app](09-first-run-and-explanations.md) decided these are fixed in the spec: every tooltip (the list of terms is in that ticket), the purpose line under each tab (ending in a "How it works" link to About), and every empty-state and missing-input prompt on both tabs. Some prompts are already worded in [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md) and [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md) and only need confirming. New ones include the message on a rule or example that needs a Substat Weight Table while none is selected. Tooltips are plain text, one or two short sentences, with no links, and use the glossary terms.

## Comments

- 2026-11-20: Input from [Hosting and delivery on GitHub Pages](12-hosting-and-delivery.md): the header shows "Updated 20 Nov 2026" on the right (format fixed there). The app keeps the name Echo Helper; whether the header or page title carries a subtitle is left to this ticket. The disclaimer's wording is already fixed there.
- 2026-11-20: Input from [What happens to stored data that no longer fits](18-outdated-stored-data.md): two one-time notices need final wording. One is for Custom Weight Tables that couldn't be read and were removed (draft: "1 Custom Weight Table couldn't be read and was removed"). The other is for a built-in table that left the catalogue with a deploy and was removed from the player's list or strategy (draft: "'X' is no longer a built-in Substat Weight Table and was removed from your list"). They use the same mechanism as the "(custom)" rename notice from ticket 05.
- 2026-11-20: Draft of every short text, for the owner to edit: [drafts/17-short-texts.md](../drafts/17-short-texts.md).

## Answer

Decided with the owner on 2026-11-21, working from [drafts/17-short-texts.md](../drafts/17-short-texts.md) (the owner edited it, then a round of follow-up questions). The list below is final and replaces the draft. Where a text has `X` or `N`, it is the table name or a number.

**Tooltips** (plain text, no links)
- Echo Evaluation:
  - **Substat Weight Table**: Determines how much each Substat is worth.
  - **Echo Score**: The Echo's Substats added up, each counted by its weight in this table. Higher is better.
  - **Target Score**: The Echo Score you aim for in a fully tuned Echo.
  - **ER Target Score**: The Echo Score you aim for in a fully tuned Echo that also has Energy Regen.
  - **Target Chance**: The chance that this Echo, once fully tuned, reaches your Target Score.
  - **ER Target Chance**: The chance that this Echo, once fully tuned, has Energy Regen and reaches your ER Target Score.
  - **Top Percent**: The share of all fully tuned Echoes with a higher Echo Score. Top 5% means only 1 in 20 is better.
  - **ER Top Percent**: The share of all fully tuned Echoes that have Energy Regen and a higher Echo Score.
- Upgrade Strategy:
  - **Discard Rate** (on "70.4% discarded here"): The share of all Echoes that are discarded at this Tune Stage, not of those that reached it.
  - **Success Rate**: The share of all Echoes that pass every Tune Stage and become Successful Echoes.
  - **Cost per Successful Echo**: What one Successful Echo costs on average, counting the Echoes discarded on the way, after refunds.
- Dropped from ticket 09's list:
  - Median Echo Score, a common term.
  - The chart's "chance per band".
  - The Target Chance rule kind, which is picked from a plain menu with no room for a tooltip.
  - The "Where Echoes end" bar. Its label text goes too, including the heading above the paired A/B chart in compare mode, which keeps only its A/B legend.

**Purpose lines** (each followed by "How it works", linking to its About section; About has none)
- Echo Evaluation: Check how good an Echo is for a Resonator, and how likely it is to reach your Target Score once fully tuned.
- Upgrade Strategy: Try different Upgrade Strategies and compare what they cost.

**Echo Evaluation**
- First open, in bold: "Pick a Substat Weight Table for your Resonator below." Small line under it: "Each table determines how much each Substat is worth to one Resonator. You can add more than one and switch between them."
- Slots:
  - The next empty slot reads "Add the Substat revealed at +N", and later slots read "not tuned yet".
  - The type and value grid has the buttons Back and Cancel and no heading.
- Box reasons:
  - "Set a Target Score below" and "Set an ER Target Score below".
  - "No Energy Regen", on the ER boxes when the Echo has none.
  - At 5/5, the target boxes show "Reached" or "Not reached".
  - Top Percent and ER Top Percent always show their calculated number, even at Echo Score 0, where the number is just under 100% because the share counts strictly higher scores. The "Echo Score is 0" reason is dropped.
- Chart:
  - Headed "Echo distribution", with "Final Echo Score" on the horizontal axis and "Chance" on the vertical one.
  - This reverses ticket 07's axis label that named the 1/60 bands. The bands are explained only in About.
  - At 5/5 the chart stays, with each table's final Echo Score as a single band. The "Fully tuned: the Echo Score is final." note is dropped.
- Weight Table list:
  - Headed "Substat Weight Tables". "Resonators" was rejected, because a Resonator can have several tables.
  - The add picker reads "Choose a Weight Table…" while the list is empty and "Add another Weight Table…" after that. Its last entry is "New Custom Weight Table…".
  - Picker groups are "Custom" and "Built-in", and the tag beside a name is "Custom".

**Upgrade Strategy**
- Header:
  - The Weight Table picker reads "Choose a Weight Table…" only while there is no table. Once a table is picked, the player can't go back to none.
  - "Start from an example" (placeholder "Choose…") and "Compare with another strategy".
  - While comparing: "Stop comparing", Edit and Done for each strategy, and the headings "Strategy A", "Strategy B" and "B compared with A".
- Stages:
  - An empty stage shows only "+ add a rule". The text "Every Echo that reaches this stage keeps tuning." is dropped.
  - A compare summary line for an empty stage reads "every Echo keeps tuning", and a stage with 0% discarded shows "nothing discarded".
  - The add links are "+ and", "+ or" and "+ add a rule".
  - Rule phrases follow ticket 08: "at least [N] of [Substats]", "[Substat] at least [value]", "at least [Echo Score]", "at least [P]% chance to reach a Target Score of [V]". The Substat list placeholder is "pick Substats".
- Unfinished rules:
  - The four messages are "Pick at least one Substat.", "Enter an Echo Score.", "Enter a chance in %." and "Enter a Target Score."
  - Faded results read "Results are from before your last change. Finish the highlighted rule at Tune Stage 2/5 (+10) to update them."
- Calculation states (ticket 14): "Calculating…" and "Couldn't calculate this. Reload the page to try again."

**No Weight Table on Upgrade Strategy** (a behaviour change, reversing parts of tickets 09 and 18)
- Without a table, the stages and the results panel are replaced by one line: "Pick a Substat Weight Table above to build an Upgrade Strategy."
- The example picker and "Compare with another strategy" are disabled.
- The strategy is kept underneath and appears once a table is picked. On a first visit it is "Crit first".
- **While Upgrade Strategy has no table, adding a table on Echo Evaluation also picks it on Upgrade Strategy.** This covers the first visit and a strategy whose table vanished (ticket 18). The app keeps no "first visit" flag.
- Ticket 09 had "Crit first" giving Discard Rates with no table. Ticket 18 had Substat Count and Substat Roll rules still calculating after the table vanished. Neither happens now.
- Ticket 14's empty, faded Top x% threshold boxes, shown while the distribution loads, stay.

**One-time notices**
- They appear in a slim bar under the header, one line each, closed with ×. A notice is shown once and never again, even if not closed.
- Renamed Custom table: "A new built-in Substat Weight Table is called 'X', so your Custom table was renamed to 'X (custom)'."
- Unreadable Custom tables: "1 Custom Weight Table couldn't be read and was removed." or "N Custom Weight Tables couldn't be read and were removed."
- A built-in removed by a deploy now disappears **silently** from the Weight Table list and from the strategy. This reverses ticket 18's notice.

**Weight Table editor**
- Default names: "Aemeath (copy)", then "Aemeath (copy 2)". A blank table is "New Weight Table", then "New Weight Table 2", replacing ticket 05's "New Value Table".
- A Built-in table shows "Built-in tables can't be changed. Duplicate it to make your own."
- Buttons: Edit, Save, Cancel, Duplicate, Delete.
- The name field accepts at most 40 characters, and a pasted name is cut off at 40, so that limit has no error message.
- Field errors: "Enter a name.", "'X' is already taken." and "Enter a number of 0 or more."
- Delete confirmation: "Delete 'X'? This can't be undone." with Delete and Cancel.

**Icon buttons** (accessible label and tooltip)
- Pencil: "Change the Substat at +N".
- Sliders: "Weights of X".
- ×: "Remove X", or "Remove this rule" in a rule row.
- Theme: "Switch to light theme" or "Switch to dark theme".

**Header and page title**
- The header shows "Echo Helper" with no subtitle, then the tabs Echo Evaluation, Upgrade Strategy and About. On the right are "Updated 20 Nov 2026" and the theme button.
- The browser tab title is "Echo Helper — Wuthering Waves Echo tuning calculator" on every tab.

No ADR and no new glossary terms.

## Comments (after resolution)

- 2026-11-21: Changed by [Assemble the spec](22-assemble-the-spec.md). New texts: "Enter a number of 0 or more." (target boxes and rule score fields), "Enter a chance from 0 to 100.", "No Echo passes every Tune Stage.", and "Replace your current strategy with 'X'? This can't be undone." (Replace / Cancel). The box labels are "Top Percent" / "ER Top Percent". The Success Rate row of "B compared with A" is dropped. Full list: spec §10.
