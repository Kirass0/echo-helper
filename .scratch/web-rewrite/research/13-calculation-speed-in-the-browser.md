# How fast the ported calculation runs in a browser: measurements

Ticket: [How fast the ported calculation runs in a browser](../issues/13-calculation-speed-in-the-browser.md). Measured 2026-11-19.

Benchmark code and raw results: [prototypes/13-calculation-speed/](../prototypes/13-calculation-speed/) (throwaway).

## Setup

- **Machine**: Intel Core i5-12600K (10 cores, 16 threads), Windows 11 Pro 10.0.26200, plugged-in desktop. A fast desktop CPU: an average laptop is likely 1.5–3× slower, and a phone more (not measured).
- **Browsers**: Chrome 158 and Edge 157, both headless with a fresh profile, page loaded from `file://`. Everything runs synchronously on the main thread. Node 26.8.1 (V8) was also run as a check, and it falls in the same range as the browsers.
- **Native**: copies of the source Core `.cs` files (commit `53ce242`), Release build, on .NET 10.0.13. The source targets .NET 9, and the WPF app would run them on .NET 9. Copying left the source project untouched. `Parallel.For` in `PrepareChances` stays as it is ("16 threads"), and a switch also times it sequentially ("1 thread").
- **TypeScript port**: [core.ts](../prototypes/13-calculation-speed/core.ts), bundled by esbuild. It is a line-by-line port of `EchoValueDistribution`, `FinishingEchoValues`, `EchoCalculator.EvaluateEcho` and `UpgradeStrategyPass`: the C# `Dictionary<double, …>` became a JS `Map<number, …>`, and the pass's struct key became a string key. It isn't proven equal, but its checksum over every result agrees with C# to all digits (`2974.3219804427526` in C#, Node, Chrome and Edge), so it does the same work.
- **Inputs**: all 61 tables of the owner's new catalogue (`%AppData%\EchoHelper\valueTables.json`, copied into the prototype folder), and every workload for every table:
  - *Distribution*: `EchoValueDistribution.Of`, the whole-table Top Percent calculation.
  - *Echo at k/5*: `EvaluateEcho` with targets set, for an Echo typed one Substat at a time (Crit Rate 8.1, Crit Damage 16.2, ATK% 9.4, Liberation 8.6). At 0/5 this is a fresh Echo.
  - *Strategies*: the four examples of the Upgrade Strategy prototype, with thresholds set to the table's Top 5% / Top 10% Echo Score: Keep every Echo, Crit first, Double crit or one great crit roll (Substat Roll and Echo Score rules), and Chance to reach a Top 5% Echo (Target Chance rules at 1/5 to 4/5, which build 599 finishing tables).
- **Timing**: a cold run on the first table, then per call. A call under 20 ms is repeated for at least 50 ms and averaged. A heavier call is timed once, after warm-up. Cold first calls are within ~10–20% of the warm ones, so warm-up barely matters for the heavy cases.

## The cost depends on the table, by up to 500×

Every heavy workload scales with the number of **distinct fully tuned Echo Scores** a table produces. A table with few non-zero weights, or "round" weights, collapses many Echoes onto the same score. The new catalogue's precise weights on many Substat types don't. Across the 61 tables that number runs from 27,915 (Iuno subDPS) to 3,821,038 (Mornye). 43 tables are above 200,000. The source ADR's "about 150 ms for a whole Value Table" was measured on tables of the ~160,000 kind (Jinhsi now takes 34 ms natively).

All times are in ms, one table, warm:

| Table | Distinct Echo Scores | Distribution C# / Chrome / Edge | Echo at 0/5 C# / Chrome | Echo at 1/5 C# / Chrome | Double crit C# / Chrome | Chance C# (16 threads / 1 thread) / Chrome / Edge |
| --- | --: | --- | --- | --- | --- | --- |
| Mornye | 3,821,038 | 1,417 / 10,021 / 6,604 | 1,723 / 8,672 | 78.2 / 393 | 296 / 1,619 | 707 / 1,734 / 8,115 / 5,136 |
| Shorekeeper | 3,118,907 | 1,380 / 8,462 / 6,053 | 1,480 / 7,414 | 81.7 / 407 | 354 / 2,140 | 809 / 2,062 / 9,539 / 6,147 |
| Lily (Echo) | 1,332,977 | 425 / 2,932 / 3,054 | 510 / 2,577 | 32.3 / 139 | 218 / 1,418 | 462 / 1,044 / 4,699 / 4,913 |
| Calcharo | 1,084,156 | 294 / 2,275 / 2,513 | 371 / 1,906 | 28.6 / 91.5 | 151 / 918 | 310 / 728 / 3,152 / 3,469 |
| Phoebe (subDPS) | 686,484 | 194 / 1,259 / 810 | 236 / 1,125 | 18.1 / 64.6 | 142 / 933 | 283 / 629 / 2,756 / 1,488 |
| Hsin (EF) | 508,409 | 110 / 766 / 737 | 151 / 840 | 10.6 / 45.1 | 91.7 / 570 | 172 / 341 / 1,524 / 1,288 |
| Rebecca | 475,029 | 104 / 688 / 781 | 141 / 681 | 9.9 / 51.9 | 91 / 526 | 166 / 398 / 1,592 / 1,676 |
| Jianxin | 244,182 | 53.9 / 295 / 316 | 65.8 / 269 | 5.5 / 14.7 | 81.2 / 513 | 144 / 265 / 1,141 / 1,247 |
| Jinhsi | 160,220 | 34 / 180 / 190 | 40.3 / 179 | 3.6 / 7.7 | 44 / 314 | 94 / 167 / 857 / 791 |
| Phrolova | 157,790 | 32.1 / 170 / 189 | 47.3 / 196 | 4 / 8.7 | 46.1 / 323 | 85.4 / 187 / 775 / 695 |
| Iuno (subDPS) | 27,915 | 8.4 / 20.1 / 23.2 | 6.6 / 19 | 0.8 / 2 | 21.7 / 155 | 45.2 / 79.6 / 359 / 322 |

