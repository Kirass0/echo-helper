# 18: Remember Upgrade Strategy

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§12)

**What to build:** A player who reloads, or opens another browser tab, finds their Upgrade Strategy as they left it: the selected table, Strategy A exactly as held including unfinished rules, and Strategy B if they were comparing. Bad stored data is salvaged at the smallest unit.

**Blocked by:** 12 (Remember Echo Evaluation), 17 (Compare two strategies)

**Status:** done

- [x] The Upgrade Strategy entry holds the selected table (by name), Strategy A exactly as held (unfinished rules included, every rule storing the fields of all four kinds) and, while comparing, Strategy B
- [x] Written whenever that part changes; other tabs take on changes through the `storage` event
- [x] Strategies come back as Done, except one holding an unfinished rule, which opens in Edit; the phone A | B switch is not stored
- [x] Salvage: an unknown Substat is removed from its rule (which may leave it unfinished); a non-number field is cleared; a bad Strategy B is dropped and compare mode is left
- [x] A selected table that no longer exists falls back silently to no table and the no-table state; the rules keep every number
- [x] "Crit first" loads automatically only when nothing is stored
- [x] Vitest covers salvage and the vanished-table fallback

## Comments

**2026-11-22, implementation notes:** the entry is `echo-helper.upgrade-strategy` (`src/strategy/upgradeStrategyEntry.ts`): `{ table, a, b }`, with `b` null unless comparing. App holds it (`useRememberedUpgradeStrategy`), since the table lives there for Echo Evaluation's "pick if no table" and renames; salvage renames of Custom tables (a new built-in took the name) now carry the strategy's table along as they do Echo Evaluation's. `UpgradeStrategy` opens from the remembered strategies and saves both drafts and compare mode whenever they change; another tab's change remounts the tab (a `key` counting `storage` events), so it opens exactly as on load, Done/Edit included. Rule ids are not trusted from storage: every rule read gets a fresh one. Salvage details: a field holding text that isn't a number of 0 or more (or a JSON number below 0) is cleared, as Echo Evaluation's targets are; a stored JSON number is kept as its text. A Substat Roll rule has no empty Substat in the editor, so an unknown Substat there falls back to a new rule's (Crit Rate) and a value that Substat never rolls to its lowest value; a "How many" outside 1–5 becomes 1. A rule of no known kind is dropped, and a box left empty goes with it; a Strategy A that isn't a strategy at all reads as an empty one. A table that no longer exists stays stored by name and reads as no table (as `UpgradeStrategy` already did); the next pick replaces it. The Echo Evaluation e2e reload test now scopes "Tune Stage 1/5 (+5)" to Your Echo, because the hidden Upgrade Strategy tab now remembers the table Echo Evaluation picked for it and shows its stages.
