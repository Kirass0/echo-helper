# Calculating substat weights from a DPS calculator

Reference notes on how to get per-character substat weights for Wuthering Waves echoes from a working DPS calculator.

The weights are a **general estimate**. They don't assume anything about the player's current build, and they should describe how much each substat is worth over the whole process of building a character, from no substats to a finished build.

## Core idea

A weight is the **average marginal DPS gain from one substat roll**, measured on the best build at every level of investment and then averaged.

1. For each number of useful substat lines N, find the best allocation of those lines.
2. At each allocation, measure the gain from one roll of each stat (finite difference).
3. Average the gains over N.

**Weights are raw gains, not normalized.** Store them as "% DPS per roll", e.g. `CR = +2.1%`. Normalizing against the best stat drops the absolute size of each gain and gives no new information, since the ratios between stats are the same either way. If a UI needs it, normalize only for display.

## Step 1: Best allocation for each N

1. Start from mainstats, set bonus, weapon and team buffs, with no substats.
2. Pick the useful stats (usually CR, CD, ATK%, flat ATK, and the relevant DMG Bonus type).
3. For each N in 0..N_MAX, find the allocation of **N useful lines** that gives the highest DPS, with **at most 5 lines per stat**. The Crit Rate clamp is **on** during this search.

### N_MAX depends on the resonator (decided)

A build has 25 substat lines, but not all of them can be useful lines:

```
N_MAX = min(25 − ER_lines, 5 × len(useful_stats))
```

- **ER lines.** The rotation's Energy requirement is paid with ER lines that are held fixed (just enough to fill the bar, none past it). They sit on the echoes, so they take lines away from the useful stats.
- **The 5-line cap.** With only 3 useful stats, no real build has more than 15 useful lines.

Builds past `N_MAX` can't exist, so they aren't searched or measured. This means weights for different resonators are averaged over different ranges (e.g. N = 5–22 for a resonator needing 3 ER lines, 5–15 for one with only 3 useful stats). We accept that: each resonator's weights describe the builds that resonator can actually reach.

### The 5-line cap is a hard limit

A substat can't appear twice on one echo, and a build has 5 echoes, so each stat can have at most 5 lines. Going past 5 when building allocations produces a build that can't exist. That makes capped stats (usually crit) look worse and the other stats look better than they are.

The cap applies to **building allocations only**. Stats already at 5 lines are still measured with +1 roll. That measures the value of higher-quality rolls on existing lines, which is what the scoring formula uses (`value / reference_roll`).

### Exhaustive search, not greedy

Adding the single best roll each step can get stuck because stats depend on each other (CR and CD). With about 6 useful stats at 0–5 lines each there are at most 6⁶ ≈ 47k combinations. Check every combination once, group them by line count N, and keep the highest-DPS combination in each group. This is cheap.

```
for c in product(range(6), repeat=len(useful_stats)):
    N = sum(c)
    if dps(build + allocation(c)) > best_dps[N]:
        alloc[N] = c
        best_dps[N] = dps(build + allocation(c))
```

The best allocations don't have to build on each other (`alloc[N+1]` isn't always `alloc[N]` plus one line). That's fine: each N is measured on its own.

## Step 2: Gain at each allocation

```
gain[N][CR]    = central_diff(alloc[N], CR,    clampCrit = false)
gain[N][other] = central_diff(alloc[N], other, clampCrit = true)

central_diff(a, stat, clamp) =
    (dps(a + one_roll(stat), clamp) − dps(a − one_roll(stat), clamp)) / 2 / dps(a, clampCrit = true)
```

The `clamp` flag applies to the two stepped builds only. The divisor is always the build's **real (clamped) DPS**, because a weight is a share of the DPS the build actually deals. If CR's divisor were unclamped, any hit already at 100% CR (e.g. from a Liberation-only Crit Rate buff) would make the divisor too large and the CR weight too small.

### Measurement rules

