# 18: Remember Upgrade Strategy

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§12)

**What to build:** A player who reloads, or opens another browser tab, finds their Upgrade Strategy as they left it: the selected table, Strategy A exactly as held including unfinished rules, and Strategy B if they were comparing. Bad stored data is salvaged at the smallest unit.

**Blocked by:** 12 (Remember Echo Evaluation), 17 (Compare two strategies)

**Status:** ready-for-agent

- [ ] The Upgrade Strategy entry holds the selected table (by name), Strategy A exactly as held (unfinished rules included, every rule storing the fields of all four kinds) and, while comparing, Strategy B
- [ ] Written whenever that part changes; other tabs take on changes through the `storage` event
- [ ] Strategies come back as Done, except one holding an unfinished rule, which opens in Edit; the phone A | B switch is not stored
- [ ] Salvage: an unknown Substat is removed from its rule (which may leave it unfinished); a non-number field is cleared; a bad Strategy B is dropped and compare mode is left
- [ ] A selected table that no longer exists falls back silently to no table and the no-table state; the rules keep every number
- [ ] "Crit first" loads automatically only when nothing is stored
- [ ] Vitest covers salvage and the vanished-table fallback
