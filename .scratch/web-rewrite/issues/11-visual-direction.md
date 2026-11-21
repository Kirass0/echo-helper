# The visual direction

Type: prototype
Status: resolved
Blocked by: 07, 08
Map: [Echo Helper web rewrite](../map.md)

## Question

What does the app look like?

Using the layouts settled in the two UX prototypes, prototype a small number of visual directions to react to: light, dark or both, colour and type, density, and how the distribution chart and discard chart are drawn so they read correctly in each theme. The owner's bar is modern but, above all, functional.

## Comments

- 2026-11-17: Input from [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md): the layout is settled (prototype variant D). The cog (settings) icon used on Substat slots and Weight Table rows needs a redesign. The distribution chart draws the table in focus in colour and the others in grey, dashed Target Score and dotted ER Target Score lines, 60 equal bands over the range.

- 2026-11-17: Input from [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md): the layout is settled (prototype variant D). Things to draw: the per-stage Discard Rate bar beside each Tune Stage, the stacked "where Echoes end" bar, the paired A/B discard chart, green/red in the "B compared with A" column, and the faded results with a highlighted unfinished rule. "+ and", "+ or" and "+ add a rule" are text links, not buttons.

- 2026-11-19: Input from [How a new player learns the app](09-first-run-and-explanations.md): to draw: a permanent one-line purpose line under each tab with a "How it works" link; terms with a tooltip marked by a dotted underline (no ⓘ), and the tooltip itself; a third tab, About, which is a long text page with seven anchored sections and a small table of the 13 Reference Rolls. The small explanatory lines under Success Rate and the "where Echoes end" bar in the ticket 08 prototype are replaced by tooltips.

## Answer

Decided with the owner on 2026-11-20 against the prototype [`prototypes/11-visual-direction/index.html`](../prototypes/11-visual-direction/index.html). Variant D ("Chosen") is the decision; A (Daylight), B (Console) and C (Tide) stay in the file as the options that were considered. The layouts are those of tickets 07 and 08, unchanged.

**Base: direction A (Daylight)**
- Calm and airy: panels with a 1px border and 10px corners, no shadows, result boxes on a soft grey surface (6px corners), large bold numbers in the first row of result boxes, 20px spacing.
- One accent, an indigo (`#3346c8` light / `#8f9cff` dark), for the table in focus, links, the focus row and the primary button. Energy Regen things (the ER Target Score line) use a teal (`#0e7f7f` / `#46c8c8`).
- Tabs are text with a 3px accent underline on the open tab.

**Type: Onest** (from C) for everything, including numbers, which use tabular figures. The app self-hosts the font; the prototype loads it from Google Fonts.

**Themes: both, dark by default.** The palettes are the `body.vD.light` and `body.vD.dark` tokens in the prototype. Dark is the default on first open. Whether the choice follows the system setting or is a stored player choice, and where the switch sits, are not settled here (see Comments).

**Charts**
- The distribution chart is a **filled area** for the table in focus (accent line, 18% fill) with the other listed tables as grey lines, the Target Score as a dashed vertical line and the ER Target Score as a dotted teal line. **The target lines carry no labels on the chart**; the legend above the chart names them.
- **Tune Stages have one colour each** (from C), used wherever a Tune Stage appears: a dot before the stage name, its Discard Rate bar, its part of the "where Echoes end" bar. Light: `#9fd8cf #62bdb5 #4697ad #5a74b0 #7455a6`; dark: `#2c625d #36817d #3f87a3 #6279c4 #8d6fd0`. **Successful is gold** (`#d99a22` / `#f0b84a`).
- The paired A/B chart uses the accent for A and a grey for B.

**Icons in place of the cog**
- A Weight Table row opens the weights dialog with the **sliders icon** (from B). The Echo panel's change-this-Substat button is the **pencil icon** (from B).
- Every remove × is an **icon button of the same style** (thin stroke, muted, red on hover), in the Weight Table list, the Echo slots and rule rows. Each icon button has an accessible label and a tooltip.

**Comparing strategies**: the "B compared with A" column shows each difference as a **green or red pill** with its sign (from C).

**About**: a **side panel** of the seven sections on the left, sticky while scrolling, with the current section marked by an accent bar. It replaces the row of links on top. On a narrow screen it stacks above the text.

**Layout stability** (added 2026-11-20)
- Switching the table in focus, swapping a row's table, editing a target, adding or removing a Substat, or recalculating must not move or resize anything around it. Only the content inside a fixed space changes.
- Result boxes keep the same size whether they show a number, Reached / Not reached, or "—" with a reason.
- The chart legend has a fixed, single-line space. A long table name is truncated (full name in a tooltip) rather than wrapping.
- Panels below the results do not shift when the results change.
- Seen in the prototype, to be fixed in the build: switching tables makes the legend wrap onto a second line and resizes the Target Chance / ER Target Chance boxes.

**Also seen in the prototype, carried into the build**
- Long Substat names ("Resonance Liberation DMG Bonus") wrap onto several lines in an Echo slot. Icon buttons keep this to two lines at desktop width.
- The Weight Table list only fits at desktop width with its column headers wrapping onto two lines.

## Comments (after resolution)

- 2026-11-20: The theme switch (follow the system or not, where it sits, whether it is remembered) became [How the player switches between dark and light](21-theme-switch.md). Accessibility, including the contrast of the stage colours and pills, is [How far accessibility and keyboard use go](20-accessibility-and-keyboard.md).

- 2026-11-21: Changed by [How far accessibility and keyboard use go](20-accessibility-and-keyboard.md): a ▲ (better) or ▼ (worse) sits before each comparison pill, outside it; inputs get a separate `--field-line` border of at least 3:1; segments of the "where Echoes end" bar get 2px gaps and labels.