Summary over all 61 tables (median / max, ms):

| Workload | C# | Chrome | Edge |
| --- | --- | --- | --- |
| Distribution (whole-table Top Percent) | 111 / 1,417 | 726 / 10,021 | 766 / 6,604 |
| Echo at 0/5 (fresh) | 145 / 1,723 | 681 / 8,672 | 698 / 6,079 |
| Echo at 1/5 | 10.3 / 81.7 | 33.6 / 407 | 30.8 / 271 |
| Echo at 2/5 | 0.84 / 5.2 | 2.2 / 32 | 2.1 / 26 |
| Echo at 3/5 and 4/5 | ≤ 0.6 | ≤ 0.6 | ≤ 0.5 |
| Keep every Echo | 0.06 / 0.12 | 0.08 / 0.10 | 0.08 / 0.10 |
| Crit first | 1.2 / 3.0 | 1.3 / 1.6 | 1.2 / 1.7 |
| Double crit, or one great crit roll | 90 / 354 | 560 / 2,278 | 573 / 2,292 |
| Chance to reach a Top 5% Echo | 172 / 813 (1 thread: 371 / 2,062) | 1,593 / 9,539 | 1,548 / 7,844 |

Counts (Chrome): the distribution takes over 300 ms for 42 of 61 tables and over 1 s for 20. The Chance example takes over 1 s for 43 tables.

## What the numbers say

- **The naive port is 5–7× slower than C# on one thread**, and 6–12× slower against C#'s parallel Chance pass. Chrome and Edge are within ~30% of each other, with neither consistently ahead.
- **Light work is instant everywhere.** Strategies with only Substat Count rules, and Echo Evaluation from 2/5 up, take about 1–30 ms on every table.
- **Three things are slow on most tables in the naive port, in seconds:** a fresh Echo (0/5) or one at 1/5, the whole-table distribution, and any strategy with Echo Score, Substat Roll or Target Chance rules. A live recalculation on every input across several listed tables, or every third of a second in Upgrade Strategy, would freeze the main thread on most of the catalogue.
- **The Echo at 0/5 costs the same as the distribution.** A fresh Echo's finishing table is the whole-table distribution again. The Core rebuilds the finishing table from scratch in every `EvaluateEcho`, even when only a Target Score changed. A target change needs only lookups into that table.

## A data-structure change removes most of the gap

The slowness is the `Map` keyed by doubles: millions of hash inserts of boxed numbers. [sorted.ts](../prototypes/13-calculation-speed/sorted.ts) builds the same distribution from pairs of sorted `Float64Array`s. Each roll shifts a sorted table, and the shifted tables are merged in order, with exactly equal scores combined. Measured warm, in ms:

| Table | Distinct Echo Scores | `Map` (Chrome) | Sorted arrays (Chrome) | Sorted arrays (Node) | C# Core (`Dictionary`) |
| --- | --: | --: | --: | --: | --: |
| Mornye | 3,821,038 | 10,542 | 611 | 537 | 1,417 |
| Lily (Echo) | 1,332,977 | 3,058 | 223 | 226 | 425 |
| Calcharo | 1,084,156 | 2,340 | 165 | 170 | 294 |
| Hsin (EF) | 508,409 | 745 | 72 | 106 | 110 |
| Jinhsi | 160,220 | 194 | 25 | 24 | 34 |
| Iuno (subDPS) | 27,915 | 23 | 6.5 | 6.5 | 8.4 |

That is 10–17× faster than the naive port, and faster than the native Core. The result has identical Echo Scores (checked index by index on Calcharo, Jinhsi and Iuno subDPS), and the cumulative chances differ by at most 7e-18, because the chances are summed in a different order. Only the distribution was rewritten this way. `FinishingEchoValues` is the same construction and would very likely speed up the same way, which would carry Echo at 0/5 and 1/5 and the Chance pass's finishing tables with it. That is not measured, and neither is the pass's string-keyed state map.

The order change conflicts with what [How the new calculation is proven equal to the old one](../issues/03-core-parity.md) settled ("a structural port of Core ... the source's summation order is kept"). Equal within `1e-9` would still hold by a wide margin, but the port would no longer be structural.

## Not measured

- Laptops, phones and Firefox/Safari.
- A Web Worker. It moves the work off the main thread but doesn't shorten it, and Chance tables could be split across several workers the way `Parallel.For` splits them.
- Sorted arrays in `FinishingEchoValues` and in the Upgrade Strategy pass.
- Caching finishing tables across recalculations (per table and Substat type set).