- **Measure per Reference Roll, not per percent.** Stats roll in different sizes (a Crit Rate roll is about half a Crit DMG roll). `one_roll(stat)` is one **Reference Roll** of that Substat type: the chance-weighted median roll, i.e. the lowest of its eight possible values that a roll has at least a 50% chance to be at or below (e.g. Crit Rate 7.5, Crit DMG 15, ATK% 8.6, Flat ATK 40). The web Core computes it from the tier weights; see [Which roll value each Substat type is normalised by](../web-rewrite/issues/15-reference-roll-values.md). The weight measurement and the Echo Score must use the same roll size. If they don't, the ranking between Substat types shifts.
- **Use central differences** (above) to remove the dependence on step direction.
- **Use full-rotation DPS, not a single hit.** DMG Bonus stats (Basic / Heavy / Skill / Liberation) are only worth something in proportion to that damage type's share of the rotation.
- **Include team buffs and the enemy's RES/DEF in the build.** External ATK% buffs reduce the value of ATK% from echoes (same additive bucket). Crit buffs move where the CR/CD balance point is.
- **Clamp Crit Rate per hit, not once for the whole build.** Some crit buffs only apply to certain hits (e.g. Liberation-only Crit Rate), so some hits can reach the cap while others are still below it.
- **Energy Regen is ignored** (decided). It isn't part of the weights or the allocation search. The build carries fixed ER lines for the rotation's Energy requirement (see [N_MAX](#n_max-depends-on-the-resonator-decided)).
- **The measured lines must replace every substat spread the build can wear.** If the calculator has more than one spread (e.g. a default and a high-investment one), swap the lines into all of them. Otherwise a build set to the other spread ignores the lines, and every gain comes out as 0.

### Crit Rate is measured without the 100% clamp

The weight for CR should mean "worth per roll **while it's still below 100%**". Players already know that pushing past 100% is worthless, so drops caused by overcapping shouldn't lower the weight.

Below 100%, DPS rises in a straight line with Crit Rate (expected damage scales with `1 + CR × CD`). The slope depends only on Crit DMG and the other multipliers, not on how much CR the build already has. Turning off the clamp for CR's measurement gives exactly this slope:

- **Below the cap**, the clamp wasn't doing anything, so the result is the true value.
- **At or above the cap**, the result continues the below-cap slope instead of dropping to zero.

| Step | Crit clamp |
|---|---|
| Allocation search (`alloc[N]`) | **On**. Without it, the search would overcap CR because `CR × CD` keeps growing. The builds would be impossible and CD would look better than it is. |
| Gain for CD, ATK%, DMG Bonus, flat ATK | **On**. CD's real value depends on the actual (capped) crit chance. |
| Gain for CR | **Off** |

The calculator needs a `clampCrit` flag. With per-hit clamping, turning the flag off removes the clamp on every hit.

## Step 3: Average over N

```
weight[stat] = mean(gain[N][stat] for N in N_RANGE)
```

- This is the value of a stat over the whole build process, not at a single point. Stats that are strong early (ATK%) and stats that get stronger with more investment (crit) are both represented fairly.
- Interactions are handled fairly. Crit gets its value when CR and CD are actually being built together, not all at once when one of them is removed.
- This is the same idea as Shapley values (the standard fair way to split a combined result), but it only follows the best path rather than every possible order of adding stats. That's appropriate for a build-up that a player is aiming at.
- **N_RANGE:** start with N = 5–N_MAX. The lowest N can be noisy, because one or two lines don't say much about a build. Adjust after looking at the curves. The upper end is never past `N_MAX`.

### Keep the curve

Store `gain[N][stat]` along with the averaged weight. It shows how each stat's value changes with investment (e.g. ATK% fading, crit rising). That's useful for checking that the results make sense and for explaining the weights to players.

## Using the weights

Score an echo:

```
score = Σ weight[stat] × (value / reference_roll[stat])
```

A weight is the DPS gain per Reference Roll, so `value / reference_roll` converts the echo's actual roll into a number of Reference Rolls before multiplying.

With raw gains, the score is an estimate of the echo's substats' contribution to DPS, in %.

## Why not subtract substats from a strong build?

We considered starting from a strong build and measuring the DPS lost by removing substats. We rejected it:

- Removing **one** roll is still a slope at a single point. It's the −1 side of the central difference, which is already included.
- Removing **all** lines of a stat counts interactions twice. Removing all CR also makes the CD lines nearly worthless, and that loss gets charged to CR. Removing all CD charges the same shared value to CD. The per-stat losses add up to more than the substats are actually worth together.
- A strong build with one stat missing isn't the situation of a player starting out.

## Changes since the first version

The first version measured weights at **one baseline** (the best build with N ≈ 15–18 useful lines) and gave special treatment to the player's actual build. The changes:

1. **Weights are averaged over all levels of investment, not measured at one baseline.**
   *Why:* One baseline only says what a stat is worth near a nearly finished build, which isn't useful for someone starting a new character. The goal is the value over the whole range.
   *Change:* "Baseline: one setup" and "Choosing N" were replaced by Steps 1–3 (best allocation for every N, gain at each, average over `N_RANGE`).

2. **The gain curve `gain[N][stat]` is kept** as a by-product, for checking the results and explaining them to players.

3. **Crit Rate is measured with the 100% clamp off.**
   *Why:* The CR weight should mean "worth below 100%". Drops from overcapping shouldn't lower it, because players already know that going past 100% is worthless.
   *Change:* New section "Crit Rate is measured without the 100% clamp". The clamp stays on for the allocation search and for every other stat. The calculator needs a `clampCrit` flag.

4. **The per-hit crit clamp rule was added.** Hit-specific crit buffs mean the cap is reached separately for each hit.

5. **The player's build is no longer assumed to be known.**
   *Why:* The weights are a general estimate.
   *Change:* Removed the advice to compare two echoes directly in the player's build. Weights that depend on the player's build, and checks for how much CR the player has left before the cap, were never added.

6. **The search was rewritten to find the best allocation for every N in one pass**, instead of searching once for a single fixed N.

7. **Added "Why not subtract substats from a strong build?"** to record the alternative we considered and why we rejected it.

8. **The roll size is the Reference Roll, not the average roll.**
   *Why:* The app already normalizes Echo Scores by the Reference Roll (the chance-weighted median, defined in [issue 15](../web-rewrite/issues/15-reference-roll-values.md)). Weights measured per average roll would use a different roll size than the scoring, and that would shift how Substat types rank against each other.
   *Change:* `one_roll(stat)` and the scoring formula now use `reference_roll`.

9. **Every gain is divided by the real (clamped) DPS, including CR's.**
   *Why:* With the clamp off for the divisor too, hits already at 100% CR from hit-specific buffs made the divisor too large and lowered the CR weight. That's the opposite of what turning the clamp off is for.
   *Change:* `central_diff` divides by `dps(a, clampCrit = true)`. The clamp flag applies to the two stepped builds only.

10. **N runs to `N_MAX`, not 25.**
    *Why:* Fixed ER lines and the 5-line cap mean some resonators can't have 25 useful lines. Builds past that can't exist.
    *Change:* New section "N_MAX depends on the resonator". The search, gains and `N_RANGE` stop at `N_MAX`. We accept that this averages different resonators over different ranges.

11. **The measured lines replace every substat spread the build can wear.**
    *Why:* A build set to a spread that wasn't swapped ignores the lines, and every gain is 0.
    *Change:* New rule under "Measurement rules".

Unchanged: raw (not normalized) gains, measuring per roll rather than per percent, central differences, full-rotation DPS, team buffs and enemy stats in the build, the 5-line cap for building allocations only, ER ignored, and the scoring formula.
