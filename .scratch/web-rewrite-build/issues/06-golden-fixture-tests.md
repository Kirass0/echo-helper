# 06: Golden fixture tests

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§3 "Golden fixtures", "Acceptance")

**What to build:** Vitest suites that load the committed golden fixtures, map the C# field names to the glossary names, and prove the TypeScript Core reproduces every recorded value within `1e-9`. This completes the parity proof for the plain-port Core.

**Blocked by:** 04 (Core plain port: Upgrade Strategy pass), 05 (Golden exporter)

**Status:** ready-for-agent

- [ ] A fixture loader maps C# field names to glossary names
- [ ] Every distribution, Echo Evaluation and Upgrade Strategy fixture value is reproduced within `1e-9`
- [ ] The tests fail, not skip, if the fixture JSON is missing
- [ ] Nothing is skipped or loosened beyond `1e-9`; a fixture that can't be met is raised to the owner rather than adjusted
- [ ] Runs in the CI Vitest step
