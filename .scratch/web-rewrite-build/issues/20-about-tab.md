# 20: About tab

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§4 "Credits", §9, §16)

**Look:** match variant D of the [ticket 11 prototype](../../web-rewrite/prototypes/11-visual-direction/index.html) (`?variant=D#about`, `about()`): the sticky side panel of sections with the accent bar, both themes.

**What to build:** A new player reads the About tab to understand everything the app does: how to evaluate an Echo, what an Echo Score and a Reference Roll are, where the built-in tables come from, how Upgrade Strategies work, who to thank and where to give feedback. Every "How it works" link lands on its section.

**Blocked by:** 02 (Visual tokens, theme switch and the stored-entry foundation), 03 (Core plain port: Echo Score and Echo Evaluation calculation)

**Status:** done

- [x] Seven sections, each with an `#about-<section>` anchor: What Echo Helper does; Evaluating an Echo; Echo Score and Reference Rolls; Substat Weight Tables; Upgrade Strategies; Credits; Disclaimer
- [x] Each section states the facts listed for it in spec §9, including the chart explanation (60 equal bands over all listed tables), the formula, the Reference Roll table read from Core's function, the worked example Crit Rate 8.1 at weight W adds W × 8.1 / 7.5, the weight method from `docs/substat-weights.md`, the Crit Rate cap, the Jingran and Sigrika notes, the Discard refund and the cost per Successful Echo
- [x] Credits: the "thanks to" mention of ChemX32, Maygi and riley with their links, not claiming the weights come from them, and a link to the GitHub repo naming its Issues as the place for feedback and table requests
- [x] The Disclaimer appears exactly as in spec §9, only here, with no footer line
- [x] Desktop: a sticky side panel listing the sections, the current one marked with an accent bar
- [x] Phone (≤600px): an accordion of `<details>`/`<summary>`, more than one may be open; a link to a section opens it and scrolls to it
- [x] The theme button is not repeated in About
- [x] A Playwright test follows a "How it works" link and lands on the open section
