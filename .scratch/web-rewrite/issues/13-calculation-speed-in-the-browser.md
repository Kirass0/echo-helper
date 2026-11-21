# How fast the ported calculation runs in a browser

Type: task
Status: resolved
Map: [Echo Helper web rewrite](../map.md)

## Question

How long do the two heavy calculations take in a browser when written in TypeScript: the Top Percent calculation for one whole Value Table (about 150 ms natively, source ADR 0003), and one Upgrade Strategy pass with Chance rules?

Write a throwaway TypeScript port of just those hot paths (from `EchoCalculator`, `EchoValueDistribution`, `FinishingEchoValues` and `UpgradeStrategyPass` in the read-only source project) and time them in a real browser, on the main thread, with a realistic built-in Value Table and a realistic Upgrade Strategy. Time the same inputs in the native C# Core on the same machine for comparison. Record the numbers, the machine, and the browser. The port is thrown away; it does not need to be proven equal, only to do the same amount of work.

The stack is fixed by [Which stack the web app is built on](02-stack.md). The answer feeds [Whether calculations need a worker, progress and stale-result handling](14-calculation-responsiveness.md).

## Answer

Measured 2026-11-19 on an i5-12600K desktop (Windows 11), in headless Chrome 158 and Edge 157 on the main thread, against Release C# on .NET 10. Inputs: all 61 tables of the new catalogue and the four example strategies. Full numbers, setup and caveats are in [research/13-calculation-speed-in-the-browser.md](../research/13-calculation-speed-in-the-browser.md). The throwaway code is in [prototypes/13-calculation-speed/](../prototypes/13-calculation-speed/). The port's checksum over every result equals the C# one to all digits.

- **Cost depends on the table, by up to 500×.** It tracks the number of distinct fully tuned Echo Scores, which runs from 28,000 (Iuno subDPS) to 3.8 million (Mornye). 43 of 61 tables are above 200,000. The source ADR's 150 ms was measured on a ~160,000 table, which takes 34 ms natively today.
- **The naive TypeScript port (a `Map` keyed by doubles) is 5–7× slower than C# on one thread.** Medians / worst cases in Chrome: whole-table Top Percent 726 ms / 10 s. Fresh Echo (0/5) 681 ms / 8.7 s. Echo at 1/5 34 / 407 ms. Echo at 2/5 and up ≤ 32 ms. Crit first ~1 ms. Double crit (Substat Roll and Echo Score rules) 560 ms / 2.3 s. Chance to reach a Top 5% Echo 1.6 s / 9.5 s. C# gives 111 ms / 1.4 s, 145 ms / 1.7 s, and Chance 172 ms / 813 ms in parallel (371 ms / 2.1 s on one thread). Edge is within ~30% of Chrome.
- **Sorted arrays instead of the `Map` make the distribution 10–17× faster**, faster than C# (Mornye: 611 ms in Chrome against C#'s 1,417 ms; Jinhsi 25 ms). The Echo Scores are identical, and the chances differ by ≤ 7e-18 because the summation order differs. That breaks the "structural port, source summation order kept" settled in [How the new calculation is proven equal to the old one](03-core-parity.md). Only the distribution was tried. `FinishingEchoValues` and the Upgrade Strategy pass were not.
- **A fresh Echo costs as much as the whole distribution**, and `EvaluateEcho` rebuilds its finishing table even when only a Target Score changes.
- Not measured: laptops, phones, Firefox/Safari, Web Workers, caching finishing tables.
