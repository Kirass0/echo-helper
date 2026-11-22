# 25: Compare the app with the design prototype

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (top: Prototypes; §13). Comes from the PR #2 retro: the agents building tickets 08–14 never opened the [ticket 11 prototype](../../web-rewrite/prototypes/11-visual-direction/index.html), and the review checked only text, so the differences in ticket 24 got through.

**What to build:** An implementer or reviewer runs one command and gets screenshots of the app and of the prototype (variant D) side by side, in matching screen states and both themes. They read the PNGs and see where the app differs from the design. The spec review of every UI change uses this command.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] An npm script (e.g. `compare:prototype`) builds or serves the app, opens the prototype from its file, and saves a pair of desktop PNGs (1220px wide) per state and theme to a folder outside the repo or a gitignored one:
  - Echo Evaluation: first open, 2/5 Echo, picking a Substat, 5/5 (prototype `?echo=empty|two|picking|full`)
  - the weights dialog for a Built-in and for a Custom table
  - Upgrade Strategy: one strategy, unfinished rule, compare (`?strat=single|unfinished|compare#upgrade-strategy`), skipped until the app has the screen
  - About (`#about`), skipped until the app has the screen
- [ ] The app side gets each state the same way e2e tests do: entering the same Echo, tables and targets as the prototype's sample data (`Changli (my rotation)` as the Custom table)
- [ ] The prototype gains a `dialog=<table name>` URL parameter that opens its weights dialog, so the dialog can be shot without clicking
- [ ] Each pair has the same name with `-app` / `-prototype` suffixes, plus an index listing them; the script prints the folder path
- [ ] The script isn't part of CI or `npm test`; a missing app screen skips its pair with a note
- [ ] `docs/agents/ui-review.md` tells the spec reviewer of a UI change to run the script, read each pair, and report every visible difference from the prototype as a finding, unless the spec states otherwise. Keep it short.
- [ ] One line in `CLAUDE.md` points to it: UI review: `docs/agents/ui-review.md`
