# 02: Visual tokens, theme switch and the stored-entry foundation

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§12, §13)

**What to build:** The app takes on the chosen visual direction, and the player can switch between Dark and Light with the sun/moon button. The choice survives a reload and follows across open browser tabs. Underneath, the versioned `localStorage` entry mechanism that every later stored entry (Custom tables, Echo Evaluation, Upgrade Strategy) reuses is built here and proven on the Theme entry.

**Blocked by:** 01 (Scaffold, CI gate and deploy of the app shell)

**Status:** ready-for-agent

- [ ] Tokens taken from the `body.vD.light` / `body.vD.dark` palettes of the ticket 11 prototype, plus: indigo accent `#3346c8` / `#8f9cff`, Energy Regen teal `#0e7f7f` / `#46c8c8` (light teal darkened slightly as text on the grey box surface), the five Tune Stage colours per theme, Successful gold `#d99a22` / `#f0b84a`, and a new `--field-line` token (≥3:1 against its background in both themes, separate from `--line`)
- [ ] Base look: 1px-bordered panels with 10px corners and no shadows, 20px desktop spacing, result-box surface with 6px corners
- [ ] Onest self-hosted in the bundle for everything, with tabular figures for numbers
- [ ] Thin-stroke muted icon set: sliders, pencil, × (red on hover), sun, moon; icon buttons have accessible labels (ticket 17) and at least 24×24px hit areas
- [ ] Theme button at the header's far right: sun while dark, moon while light; switching is instant with no transition; CSS `color-scheme` follows the theme; no `theme-color` meta tag; first open is always Dark and the OS setting is ignored
- [ ] A tiny inline script in `index.html` applies the stored theme before first paint (the only code outside the bundle); no flash of the wrong theme on reload
- [ ] Stored-entry mechanism: each entry is JSON with its own version number; chained vN → vN+1 migrations run on load and write back; a missing or failing step resets only that entry; broken JSON drops the entry; an entry from a newer version is never read nor written, and that part works from memory until reload; blocked, full or throwing storage means the app works and remembers nothing, silently; other tabs take on changes through the `storage` event using the same read rules as on load
- [ ] Theme entry: anything unreadable means Dark
- [ ] Vitest covers the mechanism's migration, broken-JSON, newer-version and blocked-storage paths
