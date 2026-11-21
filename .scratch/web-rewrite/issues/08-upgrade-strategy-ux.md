# How Upgrade Strategy looks and behaves

Type: prototype
Status: resolved
Blocked by: 06
Map: [Echo Helper web rewrite](../map.md)

## Question

What should the Upgrade Strategy screen be for someone who has never built a strategy?

Prototype against the source `EchoHelper.Wpf/Views/UpgradeStrategyView.xaml` and its view models: the Rule Group editor per Tune Stage (OR between groups, AND within, four kinds of Upgrade Rule), the results (success rate, Discard Rate per Tune Stage, Tuning Cost, the discard chart), and how an incomplete rule is shown.

Constraint from [Which words the app shows a new player](06-user-facing-vocabulary.md): the capability is fixed (a player can say "these rules, or else those rules" at a Tune Stage), but the owner hopes for a design where the player never needs the term Rule Group, at least in the main views. The word "or" on screen is fine. The four kinds are now the Substat Count, Substat Roll, Echo Score and Target Chance rules, and "success rate" is the glossary term Success Rate.

Decide whether the app offers ready-made example strategies, and whether two strategies can be compared side by side now that Strategy Code and Copy Results are gone.

## Comments

- 2026-11-17: Prototype at [`prototypes/08-upgrade-strategy/index.html`](../prototypes/08-upgrade-strategy/index.html) (double-click; `?variant=A|B|C`). A: Checkpoints (all five Tune Stages in one column, Discard Rate beside each, results in a side panel). B: One stage at a time (funnel stepper, "or" as side-by-side boxes, results bar). C: Compare (examples gallery, two strategies side by side, difference table). Results are sampled approximations, not the Core. Awaiting the owner's reactions.

- 2026-11-17: Input from [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md) (Echo Evaluation's choices; the Upgrade Strategy screen may differ for its own reasons): the Weight Table editor is a dialog opened by a cog (settings) button next to the table; there is one place to pick tables, a two-group select (Custom first, then Built-in) with a 'New Custom Weight Table…' entry; Substats are picked from a type grid then value buttons.

## Answer

Decided with the owner on 2026-11-17 against the prototype [`prototypes/08-upgrade-strategy/index.html`](../prototypes/08-upgrade-strategy/index.html). Variant D is the chosen design; A, B and C stay in the file as the options that were considered. Results in the prototype are sampled approximations, and its styling is a placeholder for [The visual direction](11-visual-direction.md).

**One strategy (the default view)**

- All five Tune Stages in one column, each labelled "Tune Stage 2/5 (+10)", with that stage's Discard Rate beside it ("70.4% discarded here", a small bar) instead of a separate discard chart.
- A stage's rules are listed directly, with no "Keep tuning if" lead-in. Rules in a box are joined by "and"; another box below, after the word "or", is another way to pass. Text links "+ and", "+ or" and, on an empty stage, "+ add a rule" (links, not buttons). An empty stage reads "Every Echo that reaches this stage keeps tuning." The term Rule Group never appears.
- A rule reads as its kind (Substat Count, Substat Roll, Echo Score, Target Chance) followed by its fields as a phrase: "at least [1] of [Crit Rate, Crit Damage]", "[Crit Rate] at least [8.1]", "at least [V]", "at least [P]% chance to reach a Target Score of [V]". A rule is removed with ×; removing a box's last rule removes the box. Switching kind keeps the other kinds' fields (as in WPF).
- A results panel beside the stages: Success Rate, a bar showing where Echoes end (discarded per Tune Stage, then Successful), the average cost per Successful Echo (Echoes started, Echo EXP, Tuners, Shell Credits), and the Average and lowest Echo Score of Successful Echoes. On a narrow screen it moves above the stages.
- The header holds the Substat Weight Table picker, a "Start from an example" picker and a "Compare with another strategy" button.

**Comparing two strategies**

- "Compare with another strategy" turns the current strategy into Strategy A and adds a blank Strategy B beside it. At most two strategies.
- The results panel becomes a table below both strategies: A, B and "B compared with A" for every result row, every row coloured green or red (more Successful Echoes counts as better; whether they are worse Echoes shows in the Echo Score rows), plus a paired chart of where Echoes end.
- Each strategy has its own example picker (the same plain picker as the one-strategy view) and an Edit/Done button. While editing, a strategy looks like the one-strategy view; otherwise it is one line per Tune Stage summarising its rules ("at least 1 of Crit Rate, Crit Damage or Crit Rate at least 9.3").
- One Substat Weight Table, in the header, applies to both strategies.
- "Stop comparing" keeps Strategy A and discards Strategy B.

**Example strategies**

- The app ships example strategies, loaded from the picker. The prototype's four: Keep every Echo, Crit first, Double crit or one great crit roll, Chance to reach a Top 5% Echo.
- An example never states a fixed Echo Score. Its thresholds are set as "the Echo Score of a Top x% Echo for this Substat Weight Table" and worked out from the selected table when the example is loaded (e.g. Top 5% is 14.8 for Cantarella, 12.3 for Jinhsi). Once loaded they are ordinary numbers in ordinary rules: changing the Weight Table later does not change them; loading the example again recomputes them.

**Unfinished rules**

- A new rule starts unfinished. An unfinished rule is highlighted with a short message saying what is missing ("Pick at least one Substat.", "Enter an Echo Score.", "Enter a chance in %.", "Enter a Target Score."). The previous results stay on screen faded, with "Results are from before your last change. Finish the highlighted rule at Tune Stage 2/5 (+10) to update them." Impossible rules are still allowed (source ADR 0001).

**Popups**

- A popup such as the Substat picker opens from the field and closes when the player clicks anywhere outside it. Not built into the prototype; noted in its header.

**Left to other tickets**

- Whether results recalculate as you type or on a button, progress and cancellation: [Whether calculations need a worker, progress and stale-result handling](14-calculation-responsiveness.md). The prototype recalculates as you type.
- Whether strategies are saved, and how many: [What the browser remembers](10-persistence.md).
- The phone layout: only roughly checked, as headless Edge would not go below about 500px wide.

- 2026-11-20: [Whether calculations need a worker, progress and stale-result handling](14-calculation-responsiveness.md) drops the prototype's ⅓ s recalculation delay: results recalculate immediately in a Web Worker, newest input wins, and pending results fade with "Calculating…" after ~300 ms. Example strategies with Top x% thresholds show those boxes empty and faded until the distribution arrives.

- 2026-11-21: Changed by [How both tabs work on a phone](16-phone-layout.md): at 600px and below the results panel sits below the stages, with a sticky Success Rate bar at the bottom of the screen; popups are bottom sheets; comparing shows one strategy at a time with an A | B switch.

## Comments (after resolution)

- 2026-11-21: Changed by [Assemble the spec](22-assemble-the-spec.md). "B compared with A" shows relative changes and has no Success Rate row (Echoes started per Successful Echo carries it). In compare mode, each strategy's summary lines end with their Discard Rate and the summary ends with a Success Rate line. The Weight Table picker matches Echo Evaluation's (two groups, "New Custom Weight Table…", sliders button beside it). Picking an example over a strategy with rules first asks "Replace your current strategy with 'X'? This can't be undone." Invalid rule numbers show field errors ("Enter a number of 0 or more.", "Enter a chance from 0 to 100.") and count as unfinished. Success Rate 0 shows "No Echo passes every Tune Stage."
