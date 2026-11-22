# 19: Calculation scheduling, pending display, cache budget and failure

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§3 "Caching", §11)

**Look:** the faded results and their message follow `.stale-wrap` and `.stale-msg` in variant D of the [ticket 11 prototype](../../web-rewrite/prototypes/11-visual-direction/index.html) (`?variant=D&strat=unfinished#upgrade-strategy`).

**What to build:** On slow tables or slow devices the app stays honest and responsive. The visible tab is calculated first. A result that takes longer than about 300 ms fades and says "Calculating…" in a slot kept free for it. Memory stays bounded, and if the worker crashes the app recovers once before showing a clear message in the affected area.

**Blocked by:** 11 (Echo distribution chart), 17 (Compare two strategies)

**Status:** ready-for-agent

- [ ] Job order: the visible tab before the hidden one (the hidden tab still calculates); in Echo Evaluation the focused table first, then the list top to bottom; in Upgrade Strategy A before B
- [ ] Each edit sends a request that replaces any queued one; outdated work is dropped between jobs; a running job finishes and its outdated result is discarded; the worker is never terminated to cancel and there is no Cancel action
- [ ] Nothing changes for the first ~300 ms; then each still-pending result fades and shows "Calculating…" in an always-reserved slot: each Echo Evaluation table row, the results heading and the chart, and each strategy's results; the fade is the same as the unfinished-rule fade; no progress bar
- [ ] Caches are in worker memory only, evicted least-recently-used under a fixed budget of about 10M entries; the focused table's caches are never evicted; an evicted table is recalculated on demand with the pending fade
- [ ] If a job throws or runs out of memory, the worker is restarted once and the job retried; if that fails too, each affected results area shows "Couldn't calculate this. Reload the page to try again." while the rest keeps working, and nothing is reported anywhere
- [ ] Tests cover newest-wins dropping, job order and the restart-then-message path (e.g. with an injected failing job)

## Comments

**2026-11-22, from the second review of PR #2:** a job that throws inside the worker stalls the rest of its request today. In `src/calculation/newestInputWins.ts`, `runNext` clears `scheduled` before calling `jobs.run`, and `scheduleNext` only runs after a successful post. So when one listed table's job throws, the tables queued after it are never calculated and keep showing "—" or an old result until the next edit. `createCalculator` also sets no `onerror`, so the app is never told. When building the restart-then-message path, make sure a failing job doesn't stop the queue (e.g. `try`/`finally` around `jobs.run` so `scheduleNext` still runs) and that the failure reaches the app. Add a test with an injected failing job followed by a healthy one.
