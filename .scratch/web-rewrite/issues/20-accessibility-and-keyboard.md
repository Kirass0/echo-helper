# How far accessibility and keyboard use go

Type: grilling
Status: resolved
Blocked by: 16
Map: [Echo Helper web rewrite](../map.md)

## Question

What accessibility level does the app commit to, and how is each tab used with the keyboard alone?

Decide the target (e.g. WCAG 2.2 AA, or a named subset), and for the settled designs: the keyboard path through the Echo slots' type grid and value buttons, the Weight Table list (focusing a row versus its controls), rule rows and the "+ and" / "+ or" links, the weights dialog (focus trap, Escape), and tooltips (focus as well as hover and tap). Also decide how the charts are made readable without sight (a text alternative or a table), whether the stage colours and the green/red pills meet contrast and colour-blind needs in both themes ([The visual direction](11-visual-direction.md) adds signs to the pills and a dot per stage), what is announced when results update live, and whether reduced motion matters beyond the bar transitions.

## Comments

- 2026-11-21: Input from [The exact wording of the app's short texts](17-short-text-wording.md): icon button labels are fixed there ("Change the Substat at +N", "Weights of X", "Remove X" / "Remove this rule", "Switch to light/dark theme"). The tooltips for Median Echo Score and the Target Chance rule kind were dropped.

- 2026-11-21: Input from [How both tabs work on a phone](16-phone-layout.md): on a phone every popup is a bottom sheet (focus trap, Escape and a tap on the dimmed area close it), About is an accordion, Upgrade Strategy has a sticky Success Rate bar at the bottom with a "Results" link, and comparing uses an A | B switch (a tab-like control) showing one strategy at a time. Weight Tables are cards whose whole surface sets focus, like the desktop rows.

## Answer

Decided with the owner in a grilling session on 2026-11-21.

**No standard.** The app commits to no WCAG level, no audit and no automated accessibility test in CI. It takes the small changes below. Only two of them touch an earlier decision: the arrows beside the comparison pills (an addition to [The visual direction](11-visual-direction.md)) and the row tab stop (an addition to [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md)).

**Native controls, simple keyboard model**
- The three tabs are `<a>` links with `aria-current`, since they change the hash.
- "+ and", "+ or" and "+ add a rule" look like links but are `<button>`s.
- The phone A | B switch is two buttons with `aria-pressed`.
- The About accordion uses `<details>`/`<summary>`.
- Every dialog and bottom sheet is a `<dialog>` opened with `showModal()`, for its focus trap and Escape.
- There are no custom ARIA grid, listbox or tablist widgets and no arrow-key navigation. The keyboard model is Tab, Shift+Tab, Enter, Space and Escape.

**Echo slots**
- "Add the Substat revealed at +N" moves focus to the first type button. The pencil moves focus to the current pick instead.
- Picking a type moves focus to the first value button.
- Picking a value moves focus to the next empty slot's "Add" button, or to this slot's pencil if no slot is empty.
- Escape acts as Cancel and returns focus to the button that opened the picking.

**Substat Weight Table rows and cards**
- Each row (phone: card) is a tab stop of its own, placed before its controls, with the focus ring drawn around the whole row. Enter or Space puts that table in focus. The focused row carries `aria-current="true"`.
- The tab order is row → name picker → Target Score → ER Target Score → sliders → ×.
- Mouse behaviour stays as in ticket 07 (a click elsewhere on the row). Using a row's controls never changes which table is in focus, so an unfocused table's targets can be edited without switching to it.

**Focus after adding or removing**
- A new rule ("+ and", "+ or", "+ add a rule") gets focus on its first field.
- A rule's × moves focus to the × of the rule before it in that stage, or to that stage's "+ add a rule" if the stage is now empty.
- A Weight Table row's × moves focus to the next row's ×, or to the add picker if none is left.
- An Echo slot's × moves focus to that slot's "Add" button.

**Popups**
- Escape closes every popup and returns focus to its opener. This covers the Substat Count picker popover, the weights dialog, the Custom table editor, the delete confirmation and the phone bottom sheets.
- The popover also closes when focus leaves it.
- Escape in the Custom table editor with unsaved edits acts as Cancel, with no "discard changes?" prompt.

**Tooltips**
- Each dotted-underline term is a `<button>` styled as text. Its tooltip shows on keyboard focus as well as hover and tap.
- The tooltip is linked with `aria-describedby`, closes on Escape without moving focus, and stays open while the pointer is over it.
- Icon buttons also show their tooltip on focus. Their accessible names are the labels fixed in [The exact wording of the app's short texts](17-short-text-wording.md).

**Charts**
- The distribution chart gets `role="img"` and a one-sentence label generated from numbers already on screen. Example: "Echo distribution for Cantarella: final Echo Score from 8.2 to 31.5, Target Score 20 at 34% chance."
- The "where Echoes end" bar and the paired A/B chart are `aria-hidden`, because every number they show is also text: the Discard Rates, the Success Rate and the difference table.
- There is no data table.

**Colour**
- Measured against the panels of ticket 11's palette:
  - Light Tune Stage 1 and 2 reach 1.59:1 and 2.22:1, and dark Tune Stage 1 reaches 2.31:1.
  - Some neighbouring stages are nearly identical in the dark theme (3/4 at 1.03:1, 4/5 at 1.05:1).
  - The light ER teal on the grey result-box surface is 4.41:1.
  - The panel border `--line` is about 1.35:1.
  - All other text colours, and the green and red pills, are 4.9:1 or more.
- The stage palette stays, under one rule: colour is never the only carrier of meaning.
  - Each stage dot sits beside its stage name.
  - Each Discard Rate bar has its "x% discarded here" text.
  - The segments of the "where Echoes end" bar get a 2px gap in the panel colour and a visible label or legend entry each.
- Text inputs, selects and pickers get a new `--field-line` border token of at least 3:1 against their background in both themes, separate from the panel `--line`.
- The light ER teal is darkened slightly where it is used as text on the grey surface.
- The grey lines for the other tables in the chart stay as they are.

**Comparison pills**
- Each "B compared with A" pill keeps its green or red and its sign. A small ▲ (better) or ▼ (worse) sits **before the pill, outside it**. The arrows mean better and worse, not up and down: "+12%" Tuners gets ▼.
- Equal values get a neutral grey pill with no arrow.
- Hidden text reads "better" or "worse" for screen readers.

**Live announcements**
- One polite live region speaks a single short line about 1 s after results settle:
  - On Echo Evaluation, the focused table's Target Chance, or its Echo Score if it has no Target Score.
  - On Upgrade Strategy, the Success Rate, or the Success Rates of A and B when comparing.
- The unfinished-rule message and "Couldn't calculate this. Reload the page to try again." are announced when they appear.
- "Calculating…" is never announced.

**Reduced motion**
- `prefers-reduced-motion: reduce` turns off all transitions and animations: bar transitions, the bottom-sheet slide-in, accordion opening, and smooth scrolling for the "Results" link and About anchors, which then jump.
- The pending fade still applies, but appears instantly.

**Sizes**
- Icon buttons and text-link buttons get a hit area of at least 24×24px, through padding and without changing their look.
- The layout must not break at 320px wide.
- The phone sizes stay as decided in [How both tabs work on a phone](16-phone-layout.md), with no 44px targets.

No ADR (all easy to reverse) and no new glossary terms.

## Comments (after resolution)

- 2026-11-21: Changed by [Assemble the spec](22-assemble-the-spec.md). Pills show the relative change ("+12.3%"), confirming this ticket's "+12%" example. A, B's Success Rates and Discard Rates are on screen as text in each strategy's compare summary, which keeps the paired chart's aria-hidden valid. An Echo slot's × moves focus to the next empty slot's Add button, since later Substats move up.
