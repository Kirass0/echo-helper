# Which roll value each Substat type is normalised by

Type: grilling
Status: resolved
Map: [Echo Helper web rewrite](../map.md)

## Question

Do the Reference Roll values change before the port, and if so to what, where, and with what knock-on effects?

Facts from the source Core (`EchoHelper.Core/Echo.cs`), found while resolving [Which words the app shows a new player](06-user-facing-vocabulary.md):

- The Reference Roll of a Substat type is the 4th of its 8 possible values (Crit Rate 8.1 from 6.3 to 10.5). It is neither a true median nor the chance-weighted median or average.
- Flat DEF breaks the pattern: its values are 40, 40, 50, 50, 60, 60, 70, 70 and its Reference Roll is 40. Flat ATK is 40 against 30, 30, 40, 40, 50, 50, 60, 60.

Decide:

- What a Reference Roll should be (4th value, chance-weighted average, something else) and the resulting value for each of the 13 Substat types.
- What a change does to the built-in Substat Weight Tables, whose weights come from ChemX32's and Maygi's spreadsheets and assume some roll size per weight. Do the weights need rescaling, or were they always meant for the new values?
- Where the change is made. The owner's first idea is a small patch to the WPF app before any port work, so that the golden fixtures are exported from already-corrected values and [How the new calculation is proven equal to the old one](03-core-parity.md) holds unchanged. The alternative is changing the values in the TypeScript Core after parity is proven and regenerating the fixtures.
- Whether the map's note that game data is "ported as it is" needs amending.

## Answer

**Corrected facts.** The question's premise was partly wrong, and the owner supplied what the sources assume:

- The 4th value is the chance-weighted median for 10 of the 13 Substat types. It differs only for Crit Rate and Crit Damage (whose three lowest values hold 70% of the chance) and for Flat DEF (whose 40 matches nothing).
- The current Reference Rolls are exactly the roll sizes Maygi's spreadsheet uses. ChemX32's spreadsheet uses the chance-weighted median, except DEF%, which it sets to 10.0.
- The weights were copied from both spreadsheets as they stood. So today every table from ChemX32's sheet, which is most of the catalogue, has its Crit Rate and Crit Damage weights divided by 8.1 and 16.2 where they assume 7.5 and 15: crit is undervalued by about 7% against the other Substats.
- Changing a Reference Roll and rescaling a weight by the same ratio changes no Echo Score. Changing one without the other shifts how Substat types rank against each other.

**Decisions.**

- **What a Reference Roll is:** the chance-weighted median roll of the Substat type, the lowest of its possible values that a roll has at least a 50% chance to be at or below. `GLOSSARY.md` is updated. The name Reference Roll stays.
- **The 13 values.** Three change:

  | Substat type | Reference Roll | Was |
  |---|---|---|
  | Crit Rate | 7.5 | 8.1 |
  | Crit Damage | 15 | 16.2 |
  | Flat DEF | 50 | 40 |
  | ATK%, HP%, Basic Attack, Heavy Attack, Skill, Liberation | 8.6 | same |
  | DEF% | 10.9 | same |
  | Energy Regen | 9.2 | same |
  | Flat HP | 430 | same |
  | Flat ATK | 40 | same |

- **DEF% follows the rule, not ChemX32's sheet:** 10.9, not 10.0. The rule has no exceptions.
- **The weights are fixed in the catalogue recheck**, the owner task that [The built-in Value Table catalogue and its credits](04-value-table-catalogue-and-credits.md) already places before public launch. It still blocks nothing in the build. The conversion rules, results rounded to two decimals:
  - A table from Maygi's sheet: Crit Rate and Crit Damage weights × 7.5/8.1 (0.926); Flat DEF weight × 50/40 (1.25).
  - A table from ChemX32's sheet: DEF% weight × 10.9/10.0 (1.09); nothing else.
  - Until the recheck, tables from Maygi's sheet overvalue crit by about 8%.
- **Where the values change:** in the source WPF project first, by the owner, outside this map: the three constants in `EchoHelper.Core/Echo.cs` and the tests that hard-code 8.1, 16.2 and 40. Its `data/valueTables.json` stays as it is. The spec names this patch as a precondition of the golden fixture export, so the port stays a pure port and [How the new calculation is proven equal to the old one](03-core-parity.md) holds unchanged. The fixtures carry their own input tables, so unrescaled weights in them are harmless.
- **Where the player sees Reference Rolls:** in the help text only (what a weight means, and the 13 values). The weight editor does not show them.
- **Map note:** game data is ported as it stands in the source project after the Reference Roll patch; the open exception is removed.
- **No ADR.** The values are three constants and easy to change again.

## Comments

**2026-11-16, after the WPF patch.**

- **The precondition is met.** The source project carries the three corrected values as of commit `53ce242` on its `main` (`EchoHelper.Core/Echo.cs`); all its tests pass, and the sampling oracles needed no change. Its `data/valueTables.json` was not touched. The golden fixtures can be exported.
- **Amendment, agreed by the owner: the web Core computes the Reference Rolls.** It keeps no table of 13 values. Each Reference Roll is derived from data the Core already carries, the Substat type's eight possible values and its tier weights, by the rule above. This removes a second source of truth that had drifted for 3 of the 13 types.
  - The comparison is made on the integer tier weights (cumulative weight × 2 ≥ total weight), so no floating-point tolerance is involved.
  - One test pins all 13 computed values to the table in the Answer, which equals the patched source constants. That test is what keeps parity with the source.
  - The help text that lists the 13 values reads them from the same function.
  - This is the one place the port departs from the file-by-file translation in [How the new calculation is proven equal to the old one](03-core-parity.md); a note is left there.
  - Still no ADR: it is easy to reverse.
