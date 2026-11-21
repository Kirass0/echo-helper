# Echo Helper

Helps decide whether to keep tuning or to discard Echoes in Wuthering Waves, by working out the Substats an Echo can still roll, with their chances, and scoring them for a Resonator.

## Language

**Echo**:
A piece of equipment with up to five Substats, which are revealed one at a time by tuning.

**Substat**:
One stat on an Echo, made of a Substat type (e.g. Crit Rate) and a rolled value taken from that type's fixed set of eight possible values.

**Reference Roll**:
The fixed value of a Substat type that rolled values are divided by, so that different Substat types can be compared. It is the type's chance-weighted median roll: the lowest of its possible values that a roll has at least a 50% chance to be at or below. A Substat rolled at exactly its Reference Roll adds its weight to the Echo Score.
_Avoid_: Median Roll

**Tune Stage**:
How many Substats of an Echo have been revealed, from 0 to 5. A "5/5 Echo" is fully tuned. It is always shown out of 5 and with the Echo Level that unlocks it: "Tune Stage 2/5 (+10)".
_Avoid_: Level (when meaning 0–5), tune level

**Echo Level**:
The in-game level of an Echo, from 0 to 25. Each fifth level unlocks one Tune Stage.

**Resonator**:
A playable character that an Echo is evaluated for.
_Avoid_: Character

**Substat Weight Table**:
The weight of each Substat type for one Resonator: how much one Reference Roll of that Substat is worth to that Resonator. A Substat type the Substat Weight Table doesn't list has a weight of 0. It reflects one set of assumptions (team, rotation, equipment), so two different Substat Weight Tables for the same Resonator can both be reasonable. "Weight Table" is the short form where space is tight; "Substat Weights" means the weights inside a table, never the table itself.
_Avoid_: Value Table, Resonator table

**Built-in Substat Weight Table**:
A Substat Weight Table that ships with the app as a baseline, taken from theorycrafters' DPS calculations. It is a sensible starting point, not a correct answer. A player cannot change it.

**Custom Substat Weight Table**:
A Substat Weight Table a player made for their own use, by copying another Substat Weight Table or starting from nothing. It exists only in that player's browser and has no lasting tie to the Substat Weight Table it was copied from.
_Avoid_: User table, personal table

**Echo Score**:
The score of an Echo for a Substat Weight Table: for each Substat, the weight multiplied by the rolled value relative to the Reference Roll (rolled value divided by Reference Roll), summed.
_Avoid_: Echo Value, Full Value, Echo Full Value

**Top Percent**:
How rare an Echo Score is for a Substat Weight Table: the share of all fully tuned Echoes whose Echo Score is strictly higher. "Top 5%" means only 5% of fully tuned Echoes are better. A partly tuned Echo is still compared with fully tuned Echoes.
_Avoid_: Percentile

**ER Top Percent**:
The chance that a fully tuned Echo has an Energy Regen Substat and a strictly higher Echo Score for a Substat Weight Table. It is a share of all fully tuned Echoes, not only those with Energy Regen, so it is never above the Top Percent. It applies only to Echoes that have an Energy Regen Substat. A partly tuned Echo is still compared with fully tuned Echoes.

**Energy Regen (ER)**:
A Substat type that most Substat Weight Tables weight at 0, but that is worth having on an Echo. It is handled through the ER Target Score instead of through the weight.

## Evaluation

**Target Score**:
The Echo Score a fully tuned Echo must reach (be at or above) to be worth keeping.
_Avoid_: Target Value, beat, exceed

**ER Target Score**:
A separate, usually lower Target Score that applies only to Echoes that have an Energy Regen Substat.

**Target Chance**:
The chance that an Echo, once fully tuned, finishes with an Echo Score at or above the Target Score.
_Avoid_: Chance to reach Target Score

**ER Target Chance**:
The chance that an Echo, once fully tuned, finishes with an Energy Regen Substat and an Echo Score at or above the ER Target Score. Like the ER Top Percent, it is a share of all outcomes, not only those with Energy Regen.
_Avoid_: Chance with ER to reach ER Target Score

**Best Echo Score**:
The highest Echo Score an Echo can still finish with once fully tuned, however unlikely. **Worst Echo Score** is the lowest.
_Avoid_: Best simulated, max roll

**Average Echo Score**:
The chance-weighted mean of the Echo Scores an Echo can still finish with once fully tuned.

**Median Echo Score**:
The lowest Echo Score an Echo has at least a 50% chance to finish at or below once fully tuned.

## Upgrade Strategies

**Upgrade Strategy**:
The Rule Groups for each Tune Stage that decide whether to keep tuning an Echo or discard it.
_Avoid_: Ruleset, Echo Strategy

**Upgrade Rule**:
One condition checked when an Echo reaches a Tune Stage. If it fails, its Rule Group fails. There are four kinds: Substat Count (at least N Substats from a list), Substat Roll (a specific Substat at or above a value), Echo Score (Echo Score at or above a value), and Target Chance (a Target Chance of at least P percent, for the rule's own Target Score).
_Avoid_: MustHave, StatValue, MinEchoValue, Chance rule, FullValue rule

**Rule Group**:
A set of Upgrade Rules at one Tune Stage that must all pass. An Echo keeps tuning past a Tune Stage if any one of its Rule Groups passes, and is discarded there if none does. A Tune Stage without Rule Groups lets every Echo through; a Rule Group always has at least one Upgrade Rule.
_Avoid_: Ruleset, Alternative, Upgrade Path

**Discard**:
Abandoning an Echo partway through tuning. 75% of the EXP and 30% of the Tuners spent on it are refunded; Shell Credits are not.

**Discard Rate**:
The share of all Echoes started under an Upgrade Strategy that are discarded at one Tune Stage. It is not the share of the Echoes that reached that Tune Stage. The Discard Rates of all Tune Stages and the Success Rate add up to 100%.

**Successful Echo**:
An Echo that passes every Tune Stage of an Upgrade Strategy and so is never discarded.
_Avoid_: Kept Echo

**Success Rate**:
The share of all Echoes started under an Upgrade Strategy that become Successful Echoes.
_Avoid_: Keep Rate

**Tuning Cost**:
The EXP, Tuners and Shell Credits spent to tune an Echo up to a Tune Stage.
