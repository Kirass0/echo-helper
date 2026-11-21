# 09: Term and icon tooltips

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§10 "Tooltips", §15 "Tooltips")

**What to build:** A player who doesn't know a term can hover, focus or tap it and read a short plain-text explanation. Icon buttons explain themselves the same way. This ticket covers the eight Echo Evaluation terms and every icon button; the three Upgrade Strategy terms reuse it in ticket 15.

**Blocked by:** 08 (Score an Echo against one built-in table)

**Status:** ready-for-agent

- [ ] A term with a tooltip has a dotted underline on the term itself (no ⓘ) and is a `<button>` styled as text, linked by `aria-describedby`
- [ ] It opens on hover, keyboard focus or tap, stays open while the pointer is over it, and closes on a tap elsewhere or Escape (which doesn't move focus)
- [ ] Width at most 290px, or `calc(100vw - 20px)` on narrower screens; it sits below the term, or above if there's no room
- [ ] Plain text with no links, worded verbatim from ticket 17's Answer
- [ ] Echo Evaluation terms: Substat Weight Table, Echo Score, Target Score, ER Target Score, Target Chance, ER Target Chance, Top Percent, ER Top Percent
- [ ] Icon buttons (sliders, pencil, ×, sun/moon) show their tooltip on hover and on focus
- [ ] Component tests for open/close on focus, hover, tap and Escape
