# Short texts: draft for editing

> **Superseded** on 2026-11-21 by the Answer in [The exact wording of the app's short texts](../issues/17-short-text-wording.md). Kept as the owner's working copy.

Draft for [The exact wording of the app's short texts](../issues/17-short-text-wording.md). Edit the wording directly. Notes in *(italics)* are context and can be deleted. Lines marked **Decide:** are behaviour proposals: keep, change or strike them.

## 1. Tooltips

Plain text, one or two short sentences, no links.

### Echo Evaluation

- **Substat Weight Table**: Determines how much each Substat is worth.
- **Echo Score**: The Echo's Substats added up, each counted by its weight in this table. Higher is better.
- **Target Score**: The Echo Score you aim for in a fully tuned Echo.
- **ER Target Score**: The Echo Score you aim for in a fully tuned Echo that also has Energy Regen.
- **Target Chance**: The chance that this Echo, once fully tuned, reaches your Target Score.
- **ER Target Chance**: The chance that this Echo, once fully tuned, has Energy Regen and reaches your ER Target Score.
- **Top Percent**: The share of all fully tuned Echoes with a higher Echo Score. Top 5% means only 1 in 20 is better.
- **ER Top Percent**: The share of all fully tuned Echoes that have Energy Regen and a higher Echo Score.

### Upgrade Strategy

- **Discard Rate** (on "70.4% discarded here"): The share of all Echoes that are discarded at this Tune Stage, not of those that reached it.
- **Success Rate**: The share of all Echoes that pass every Tune Stage and become Successful Echoes.
- **Target Chance** (rule kind): Keeps tuning only if the Echo's chance of reaching this rule's Target Score is at least this high.
- **Cost per Successful Echo**: What one Successful Echo costs on average, counting the Echoes discarded on the way, after refunds.

## 2. Purpose lines

Each ends with a "How it works" link to its About section. About has no purpose line.

- **Echo Evaluation**: Check how good an Echo is for a Resonator, and how likely it is to reach your Target Score once fully tuned.
- **Upgrade Strategy**: Try different Echo Tuning strategies and compare their cost.

## 3. Echo Evaluation prompts

### First open (no table listed)

- Bold: Pick a Resonator (Substat Weight Table) below.
- Small line under it: Each table determines how much each Substat is worth to one Resonator. You can add more than one and switch between them.

### Echo slots

- Next empty slot: Add the Substat revealed at +N
- Later slots: not tuned yet
- Grid buttons: Back, Cancel

### Result boxes ("—" plus a reason)

- Target Chance / Target Score, no target: Set a Target Score below
- ER Target Chance / ER Target Score, no target: Set an ER Target Score below
- ER boxes when the Echo has no Energy Regen (ER Target Score at 5/5, ER Top Percent): No Energy Regen
- Top Percent / ER Top Percent at Echo Score 0:
*(If Echo Score is 0 this should be 100%)*
- At 5/5: Reached / Not reached

### Weight Table list

- List heading: Resonators
- Add picker, list empty: Choose a Weight Table…
- Add picker, list not empty: Add another Weight Table…
- Last entry in the add picker: New Custom Weight Table…
- Picker group labels: Custom / Built-in
- Tag next to a Custom table's name: Custom

## 4. Upgrade Strategy prompts

### Header

- Weight Table picker, nothing picked: Choose a Weight Table…
- Example picker: Start from an example (placeholder: Choose…)
- Compare button: Compare with another strategy
- While comparing: Stop comparing; per strategy: Edit / Done; headings: Strategy A, Strategy B, B compared with A

### Stages and rules

- Empty stage in a compare summary line: every Echo keeps tuning
- Stage with 0% discarded: nothing discarded
- Links: + and, + or, + add a rule
- Rule phrases: at least [N] of [Substats] / [Substat] at least [value] / at least [Echo Score] / at least [P]% chance to reach a Target Score of [V]
- Substat list placeholder: pick Substats

### Unfinished rules

- Pick at least one Substat.
- Enter an Echo Score.
- Enter a chance in %.
- Enter a Target Score.
- Faded results: Results are from before your last change. Finish the highlighted rule at Tune Stage 2/5 (+10) to update them.

### No Weight Table picked (new)

- **Decide:** an Echo Score or Target Chance rule with no table is highlighted like an unfinished rule, and the results go stale in the same way.
  - Rule message: Pick a Substat Weight Table above to use this rule.
  - Faded results: Results are from before your last change. Pick a Substat Weight Table to update them.
- **Decide:** an example with Top x% thresholds can still be loaded without a table. Its threshold boxes stay empty, and they fill in when a table is first picked. This is the only time picking a table changes rule numbers.
  - Threshold message: Pick a Substat Weight Table above to work out the Top 5% Echo Score.
- Average / lowest Echo Score of Successful Echoes: — Pick a Substat Weight Table

Answer: This should work similarly to Echo Evaluation page. Without a table instead of showing the box where you can add rules show just the text that tells the user to pick a table first. Additionaly, on the first visit, if the user picks a table at Echo Evaluation page it should copy it to Upgrade Strategy page too, so it will be already there. After that it shouldn't be possible to pick a blank table. The example selector should also stay disabled if the table has not been selected yet. 

### Calculation states (fixed by ticket 14, confirm only)

- Calculating…
- Couldn't calculate this. Reload the page to try again.

## 5. One-time notices

- Custom table renamed by a new built-in: A new built-in Substat Weight Table is called 'X', so your Custom table was renamed to 'X (custom)'.
- Unreadable Custom tables: 1 Custom Weight Table couldn't be read and was removed. / N Custom Weight Tables couldn't be read and were removed.
- **Decide:** notices appear in a slim bar under the header, one line each, closed with ×. Each is shown once and never again, even if not closed.

Answer: Yes. But just for these two messages, I deleted the other two.

## 6. Weight Table editor (dialog)

- Default names: Aemeath (copy), Aemeath (copy 2); blank table: New Weight Table, New Weight Table 2
  *(Ticket 05 said "New Value Table", the old vocabulary.)*
- Built-in table note: Built-in tables can't be changed. Duplicate it to make your own.
- Buttons: Edit, Save, Cancel, Duplicate, Delete
- Field errors:
  - Enter a name.
  - Use at most 40 characters.
  - 'X' is already taken.
  - Enter a number of 0 or more.
- Delete confirmation: Delete 'X'? This can't be undone. Buttons: Delete, Cancel

Note: For the character limit, the field should not allow more than the limit.

## 7. Icon button labels (accessible label and tooltip)

- Pencil on an Echo slot: Change the Substat at +N
- Sliders on a table row: Weights of X
- × anywhere: Remove X (in a rule row: Remove this rule)
- Theme button: Switch to light theme / Switch to dark theme

## 8. Header and page title

- Header: Echo Helper, no subtitle; tabs Echo Evaluation, Upgrade Strategy, About; right side: Updated 20 Nov 2026, then the theme button.
- Browser tab title, the same on every tab: Echo Helper — Wuthering Waves Echo tuning calculator
