# 07: Fast Core

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§3 "Freedom and its limits", "Order of work", "Fast versus plain")

**What to build:** Replace the shipped Core's calculation with the fast versions, and keep the plain port as an exact reference in test code. Every result is unchanged within `1e-9`, and the app reaches the speed guidance in spec §11.

**Blocked by:** 06 (Golden fixture tests)

**Status:** ready-for-agent

- [ ] The whole-table distribution and finishing tables use sorted typed arrays: each roll shifts a sorted table and the shifted tables are merged in order, combining exactly equal Echo Scores
- [ ] The pass's state map drops its string key; the `TunedEcho` struct key becomes a composite numeric or string key
- [ ] Echo Scores stay bit-exact with the source (same parenthesisation and Substat order, 12-decimal banker's rounding within `1e-12`)
- [ ] The plain `Map`-based port (~450 lines) moves to test code as the reference
- [ ] Fast-versus-plain suite on generated inputs: random Weight Tables (including Custom-style weights), Echoes at every Tune Stage, and strategies using every rule kind, all within `1e-9`
- [ ] All ported tests, both oracles and every golden fixture still pass against the fast Core
