# 01: Scaffold, CI gate and deploy of the app shell

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§2, §6, §16)

**What to build:** The deployable skeleton of Echo Helper. A visitor to the site sees the header ("Echo Helper", the three tabs, "Updated <build date>"), can switch between Echo Evaluation, Upgrade Strategy and About through the URL hash, and sees each tab's purpose line with its "How it works" link. The tabs are otherwise empty. Every push to `main` runs the full gate and deploys to GitHub Pages only if it passes; pull requests run the same checks without deploying.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] TypeScript `strict`, React (built-in state only), Vite, npm; Vite `base` is `/echo-helper/`; MIT licence
- [ ] ESLint (TypeScript and React hooks rules) and Prettier configured; Vitest (Node for Core, React Testing Library for components) and Playwright (Chromium) set up, each with at least one passing test
- [ ] Tabs are `<a>` links with `aria-current` and a 3px accent underline on the open tab; the hash is `#evaluation`, `#strategy`, `#about` (and `#about-<section>` reaches About); an empty or unknown hash opens Echo Evaluation
- [ ] The header shows the build date as "Updated 20 Nov 2026" (stamped at build time in UTC, month spelled out) as plain muted text on every tab, with a reserved place at the far right for the theme button
- [ ] Phone header (≤600px): row 1 holds the name left and the date right; row 2 holds the three tabs
- [ ] Purpose lines under the tab bar on Echo Evaluation and Upgrade Strategy (not About), worded as in ticket 17's Answer, each ending in "How it works" linking to that tab's About section anchor
- [ ] Browser tab title is "Echo Helper — Wuthering Waves Echo tuning calculator" on every tab
- [ ] One GitHub Actions workflow on push to `main` and `workflow_dispatch`; gate in order: `npm ci`, type check, ESLint, Prettier check, Vitest, `vite build`, Playwright against the built output (including a phone-width run); deploys with `upload-pages-artifact` / `deploy-pages` only if all pass; PRs run the checks without deploying
- [ ] Playwright smoke: each tab opens from its hash and shows its purpose line or content
- [ ] No analytics, cookies, third-party requests, service worker or runtime fetch
