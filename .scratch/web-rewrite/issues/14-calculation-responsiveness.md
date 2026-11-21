# Whether calculations need a worker, progress and stale-result handling

Type: grilling
Status: resolved
Blocked by: 08, 13, 19
Map: [Echo Helper web rewrite](../map.md)

## Question

Given the measured speeds from [How fast the ported calculation runs in a browser](13-calculation-speed-in-the-browser.md), do calculations run on the main thread or in a Web Worker, and does the app need a progress indicator, cancellation, or a stale-result warning?

The WPF app has a stale warning and cancellable runs. Decide which of these the web app keeps, for each tab, and whether results recalculate automatically on every input change or on a button press. The Upgrade Strategy side depends on the behaviour settled in [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md).

## Comments

- 2026-11-17: Input from [How Echo Evaluation looks and behaves](07-echo-evaluation-ux.md): Echo Evaluation recalculates live on every input change, with no Calculate button, and has no table limit, so several tables recalculate per keystroke in a target box. The throwaway prototype's enumeration took ~16 ms per table for a fresh Echo in Node (not the Core port, not a browser).

- 2026-11-17: Input from [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md): the prototype recalculates about a third of a second after an edit, with no button. While comparing, two strategies are calculated. An unfinished rule keeps the previous results on screen, faded, with a message naming the Tune Stage to fix: that is the stale-result display for this tab whatever is decided here. Any example with Echo Score thresholds also needs the Top x% score of the selected table worked out when it loads.

- 2026-11-19: Input from [How fast the ported calculation runs in a browser](13-calculation-speed-in-the-browser.md) (fast desktop, Chrome): with a straight port, a fresh or 1/5 Echo and any strategy with Echo Score, Substat Roll or Target Chance rules take from hundreds of ms to 10 s per table on the main thread (most of the catalogue is over 300 ms). From 2/5 up, and Substat Count-only strategies, take ≤ 32 ms. Swapping the `Map`s for sorted arrays cut the distribution 10–17× (worst 611 ms); whether the Core may do that is [Whether the TypeScript Core may use faster data structures than the C# one](19-faster-core-data-structures.md). A Target Score change only needs lookups if finishing tables are cached.

- 2026-11-20: Input from [Whether the TypeScript Core may use faster data structures than the C# one](19-faster-core-data-structures.md): the Core uses sorted arrays and caches finishing tables per Weight Table and type set. Expected on a fast desktop in Chrome (median / worst table; mostly extrapolated): whole-table distribution ~50 ms / ~0.6 s (measured), fresh Echo ~50 ms / ~0.7 s, 1/5 ~3 / ~35 ms, Target Chance strategy ~0.2 / ~1 s, Substat Roll and Echo Score strategies ~150 ms / ~0.6 s. Target Score edits, value changes of an existing Substat and strategy threshold edits are lookups. Still slow-ish: adding a Substat type, switching or adding a table, the first calculation, and anything on a laptop (1.5–3×) or phone. Cache memory up to ~90 MB per listed table at 0/5 on the heaviest tables.

## Answer

Decided with the owner in a grilling session on 2026-11-20.

- **One Web Worker runs all calculation.** The Core runs only in a single dedicated worker, for both tabs and every calculation, including cheap lookups; the finishing-table caches from [Whether the TypeScript Core may use faster data structures than the C# one](19-faster-core-data-structures.md) live there. No worker pool (it would duplicate caches); the main thread never runs the Core.
- **Newest input wins; no cancel button.** Each edit sends a request that replaces any queued one. Work is split into one job per Substat Weight Table (per strategy when comparing), and each job's result is posted as soon as it is done. Between jobs the worker drops outdated work; a running job finishes and its result is discarded if outdated. The worker is never terminated to cancel (that would lose the caches; GitHub Pages cannot send COOP/COEP headers, so `SharedArrayBuffer` interruption is unavailable). Users get no Cancel action.
- **Job order:** the visible tab first, then the hidden one (it still calculates in the background). In Echo Evaluation, the focused table first, then the other listed tables top to bottom; in Upgrade Strategy, Strategy A before Strategy B.
- **No Calculate button and no debounce on either tab.** Every valid change recalculates immediately. This replaces the Upgrade Strategy prototype's ⅓ s delay from [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md).
- **Pending display:** nothing changes for the first ~300 ms. After that, each result still waiting on the worker (each table row and the chart in Echo Evaluation, each strategy's results in Upgrade Strategy) fades, using the same fade as the unfinished-rule state, with a small "Calculating…" label in an always-reserved slot so the layout never moves. No progress bar or percentage.
- **No stale warning beyond that.** Echo Evaluation has no WPF-style stale warning; Upgrade Strategy keeps only its unfinished-rule message from [How Upgrade Strategy looks and behaves](08-upgrade-strategy-ux.md).
- **Loading an example with Top x% thresholds:** its rules appear at once with those threshold boxes empty and faded ("Calculating…"); they fill in when the selected table's distribution arrives, and only then do results calculate. A newer example or table choice supersedes it.
- **Cache memory cap:** caches are evicted least-recently-used under a fixed size budget (around 10M entries, ~250–300 MB; exact figure the implementer's call). The focused table's caches are never evicted. An evicted table is recalculated on demand (showing the pending fade).
- **Worker failure:** if a calculation throws or runs out of memory, the app restarts the worker once and retries. If that fails, each affected results area shows "Couldn't calculate this. Reload the page to try again." in place of results; the rest of the app keeps working. No error reporting.
- **Speed is guidance, not a test.** The spec states expected speeds (lookups instant, median table ~50 ms, worst ~1 s on a fast desktop, laptops 1.5–3× slower) as guidance; CI has no performance test, and the Playwright smoke tests only check that results appear.
- **No ADR:** easy to reverse (the Core is a plain module) and unsurprising given the speeds.
