# Results are calculated exactly, not sampled

Carried over unchanged from the source project (`EchoHelperClaude`, its ADR 0003) because the TypeScript port keeps the same calculation method. "Top Percent ticket 01" and the 150 ms figure refer to the source project's native C# Core. In this repo the sampling simulator lives in the Core's Vitest tests.

The Echo Evaluation and the Upgrade Strategy go through every outcome weighted by its chance instead of tuning random Echoes. The tuning model makes this cheap: a fully tuned Echo's Substat types are a uniform pick from the sets of five, and each value is rolled independently from fixed tier weights, so the Echo Values can be built one Substat type at a time as "Echo Value → chance" tables, and Upgrade Rules only need an Echo's type set, its Echo Value and the values of the types StatValue rules name. The same inputs always give the same numbers, two close strategies can be compared, and Chance rules stop running a nested simulation per check. Comparisons count Echo Values within 1e-9 as equal, so floating-point summation order never decides a threshold. A sampling simulator stays in the test project as an oracle, so the calculation and the tuning model can't silently disagree.

## Considered Options

- Sampling with a random seed per run (what shipped first): rejected, results changed on every Simulate and Chance rules were slow.
- Listing every fully tuned Echo (1,287 type sets × 8⁵ rolls ≈ 42 million) and every ordered tuning for the Upgrade Strategy (≈ 5 billion): rejected, the tables give the same exact answers far faster (Top Percent ticket 01: about 150 ms for a whole Value Table).
- A backward pass per Target Value for Chance rules: rejected, a table over the Echo's missing Substat types answers each check directly.

## Amendment: the tables may be built in any way

The TypeScript Core is not a structural copy of the C# one. The "Echo Value → chance" tables may use any layout (sorted typed arrays rather than maps keyed by doubles, which was 10–17× faster in a browser) and sum chances in any order. Chance sums then differ from the source in the last bits; the 1e-9 comparisons already absorb that, and the golden fixtures judge results within 1e-9. Echo Values themselves are still computed exactly as the source does, the same per-Substat formula added in the same order, because the tables combine Echo Values by exact equality and a different order would split or merge entries.
