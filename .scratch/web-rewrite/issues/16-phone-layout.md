# How both tabs work on a phone

Type: prototype
Status: resolved
Blocked by: 11
Map: [Echo Helper web rewrite](../map.md)

## Question

How does each tab work on a phone-sized screen (about 360 to 430px wide), without breaking and without needing a separate design?

Take the settled layouts: [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md) (the two columns stack and the Weight Table list scrolls sideways) and [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md) (the five-stage rule editor with phrase-style rule rows, the results panel, and the two-strategy comparison with its difference table). Decide where each one stacks, scrolls or shortens, how the rule rows wrap, how popups such as the Substat picker behave, and whether comparing two strategies is offered on a phone at all. Check in a real narrow viewport: headless Edge would not render below about 500px.


## Comments

- 2026-11-19: Input from [How a new player learns the app](09-first-run-and-explanations.md): tooltips open on tap on a phone and close on a tap elsewhere; they must fit a 360px screen. There is a third tab, About, so the tab bar holds three tabs.

- 2026-11-20: Input from [The visual direction](11-visual-direction.md): direction A with Onest, dark by default, in [`prototypes/11-visual-direction/index.html`](../prototypes/11-visual-direction/index.html) variant D; start the phone prototype from it. The Weight Table list only fits at desktop width with its headers wrapping onto two lines. Long Substat names wrap in the Echo slots. Change, Weights and remove are icon buttons (pencil, sliders, ×), which saves width. About has a sticky side panel of its sections that has to become something else on a phone (stacked above the text in the prototype).

- 2026-11-20: Input from [Whether calculations need a worker, progress and stale-result handling](14-calculation-responsiveness.md): phones are slower than the ~1 s desktop worst case, so the "Calculating…" fade and its always-reserved label slot will show more often there; the phone layout must keep that slot without shifting content. Caches are capped at roughly 250–300 MB.

## Answer

Decided with the owner on 2026-11-21 against the prototype [`prototypes/16-phone-layout/index.html`](../prototypes/16-phone-layout/index.html). Open [`frame.html`](../prototypes/16-phone-layout/frame.html) to see a layout at 360, 390 and 430px side by side. Each width is an iframe, so each is a real narrow viewport. Three layouts were built: A Stack, B Cards and C Focused. **B is the decision, except for the strategy results and About, which follow C.** A, and the rest of C, stay in the file as the options that were considered.

**Widths**
- The phone layout applies at **600px wide and below**. Between 601 and 820px, the tablet stacking from [The visual direction](11-visual-direction.md)'s prototype applies: one column, results above the stages, and the Weight Table list as the desktop table scrolling sideways. Above 820px, the desktop layout is unchanged.
- On a phone the page padding and the gaps are 12px, panels have 14px padding, and the large numbers are 26px.

**Header**
- Row 1 holds "Echo Helper" on the left, with "Updated 20 Nov 2026" and the theme button on the right.
- Row 2 holds the three tabs, which fit at 360px.
- The purpose line follows below, as on desktop.

**Echo Evaluation (B)**
- The order is Your Echo, then the results for the table in focus, then the Substat Weight Tables list.
- **Echo slots:**
  - Slots stay full width. The type grid opens inside the slot, two across.
  - The value buttons are four across, with Back and Cancel under them.
  - Long Substat names wrap.
- **Result boxes:**
  - Target Chance and ER Target Chance share the first row.
  - The six other boxes are three across, in two rows, with smaller numbers.
  - Labels keep their full glossary terms and may wrap to two lines. The prototype's shortened "ER Top" / "Median" / "Average" / "Best" are not used, because [Which words the app shows a new player](06-user-facing-vocabulary.md) makes the label always the glossary term.
  - Boxes keep a fixed minimum height, so a reason line or "Reached" never resizes them.
- **Chart:**
  - On a phone it is drawn at half the desktop width (360 units, 4 axis ticks), so the axis text stays readable.
  - The legend is one line with short names: the table name (truncated), "Others", "Target", "ER".
- **Weight Table list as cards:** each listed table is a card.
  - Line 1: the table-name picker, the Custom tag, sliders and ×.
  - Line 2: Target Score and ER Target Score inputs, labelled above.
  - Line 3: Echo Score, Target Chance and ER Target Chance, which read Reached / Not reached at 5/5.
  - Tapping a card outside its controls puts that table in focus. The focused card gets the accent border, tint and left bar.
  - The add picker sits below the cards. Nothing on this tab scrolls sideways.

**Upgrade Strategy**
- **Header:** the Weight Table picker, "Start from an example" and "Compare with another strategy" each take a full-width line.
- **Stages:** these are stacked. Each shows its stage name with the stage dot, the Discard Rate bar and "x% discarded here" above its rules.
- **Rule rows (B):**
  - Line 1 holds "and" (for a second rule in a box), the kind picker, and the × at the right edge.
  - The phrase wraps on the lines below, so × always sits in the same place.
  - The Target Chance phrase takes three lines at 360px.
- **Results (C):**
  - The full results panel sits **below the stages**. This reverses ticket 08's "on a narrow screen it moves above the stages" for phones only. The tablet width keeps it above.
  - A **sticky summary bar at the bottom of the screen** shows the Success Rate, the bar of where Echoes end and a "Results" link that scrolls to the panel.
  - The bar's numbers fade with "Calculating…" like the panel's.
  - Page content gets bottom padding so the bar never covers the last stage.
- **Comparing (B), offered on a phone:**
  - A switch "Strategy A | Strategy B" under the header shows one strategy at a time, in its summary or Edit view.
  - "B compared with A" follows below. Each result row is stacked: the label on one line, then A, B and the green/red pill.
  - The paired chart labels its stages "1/5" … "5/5" and "Succ.".
  - While comparing there is no sticky bottom bar, because the difference rows are the results. This was not shown in the prototype; it follows from C's bar belonging to the single-strategy view.
- **Unfinished rules and faded results** behave as on desktop. The message sits at the top of the results panel below the stages.

**Popups (B): bottom sheets**
- The Substat list of a Substat Count rule opens as a sheet from the bottom of the screen: a grab handle, a title, then one checkbox per line with 18px boxes and Done.
- The weights dialog is a bottom sheet too. So are the Custom table editor (Edit, Save, Cancel, Duplicate, Delete), the delete confirmation and any other dialog.
- A sheet is at most 85% of the screen height and scrolls inside. Tapping the dimmed area above, or pressing Escape, closes it.
- On desktop these remain the anchored popover and the centred dialog.

**About (C): accordion**
- On a phone the side panel is replaced by the seven sections as an accordion, each a heading that opens its text.
- A link to `#about-<section>` (such as "How it works") opens that section and scrolls to it. More than one section may be open at once.

**Tooltips:** they open on tap and close on a tap elsewhere. They are at most 290px wide (`calc(100vw - 20px)` on a narrower screen), placed below the term or above it if there is no room, as decided in [How a new player learns the app](09-first-run-and-explanations.md).

**Layout stability:** the "Calculating…" label keeps its reserved slot in the results heading on a phone, and the cards and boxes keep fixed heights, as on desktop.

No ADR and no new glossary terms.
