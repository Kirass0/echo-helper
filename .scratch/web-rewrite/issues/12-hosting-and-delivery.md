# Hosting and delivery on GitHub Pages

Type: grilling
Status: resolved
Blocked by: 02
Map: [Echo Helper web rewrite](../map.md)

## Question

How does the app get from the repo to github.io?

Decide the repository name and visibility and the resulting URL (`<user>.github.io/<repo>/` or a user site), the deploy mechanism (GitHub Actions to Pages on push to main, or another), what checks gate a deploy, how an update to the built-in Value Table catalogue reaches users (a plain redeploy or something more), and the wording and placement of a fan-project disclaimer.


## Comments

- 2026-11-19: Input from [How a new player learns the app](09-first-run-and-explanations.md): the disclaimer is the last section of the About tab (`#about`). Whether it also appears elsewhere (e.g. a footer) and its wording stay here. The credits are a separate About section.
- 2026-11-20: Research: [Project name collisions and alternatives](../research/12-project-name.md).

## Answer

Decided with the owner in a grilling session on 2026-11-20.

**Repository and URL**
- A project site in a new **public** GitHub repo, `Kirass/echo-helper`, served at `https://kirass.github.io/echo-helper/`. Vite `base` is `/echo-helper/`. No custom domain. It must be public because Pages on a private repo needs a paid plan.
- The name stays **Echo Helper**. [Project name collisions and alternatives](../research/12-project-name.md) found no Wuthering Waves tool and no live site by that name; the GitHub `echo-helper` repos are unrelated Go helpers. Alternatives (Tune or Toss, Echo Odds and others) were considered and declined.

**Deploy**
- One GitHub Actions workflow, run on every push to `main` and by hand (`workflow_dispatch`), deploying with the official `upload-pages-artifact` / `deploy-pages` actions. Pages source is set to "GitHub Actions". No `gh-pages` branch; nothing built is committed.
- `main` has no branch protection. The owner pushes directly (catalogue edits included); agents' work arrives as pull requests the owner merges. The CI gate is the only safeguard.

**What gates a deploy**
- In order: `npm ci`, type check, ESLint, Prettier check, Vitest (Core tests, both sampling oracles, the golden fixtures, the plain-port against fast-Core comparison, component tests), `vite build`, then the Playwright smoke tests in Chromium only (phone-width check included) against the built output. It deploys only if every step passes; otherwise the live site stays on the last good build.
- Pull requests run the same checks without deploying.
- **Catalogue check:** a Vitest test validates the built-in catalogue JSON against the rules of [The built-in Value Table catalogue and its credits](04-value-table-catalogue-and-credits.md) and [How users add and edit their own Value Tables](05-custom-value-tables.md): names unique ignoring case and at most 40 characters, only known Substat types, weights finite and 0 or more. A typo blocks the deploy.

**How an update reaches players**
- A plain redeploy. The catalogue and all game data are imported into the JS bundle, so Vite's hashed file names change with them. GitHub Pages caches `index.html` for about 10 minutes, so a player gets the update on their next reload after that. A tab already open keeps the old app until reloaded.
- No service worker, no offline mode, no "new version available" notice, no runtime fetch of the catalogue.
- Stored state that no longer fits after an update is left to [What happens to stored data that no longer fits](18-outdated-stored-data.md).

**Update date**
- The right side of the header, on every tab, shows the date of the running deploy, stamped at build time, as plain muted text with no link: "Updated 20 Nov 2026" (month spelled out). Any push to `main` moves it, not only a data change. No commit hash is shown.

**Disclaimer**
- Only in About, as its last section (no footer line). Wording:

  > Echo Helper is a fan-made tool. It is not affiliated with or endorsed by Kuro Games. Wuthering Waves and its game data belong to Kuro Games. Results are calculated from game data as of the app's last update, and the built-in Substat Weight Tables are baselines, not correct answers. Use them as guidance.

**Source, licence, feedback**
- About links to the GitHub repo and names its Issues as the place for feedback and table requests.
- The code is MIT licensed. The catalogue's weights are credited to their theorycrafters (ticket 04) and get no separate licence.

**Privacy**
- No analytics, no cookies, no third-party requests at all. The Onest font is self-hosted in the bundle, not loaded from Google Fonts. The app therefore needs no privacy or cookie notice.

No ADR: each choice is cheap to reverse (the repo name least so, but a rename only moves the URL).

