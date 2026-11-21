# Which words the app shows a new player

Type: grilling
Status: resolved
Map: [Echo Helper web rewrite](../map.md)

## Question

Do the terms in `GLOSSARY.md` appear in the UI as they are, or do some get friendlier labels?

The glossary was written for the tool's author. Walk each term a player will see (Echo Value, Value Table, Target Value, ER Target Value, Target Chance, ER Target Chance, Top Percent, ER Top Percent, Best and Worst Echo Value, Tune Stage, Upgrade Strategy, Rule Group, Upgrade Rule and its four kinds, Discard Rate, Tuning Cost) and decide its on-screen name, checking each against the words the game and its community already use. Update `GLOSSARY.md` for any term that changes.

## Answer

Decided with the owner in a grilling session on 2026-11-16. `GLOSSARY.md` carries every definition; this records what changed and why.

- **One vocabulary:** the on-screen label is the glossary term. There is no separate friendly name for anything. A short form is allowed where the context carries the rest (a "Best" column under an "Echo Score" heading). The TypeScript code uses the same names (`echoScore`, `substatWeightTable`, `targetScore`, `successRate`); the golden fixture loader maps the C# Core's old field names to them.
- **Renamed terms:**

  | Was | Now |
  |---|---|
  | Echo Value | Echo Score |
  | Value Table | Substat Weight Table |
  | Built-in / Custom Value Table | Built-in / Custom Substat Weight Table |
  | Target Value, ER Target Value | Target Score, ER Target Score |
  | Best / Worst Echo Value | Best / Worst Echo Score |
  | Median Roll | Reference Roll |
  | success rate, kept Echo (undefined) | Success Rate, Successful Echo (new terms) |
  | MustHave rule | Substat Count rule: "At least N of these Substats" |
  | StatValue rule | Substat Roll rule: "Crit Rate at least 8.1" |
  | MinEchoValue rule | Echo Score rule: "Echo Score at least V" |
  | Chance rule | Target Chance rule: "Chance of at least P% to reach a Target Score of V" |

- **Substat Weight Table short forms:** the full term wherever it is introduced or explained; "Weight Table" where space is tight or it repeats; "Substat Weights" only for the weights inside a table, never the table. "Built-in" and "Custom" alone serve as group headings in the picker. One entry is a "weight".
- **Kept as they are:** Target Chance, ER Target Chance, Top Percent, ER Top Percent, Tune Stage, Upgrade Strategy, Upgrade Rule, Discard, Discard Rate, Tuning Cost, and the tab names "Echo Evaluation" and "Upgrade Strategy".
  - "ER" is abbreviated in labels and spelled out as Energy Regen only in explanations.
  - Top Percent is shown as a value like "Top 5%" under the label "Top %", with "ER Top %" beside it. ER Top % needs a tooltip.
  - A Tune Stage is always shown out of 5 with its Echo Level: "Tune Stage 2/5 (+10)".
  - Costs read "Average cost per Successful Echo", in the game's resource names: Echo EXP, Tuners, Shell Credits.
- **New terms for figures already on screen:** Average Echo Score and Median Echo Score. Whether the web app shows both is left to [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md).
- **Rule Group:** stays in the glossary as it was. Showing the word to players is not forbidden, but the owner hopes a good enough design never needs it, at least in the main views. The capability is fixed: a player can still say "these rules, or else those rules" at a Tune Stage, and the word "or" on screen is fine. [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md) carries this as a constraint.
- **Echo Score explained on screen:** "each Substat's weight times how its roll compares with a reference roll, added up".
- **Raised, decided elsewhere:** Reference Roll is the 4th of a Substat type's 8 values, not a real median, and Flat DEF's is 40 against values of 40 to 70. The owner is considering changing the values, possibly by patching the WPF app before any port work. That is [Which roll value each Substat type is normalised by](15-reference-roll-values.md); this ticket changed the name only.
- **Basis:** game and community usage was judged from the agent's and owner's knowledge, not checked against a live source.
- No ADR: every name here is easy to change later.

## Comments (after resolution)

- 2026-11-21: Changed by [Assemble the spec](22-assemble-the-spec.md). The result boxes are labelled with the full terms "Top Percent" and "ER Top Percent", not "Top %" / "ER Top %". The value still reads "Top 5.00%".
