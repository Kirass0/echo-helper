# 06: Golden fixture tests

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§3 "Golden fixtures", "Acceptance")

**What to build:** Vitest suites that load the committed golden fixtures, map the C# field names to the glossary names, and prove the TypeScript Core reproduces every recorded value within `1e-9`. This completes the parity proof for the plain-port Core.

**Blocked by:** 04 (Core plain port: Upgrade Strategy pass), 05 (Golden exporter)

**Status:** done

- [x] A fixture loader maps C# field names to glossary names
- [x] Every distribution, Echo Evaluation and Upgrade Strategy fixture value is reproduced within `1e-9`
- [x] The tests fail, not skip, if the fixture JSON is missing
- [x] Nothing is skipped or loosened beyond `1e-9`; a fixture that can't be met is raised to the owner rather than adjusted
- [x] Runs in the CI Vitest step

## Comments

- Owner decisions, 2026-11-21 (spec §19, items 9 and 10): the golden Upgrade Strategy tests no longer read `SuccessfulEchoValues`, as the Core no longer calculates the Successful Echoes' Echo Score distribution; the fixture JSON is unchanged. The four Cost per Successful Echo fields are compared within `1e-9` relative to their size (ticket 07); everything else within an absolute `1e-9`.
