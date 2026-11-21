# 05: Golden exporter: write it, run it, commit the fixtures

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§3 "Golden fixtures" and "Exporter")

**What to build:** A small C# console project at `tools/golden-export/` that references the source Core by path, without editing it, and the golden fixture JSON it produces, committed to the repo. The implementing agent writes the exporter and the synthetic Echoes and strategies, runs it once locally against `%USERPROFILE%\source\repos\EchoHelperClaude` (commit `53ce242` or later), and commits the output. CI never runs it.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Inputs: the 28 tables in the source's `data/valueTables.json` as of 2026-11-16; each fixture carries its own input table
- [x] Per table (all 28): the Echo Score distribution behind Top Percent, sampled at a fixed list of Echo Scores
- [x] Echo Evaluation (about 5 tables, "Mornye" required, at least one Echo holding Flat DEF): partly tuned Echoes at every Tune Stage 0–5, with and without targets; recorded Echo Score, Top Percent, Target Chance, Best, Worst, Average and Median Echo Score, and the distribution points
- [x] Upgrade Strategy (about 5 tables): the owner's saved strategy (4 rules, from `%AppData%\EchoHelper\settings.json`) plus about 6 written ones, together covering every rule kind, several Rule Groups at one stage, an impossible rule and an empty strategy; recorded Success Rate, Discard Rate per stage, Tuning Cost, and the Successful Echoes' Echo Score distribution
- [x] The source commit used is recorded with the output, and the project carries a note that its output matches only that day's game data
- [x] The source project is not modified
