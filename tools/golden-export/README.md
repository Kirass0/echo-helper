# Golden exporter

A one-off C# console project that exports the golden fixtures in `tests/fixtures/golden/` from the source WPF project's Core. The TypeScript Core must reproduce every value in them within `1e-9` (spec §3, "Golden fixtures"). CI never runs it.

**Exported from:** `EchoHelperClaude` at commit `f69385c0cd83dee4a1fc3765accc1234c234316e` (`f69385c`), on 2026-11-21. Its `EchoHelper.Core` is identical to `53ce242`'s; the commit changes only the Value Tables. The first export, from `53ce242` and its 28 tables, was replaced the same day.

**The output matches only that day's game data:** the 61 Value Tables in that commit's `data/valueTables.json` (the same as `%AppData%\EchoHelper\valueTables.json`, the catalogue's starting contents), and the roll values, roll chances and Tuning Costs hard-coded in that commit's `EchoHelper.Core`. When the web app's game data changes, the fixtures get regenerated from the TypeScript Core as regression snapshots. Rerunning this exporter is then only an optional cross-check against an equally updated WPF project.

## Running it

```
dotnet run -c Release --project tools/golden-export -- tests/fixtures/golden [path to EchoHelperClaude]
```

The source path defaults to `%USERPROFILE%\source\repos\EchoHelperClaude`. The project is never modified:

- The `.cs` files of `EchoHelper.Core` are compiled into the exporter by path (see `GoldenExport.csproj`). There is no ProjectReference, so nothing gets built into the source tree. You can override the path with `-p:EchoHelperSource=...`.
- The exporter stops unless `EchoHelper.Core` in the working tree matches commit `f69385c` (`git diff --quiet`).
- The Value Tables come from `git show f69385c:data/valueTables.json`, not from the working tree, which may hold newer tables.
- It needs the .NET 10 SDK. A run takes under half a minute.

Every input is fixed in `Fixtures.cs`: the sample Echo Values, the synthetic Echoes, the targets and the strategies. Nothing is random, so every run writes identical files.

## Fixture schema

The field names are the C# ones. The fixture loader maps them to glossary names: Echo Value → Echo Score, Value Table → Substat Weight Table, Target Value → Target Score, Kept → Successful, ChanceToReachTarget → Target Chance.

- Chances and rates are in [0, 1].
- Substat types are the C# enum names (`Atk_Percent`, `Def_Flat`, `Critical_Rate` and so on).
- Numbers are written as the shortest strings that round-trip to the same doubles.

Every file has a `Source` object with the repository, the full commit and the note above. Every Value Table appears as `{ "Name", "Weights": { <every SubstatType>: weight } }`, with 0 for an unlisted type.

### `top-percent.json`: the whole-table distribution behind Top Percent

- `SampleEchoValues`: −1 to 40 in steps of 0.25 (165 values, exact in binary).
- `Tables[]`: all 61 tables, in file order. Each has `ValueTable` and `Points[] { EchoValue, TopPercent, ErTopPercent }`. These come from `EchoValueDistribution.Of(table).TopPercent / ErTopPercent`, which count strictly higher Echo Values, with a `1e-9` tolerance.

### `echo-evaluation.json`: Echo Evaluation

- `ValueTables[]`: the 5 tables used: Mornye, Cantarella, Shorekeeper, Hsin (Unison) and Sigrika. Sigrika is the only table with an Energy Regen weight (2.23).
- `Cases[]`: 6 synthetic Echoes, each at Tune Stage 0 to 5 (its first N Substats in the listed order), each without targets and with both a Target Value and an ER Target Value. That makes 72 cases. Two of the Echoes are on Mornye, and both hold Flat DEF (weight 1.13). Four of the six hold Energy Regen, one of them on Sigrika.
  - `Name`, `ValueTableName`, `TuneStage`
  - `Substats[] { Type, Value }`, in insertion order, which is also the summation order of the Echo Value
  - `TargetValue`, `ErTargetValue`: a number or null
  - `TopPercent`, `ErTopPercent` of the current Echo Value, against the table's whole distribution
  - `Evaluation`: `EchoCalculator.EvaluateEcho` serialized as it is: `{ CurrentEchoValue, TargetValue, ErTargetValue, Outlook, Verdict }`
    - Below 5/5: `Outlook = { Best, Worst, Average, Median, ChanceToReachTarget, ChanceToReachErTarget, Distribution[] { Threshold, Chance }, DistributionWithEr }`, and `Verdict` is null. `Chance` is the chance of finishing at or above `Threshold`. The thresholds are the Core's own picks: real Echo Values from Worst to Best, at most about 500 of them. `DistributionWithEr` is present only when an ER Target Value is given.
    - At 5/5: `Outlook` is null, and `Verdict = { ReachesTarget, ReachesErTarget }` (true, false or null).

### `upgrade-strategy.json`: Upgrade Strategy

- `ValueTables[]`: Cartethyia, Mornye, Cantarella, Shorekeeper and Hsin (Unison).
- `Strategies[] { Name, RuleGroups[] { TuneStage, Rules[] } }`: the rules within a group are joined by "and", and the groups at a stage by "or". A rule is one of these:
  - `{ Kind: "MustHave", SubstatCount, SubstatTypes[] }`
  - `{ Kind: "StatValue", SubstatType, MinValue }`
  - `{ Kind: "MinEchoValue", MinEchoValue }`
  - `{ Kind: "Chance", MinChancePercent (0–100), TargetValue }`
- The 8 strategies:
  - the owner's saved strategy, transcribed from `%AppData%\EchoHelper\settings.json`: Chance 1% for 12.7 at stages 2 to 4, then MinEchoValue 12.7 at stage 5
  - an empty strategy
  - Substat Count rules
  - several Rule Groups at one stage
  - an impossible rule (Critical Rate ≥ 11)
  - an impossible Rule Group beside a possible one
  - Substat Roll rules on Flat ATK, Flat DEF, Flat HP and Energy Regen values
  - Target Chance from the first stage
- `Cases[]`: every strategy on every table, 40 cases. Each has `StrategyName`, `ValueTableName` and:
  - `Result`: `EchoCalculator.CalculateUpgradeStrategy` serialized as it is: `{ SuccessRate, AverageCostPerKeptEcho { Echoes, Exp, Tuners, ShellCredits }, Discards[] { TuneStage, DiscardRate }, AverageKeptEchoValue, MinimumKeptEchoValue }`. Discard Rates are shares of all Echoes started. The per-kept fields are null when no Echo is kept.

The Successful Echoes' Echo Score distribution is no longer exported (spec §19, items 9 and 11): the app never shows it and the Core doesn't calculate it. The C# Core never returned it either; the first export derived it in a separate `SuccessfulEchoScores.cs`, which is gone. The Average and Lowest Echo Score of the Successful Echoes are the Core's own `AverageKeptEchoValue` and `MinimumKeptEchoValue`.
