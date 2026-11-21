# 21: Tablet and phone layout: Echo Evaluation, and bottom sheets

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§14)

**What to build:** Echo Evaluation works comfortably on a tablet and a phone, down to 320px, with nothing scrolling sideways on a phone. Every popup in the app becomes a bottom sheet on a phone. Follow the ticket 16 prototype, variant B.

**Blocked by:** 11 (Echo distribution chart), 13 (Custom Weight Tables)

**Status:** ready-for-agent

- [ ] Breakpoints: above 820px desktop; 601–820px one column with the Weight Table list as the desktop table scrolling sideways; ≤600px phone
- [ ] Phone sizes: page padding and gaps 12px, panel padding 14px, large numbers 26px
- [ ] Phone order: Your Echo, results, list; slots full width, the type grid two across, value buttons four across with Back and Cancel below
- [ ] Result boxes: Target Chance and ER Target Chance share row 1, the other six three across in two rows with smaller numbers, labels may wrap to two lines, fixed minimum height
- [ ] Chart drawn at 360 units wide with 4 axis ticks and the short legend names (table name truncated, "Others", "Target", "ER")
- [ ] List as cards: line 1 picker, Custom tag, sliders and ×; line 2 Target Score and ER Target Score inputs labelled above; line 3 Echo Score, Target Chance and ER Target Chance (Reached / Not reached at 5/5); tapping a card outside its controls focuses it (accent border, tint and left bar); add picker below the cards
- [ ] Every popup is a `<dialog>` bottom sheet on a phone: grab handle, title, at most 85% of the height and scrolling inside; tapping the dimmed area or Escape closes it. This covers the weights dialog, the Custom editor, the delete confirmation, and the sheets of later tickets (Substat Count picker with one 18px checkbox per line and Done, and the example-replace confirmation)
- [ ] Nothing breaks at 320px; a Playwright phone-width test checks there's no horizontal scroll on Echo Evaluation
