# How the player switches between dark and light

Type: grilling
Status: resolved
Blocked by: 11, 10
Map: [Echo Helper web rewrite](../map.md)

## Question

[The visual direction](11-visual-direction.md) ships both themes with dark as the default. Does the app follow the system's light/dark setting, always open dark until the player changes it, or both (a "System / Dark / Light" choice)? Where does the switch sit (header, About), and is the choice remembered? If it is remembered, it is a fourth stored entry beside the three of [What the browser remembers](10-persistence.md), with the same versioning and syncing across open tabs.

## Answer

Decided with the owner in a grilling session on 2026-11-20.

**Choices: Dark and Light only.** There's no "System" option, and the operating system's light/dark setting is ignored. The first open is always dark, as decided in [The visual direction](11-visual-direction.md).

**The switch** is an icon button in the header, at the far right after "Updated 20 Nov 2026", on every tab. It matches the other icon buttons (thin stroke, muted) and has an accessible label and a tooltip. While the theme is dark it shows a sun ("Switch to light theme"). While it is light it shows a moon ("Switch to dark theme"). About does not repeat it.

**Remembered** as a fourth `localStorage` entry beside the three of [What the browser remembers](10-persistence.md), with the same rules: it has a version number, is saved the moment the player switches, is taken on by other open tabs through the `storage` event, and fails silently when storage is unavailable (the app opens dark and the switch still works for that visit). It's still not a reset action, and the app has none.

**No flash on load.** A tiny inline script in `index.html` reads the entry and sets the theme before the page first draws. It is the only code that runs outside the bundle.

**Smaller points**
- Switching is instant, with no colour transition, so it adds nothing for reduced motion.
- The browser's own controls (scrollbars, form controls) follow the theme through CSS `color-scheme`. There's no `theme-color` meta tag.
- A theme entry with an old version or bad contents means dark. The general handling belongs to [What happens to stored data that no longer fits](18-outdated-stored-data.md).

No glossary entry ("theme" is an ordinary word) and no ADR (easy to reverse).
